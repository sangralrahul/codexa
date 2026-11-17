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
      env: { ANTHROPIC_API_KEY: keys.anthropic, OPENAI_API_KEY: keys.openai, AI_DEFAULT_MODEL: "claude-sonnet-5-5", AI_DEFAULT_PROVIDER: "anthropic" },
      capabilities: { anthropic: Boolean(keys.anthropic), openai: Boolean(keys.openai) },
    }));
    return import("@/lib/ai/keys");
  }

  it("runs every Codexa mode on Claude Sonnet 5.5 with its own effort", async () => {
    const { resolveAiCredentials } = await load({ anthropic: "sk-ant" });
    expect(await resolveAiCredentials("ws", "codexa-fast")).toMatchObject({ provider: "anthropic", model: "claude-sonnet-5-5", effort: "low", choice: "codexa-fast" });
    expect(await resolveAiCredentials("ws", "codexa-pro")).toMatchObject({ provider: "anthropic", model: "claude-sonnet-5-5", effort: "high" });
    expect(await resolveAiCredentials("ws", "codexa-max")).toMatchObject({ provider: "anthropic", model: "claude-sonnet-5-5", effort: "xhigh", maxTokens: 32_000 });
  });

  it("defaults to Codexa Pro, and to the OpenAI default when only an OpenAI key exists", async () => {
    expect(await (await load({ anthropic: "sk-ant" })).resolveAiCredentials("ws")).toMatchObject({ provider: "anthropic", model: "claude-sonnet-5-5", choice: "codexa-pro" });
    expect(await (await load({ openai: "sk-oa" })).resolveAiCredentials("ws")).toMatchObject({ provider: "openai", model: "gpt-6-astra" });
  });

  it("refuses unknown models, and lists the modes with what powers them", async () => {
    const { resolveAiCredentials, getAiStatus } = await load({ anthropic: "sk-ant" });
    await expect(resolveAiCredentials("ws", "gpt-6.1-sol")).rejects.toMatchObject({ status: 400 });
    const status = await getAiStatus("ws");
    expect(status.models.map((m) => m.id)).toEqual(["codexa-fast", "codexa-pro", "codexa-max"]);
    expect(status.models.every((m) => m.available)).toBe(true);
    expect(status).toMatchObject({ defaultModel: "codexa-pro", poweredBy: "Claude Sonnet 5.5" });
  });

  it("marks the modes unavailable without the Anthropic key", async () => {
    const { resolveAiCredentials, getAiStatus } = await load({ openai: "sk-oa" });
    await expect(resolveAiCredentials("ws", "codexa-pro")).rejects.toMatchObject({ status: 503 });
    expect((await getAiStatus("ws")).models[0]).toMatchObject({ available: false, missingEnv: "ANTHROPIC_API_KEY" });
  });
});

/* ---------------------------------------------------------------------------
   Anthropic provider: the mode's effort reaches the request.
   --------------------------------------------------------------------------- */

const anthropicBodies: Record<string, unknown>[] = [];
vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic {
    messages = {
      stream: (body: Record<string, unknown>) => {
        anthropicBodies.push(body);
        return (async function* () {
          yield { type: "message_start", message: { usage: { input_tokens: 3 } } };
          yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "ok" } };
          yield { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 1 } };
        })();
      },
    };
    static AuthenticationError = class extends Error {};
    static RateLimitError = class extends Error {};
    static BadRequestError = class extends Error {};
    static APIError = class extends Error {};
    static APIConnectionError = class extends Error {};
  }
  return { default: Anthropic };
});

describe("Anthropic provider", () => {
  it("sends the mode's effort as output_config.effort, and nothing when unset", async () => {
    const { createAnthropicProvider } = await import("@/lib/ai/providers/anthropic");
    const p = createAnthropicProvider("sk-ant");
    const base = { model: "claude-sonnet-5-5", system: "s", maxTokens: 100, tools: [], messages: [{ role: "user" as const, content: "hi" }] };
    await collect(p.stream({ ...base, effort: "xhigh" }));
    await collect(p.stream(base));
    expect(anthropicBodies[0]).toMatchObject({ model: "claude-sonnet-5-5", output_config: { effort: "xhigh" } });
    expect(anthropicBodies[1]).not.toHaveProperty("output_config");
  });
});
