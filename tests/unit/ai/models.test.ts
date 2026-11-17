import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderEvent } from "@/lib/ai/provider";

/* ---------------------------------------------------------------------------
   OpenAI provider (Responses API): a scripted event stream in, provider events out.
   --------------------------------------------------------------------------- */

const created: unknown[] = [];
let script: unknown[] = [];

vi.mock("openai", () => {
  class OpenAI {
    responses = {
      create: async (body: unknown) => {
        created.push(body);
        return (async function* () {
          for (const e of script) yield e;
        })();
      },
    };
    static AuthenticationError = class extends Error {};
    static RateLimitError = class extends Error {};
    static BadRequestError = class extends Error {};
    static APIError = class extends Error {};
    static APIConnectionError = class extends Error {};
  }
  return { default: OpenAI };
});

async function collect(it: AsyncIterable<ProviderEvent>) {
  const out: ProviderEvent[] = [];
  for await (const e of it) out.push(e);
  return out;
}

describe("OpenAI provider (Responses API)", () => {
  beforeEach(() => {
    created.length = 0;
  });

  it("streams text and a function call, and reports tool_use with usage", async () => {
    script = [
      { type: "response.output_text.delta", delta: "Reading the file." },
      { type: "response.output_item.added", item: { type: "function_call", id: "fc_1", call_id: "call_1", name: "read_file", arguments: "" } },
      { type: "response.function_call_arguments.delta", item_id: "fc_1", delta: '{"path":' },
      { type: "response.function_call_arguments.delta", item_id: "fc_1", delta: '"src/App.tsx"}' },
      { type: "response.output_item.done", item: { type: "function_call", id: "fc_1", call_id: "call_1", name: "read_file", arguments: '{"path":"src/App.tsx"}' } },
      { type: "response.completed", response: { usage: { input_tokens: 120, output_tokens: 30 }, incomplete_details: null } },
    ];
    const { createOpenAiProvider } = await import("@/lib/ai/providers/openai");
    const events = await collect(
      createOpenAiProvider("sk-test").stream({
        model: "gpt-6.1-sol",
        system: "You are Codexa.",
        maxTokens: 4000,
        tools: [{ name: "read_file", description: "Read a file", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } }],
        messages: [{ role: "user", content: "Open App.tsx" }],
      }),
    );
    expect(events).toContainEqual({ type: "text_delta", text: "Reading the file." });
    expect(events).toContainEqual({ type: "tool_call", id: "call_1", name: "read_file", input: { path: "src/App.tsx" } });
    expect(events).toContainEqual({ type: "usage", inputTokens: 120, outputTokens: 30 });
    expect(events.at(-1)).toEqual({ type: "stop", reason: "tool_use" });

    const body = created[0] as Record<string, unknown>;
    expect(body).toMatchObject({ model: "gpt-6.1-sol", instructions: "You are Codexa.", store: false, stream: true, max_output_tokens: 4000 });
    expect(body.tools).toEqual([{ type: "function", name: "read_file", description: "Read a file", parameters: expect.any(Object), strict: false }]);
  });

  it("maps an incomplete response to max_tokens", async () => {
    script = [
      { type: "response.output_text.delta", delta: "Partial" },
      { type: "response.incomplete", response: { usage: { input_tokens: 5, output_tokens: 9 }, incomplete_details: { reason: "max_output_tokens" } } },
    ];
    const { createOpenAiProvider } = await import("@/lib/ai/providers/openai");
    const events = await collect(createOpenAiProvider("sk-test").stream({ model: "gpt-6-astra", system: "s", maxTokens: 10, tools: [], messages: [{ role: "user", content: "hi" }] }));
    expect(events.at(-1)).toEqual({ type: "stop", reason: "max_tokens" });
  });

  it("replays tool calls by call_id only, with their outputs", async () => {
    const { toResponsesInput } = await import("@/lib/ai/providers/openai");
    const input = toResponsesInput([
      { role: "user", content: "Open App.tsx" },
      { role: "assistant", text: "Reading.", toolCalls: [{ id: "call_1", name: "read_file", input: { path: "src/App.tsx" } }] },
      { role: "tool", results: [{ toolCallId: "call_1", name: "read_file", output: "export default 1", isError: false }] },
    ]);
    expect(input).toEqual([
      { role: "user", content: "Open App.tsx" },
      { role: "assistant", content: "Reading." },
      { type: "function_call", call_id: "call_1", name: "read_file", arguments: '{"path":"src/App.tsx"}' },
      { type: "function_call_output", call_id: "call_1", output: "export default 1" },
    ]);
  });
});

/* ---------------------------------------------------------------------------
   Model resolution: the composer's pick, checked against the catalog and the configured keys.
   --------------------------------------------------------------------------- */

describe("model resolution", () => {
  const saved = { mock: process.env.AI_MOCK };
  afterEach(() => {
    process.env.AI_MOCK = saved.mock;
    vi.resetModules();
    vi.doUnmock("@/lib/env");
  });

  async function load(keys: { anthropic?: string; openai?: string }) {
    process.env.AI_MOCK = "";
    vi.resetModules();
    vi.doMock("@/lib/env", () => ({
      env: { ANTHROPIC_API_KEY: keys.anthropic, OPENAI_API_KEY: keys.openai, AI_DEFAULT_MODEL: "claude-opus-5-5", AI_DEFAULT_PROVIDER: "anthropic" },
      capabilities: { anthropic: Boolean(keys.anthropic), openai: Boolean(keys.openai) },
    }));
    return import("@/lib/ai/keys");
  }

  it("uses the picked model with its provider's key", async () => {
    const { resolveAiCredentials } = await load({ anthropic: "sk-ant", openai: "sk-oa" });
    expect(await resolveAiCredentials("ws", "gpt-6-astra")).toMatchObject({ provider: "openai", model: "gpt-6-astra", configured: true });
    expect(await resolveAiCredentials("ws", "claude-fable-5-2")).toMatchObject({ provider: "anthropic", model: "claude-fable-5-2", configured: true });
  });

  it("defaults to Claude Opus 5.5, and to GPT-6 Astra when only an OpenAI key exists", async () => {
    expect(await (await load({ anthropic: "sk-ant" })).resolveAiCredentials("ws")).toMatchObject({ provider: "anthropic", model: "claude-opus-5-5" });
    expect(await (await load({ openai: "sk-oa" })).resolveAiCredentials("ws")).toMatchObject({ provider: "openai", model: "gpt-6-astra" });
  });

  it("refuses unknown models and models whose key is missing", async () => {
    const { resolveAiCredentials, getAiStatus } = await load({ anthropic: "sk-ant" });
    await expect(resolveAiCredentials("ws", "gpt-unknown")).rejects.toMatchObject({ status: 400 });
    await expect(resolveAiCredentials("ws", "gpt-6.1-sol")).rejects.toMatchObject({ status: 503 });
    const status = await getAiStatus("ws");
    expect(status.models.find((m) => m.id === "gpt-6.1-sol")).toMatchObject({ available: false, missingEnv: "OPENAI_API_KEY" });
    expect(status.models.find((m) => m.id === "claude-opus-5-5")).toMatchObject({ available: true, missingEnv: null });
  });
});
