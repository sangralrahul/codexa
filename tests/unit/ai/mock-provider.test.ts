import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMockProvider, isMockEnabled } from "@/lib/ai/providers/mock";
import type { ChatMessage, ProviderEvent, ProviderRequest, ToolDefinition } from "@/lib/ai/provider";

const tool = (name: string): ToolDefinition => ({ name, description: name, inputSchema: { type: "object" } });
const WORK_TOOLS = ["list_files", "read_file", "search_files", "get_logs", "run_command", "write_file", "edit_file", "delete_file", "finish"].map(tool);

async function collect(req: ProviderRequest): Promise<ProviderEvent[]> {
  const out: ProviderEvent[] = [];
  for await (const ev of createMockProvider().stream(req)) out.push(ev);
  return out;
}

const userMessage = (prompt: string): ChatMessage => ({ role: "user", content: `<project_files count="2">\nsrc/App.tsx (10 B)\n</project_files>\n\n<user_request>\n${prompt}\n</user_request>` });

describe("mock provider gating", () => {
  const original = { AI_MOCK: process.env.AI_MOCK, NODE_ENV: process.env.NODE_ENV };
  beforeEach(() => {
    process.env.AI_MOCK = "1";
  });
  afterEach(() => {
    process.env.AI_MOCK = original.AI_MOCK;
    Object.assign(process.env, { NODE_ENV: original.NODE_ENV });
  });

  it("is enabled only with AI_MOCK=1 outside production", () => {
    Object.assign(process.env, { NODE_ENV: "test" });
    expect(isMockEnabled()).toBe(true);
    Object.assign(process.env, { NODE_ENV: "production" });
    expect(isMockEnabled()).toBe(false);
    Object.assign(process.env, { NODE_ENV: "test" });
    process.env.AI_MOCK = "0";
    expect(isMockEnabled()).toBe(false);
  });
});

describe("mock provider script", () => {
  const base = { system: "sys", model: "mock-1", maxTokens: 100 };

  it("proposes a plan when only propose_plan is offered", async () => {
    const events = await collect({ ...base, messages: [userMessage("Add a counter")], tools: [tool("propose_plan")] });
    const call = events.find((e) => e.type === "tool_call");
    expect(call).toBeTruthy();
    if (call?.type === "tool_call") {
      expect(call.name).toBe("propose_plan");
      expect((call.input as { steps: string[] }).steps.join(" ")).toContain("Add a counter");
    }
    expect(events.some((e) => e.type === "text_delta")).toBe(true);
    expect(events.find((e) => e.type === "usage")).toMatchObject({ inputTokens: expect.any(Number), outputTokens: expect.any(Number) });
    expect(events.at(-1)).toEqual({ type: "stop", reason: "tool_use" });
  });

  it("walks list_files → read_file → write → run_command → finish deterministically", async () => {
    const messages: ChatMessage[] = [userMessage("Add a counter")];
    const seen: string[] = [];
    for (let i = 0; i < 10; i++) {
      const events = await collect({ ...base, messages, tools: WORK_TOOLS });
      const calls = events.filter((e): e is Extract<ProviderEvent, { type: "tool_call" }> => e.type === "tool_call");
      messages.push({ role: "assistant", text: "", toolCalls: calls.map((c) => ({ id: c.id, name: c.name, input: c.input })) });
      if (!calls.length) break;
      seen.push(...calls.map((c) => c.name));
      messages.push({
        role: "tool",
        results: calls.map((c) => ({
          toolCallId: c.id,
          name: c.name,
          output: c.name === "list_files" ? "src/App.tsx (120 B)\nsrc/main.tsx (80 B)\npackage.json (200 B)" : c.name === "run_command" ? "not available" : "ok",
          isError: c.name === "run_command",
        })),
      });
      if (calls.some((c) => c.name === "finish")) break;
    }
    expect(seen).toEqual(["list_files", "read_file", "write_file", "write_file", "run_command", "finish"]);
    const writes = messages.flatMap((m) => (m.role === "assistant" ? m.toolCalls : [])).filter((c) => c.name === "write_file");
    expect(writes.map((w) => (w.input as { path: string }).path)).toEqual(["src/components/Feature.tsx", "src/App.tsx"]);
    expect((writes[1].input as { content: string }).content).toContain("Add a counter");
  });

  it("answers in text without writing in ask mode", async () => {
    const messages: ChatMessage[] = [
      userMessage("What does this app do?"),
      { role: "assistant", text: "", toolCalls: [{ id: "a", name: "list_files", input: {} }, { id: "b", name: "read_file", input: { path: "src/App.tsx" } }] },
      { role: "tool", results: [{ toolCallId: "a", name: "list_files", output: "src/App.tsx (1 B)" }, { toolCallId: "b", name: "read_file", output: "x" }] },
    ];
    const events = await collect({ ...base, messages, tools: WORK_TOOLS.filter((t) => !["write_file", "edit_file", "delete_file", "finish"].includes(t.name)) });
    expect(events.some((e) => e.type === "tool_call")).toBe(false);
    expect(events.at(-1)).toEqual({ type: "stop", reason: "end_turn" });
    const text = events.filter((e): e is Extract<ProviderEvent, { type: "text_delta" }> => e.type === "text_delta").map((e) => e.text).join("");
    expect(text).toContain("What does this app do?");
  });

  it("stops immediately when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const events = await collect({ ...base, messages: [userMessage("x")], tools: [tool("propose_plan")], abortSignal: controller.signal });
    expect(events).toEqual([{ type: "stop", reason: "cancelled" }]);
  });
});
