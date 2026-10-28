import "server-only";
import OpenAI from "openai";
import type { AiProvider, ChatMessage, ProviderEvent, ProviderRequest, StopReason, ToolDefinition } from "../provider";
import { parseToolInput } from "../provider";

const TIMEOUT_MS = 5 * 60 * 1000;

function toOpenAiMessages(system: string, messages: ChatMessage[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const out: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{ role: "system", content: system }];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({
        role: "user",
        content: m.images?.length
          ? [...m.images.map((img) => ({ type: "image_url" as const, image_url: { url: `data:${img.mediaType};base64,${img.data}` } })), { type: "text" as const, text: m.content }]
          : m.content,
      });
    } else if (m.role === "assistant") {
      out.push({
        role: "assistant",
        content: m.text || null,
        tool_calls: m.toolCalls.length
          ? m.toolCalls.map((c) => ({ id: c.id, type: "function" as const, function: { name: c.name, arguments: JSON.stringify(c.input ?? {}) } }))
          : undefined,
      });
    } else {
      for (const r of m.results) out.push({ role: "tool", tool_call_id: r.toolCallId, content: r.isError ? `ERROR: ${r.output}` : r.output });
    }
  }
  return out;
}

function toOpenAiTools(tools: ToolDefinition[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } }));
}

function mapFinish(reason: string | null | undefined): StopReason {
  switch (reason) {
    case "stop":
      return "end_turn";
    case "tool_calls":
    case "function_call":
      return "tool_use";
    case "length":
      return "max_tokens";
    case "content_filter":
      return "refusal";
    default:
      return "other";
  }
}

export function createOpenAiProvider(apiKey: string): AiProvider {
  const client = new OpenAI({ apiKey, timeout: TIMEOUT_MS, maxRetries: 2 });
  return {
    id: "openai",
    async *stream(request: ProviderRequest): AsyncIterable<ProviderEvent> {
      let inputTokens = 0;
      let outputTokens = 0;
      let stop: StopReason = "other";
      // Tool-call deltas arrive by index; accumulate until the stream finishes.
      const calls = new Map<number, { id: string; name: string; args: string }>();
      try {
        const stream = await client.chat.completions.create(
          {
            model: request.model,
            messages: toOpenAiMessages(request.system, request.messages),
            tools: request.tools.length ? toOpenAiTools(request.tools) : undefined,
            stream: true,
            stream_options: { include_usage: true },
            max_completion_tokens: request.maxTokens,
          },
          { signal: request.abortSignal, timeout: TIMEOUT_MS },
        );
        for await (const chunk of stream) {
          if (request.abortSignal?.aborted) break;
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens ?? inputTokens;
            outputTokens = chunk.usage.completion_tokens ?? outputTokens;
          }
          const choice = chunk.choices?.[0];
          if (!choice) continue;
          const delta = choice.delta;
          if (delta?.content) yield { type: "text_delta", text: delta.content };
          for (const tc of delta?.tool_calls ?? []) {
            const existing = calls.get(tc.index);
            if (!existing) {
              calls.set(tc.index, { id: tc.id ?? `call_${tc.index}`, name: tc.function?.name ?? "", args: tc.function?.arguments ?? "" });
            } else {
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.name += tc.function.name;
              if (tc.function?.arguments) existing.args += tc.function.arguments;
            }
          }
          if (choice.finish_reason) stop = mapFinish(choice.finish_reason);
        }
      } catch (err) {
        if (request.abortSignal?.aborted) {
          yield { type: "usage", inputTokens, outputTokens };
          yield { type: "stop", reason: "cancelled" };
          return;
        }
        yield { type: "error", ...describeError(err) };
        yield { type: "usage", inputTokens, outputTokens };
        yield { type: "stop", reason: "other" };
        return;
      }
      for (const [, c] of [...calls.entries()].sort((a, b) => a[0] - b[0])) {
        const parsed = parseToolInput(c.args);
        if (parsed.ok) yield { type: "tool_call", id: c.id, name: c.name, input: parsed.value };
        else yield { type: "error", message: `Could not parse tool arguments for ${c.name}: ${parsed.error}`, code: "tool_input_invalid", retryable: true };
      }
      if (calls.size && stop === "end_turn") stop = "tool_use";
      yield { type: "usage", inputTokens, outputTokens };
      yield { type: "stop", reason: request.abortSignal?.aborted ? "cancelled" : stop };
    },
  };
}

function describeError(err: unknown): { message: string; code: string; retryable: boolean } {
  if (err instanceof OpenAI.AuthenticationError) return { message: "OpenAI rejected the API key (OPENAI_API_KEY).", code: "auth", retryable: false };
  if (err instanceof OpenAI.RateLimitError) return { message: "OpenAI rate limit reached. Try again shortly.", code: "rate_limited", retryable: true };
  if (err instanceof OpenAI.BadRequestError) return { message: `OpenAI rejected the request: ${err.message}`, code: "bad_request", retryable: false };
  if (err instanceof OpenAI.APIError) return { message: `OpenAI API error ${err.status ?? ""}: ${err.message}`.trim(), code: "api_error", retryable: (err.status ?? 500) >= 500 };
  if (err instanceof OpenAI.APIConnectionError) return { message: "Could not reach the OpenAI API.", code: "network", retryable: true };
  return { message: err instanceof Error ? err.message : "Unknown provider error", code: "unknown", retryable: false };
}
