import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider, ChatMessage, ProviderEvent, ProviderRequest, StopReason, ToolDefinition } from "../provider";
import { parseToolInput } from "../provider";

const TIMEOUT_MS = 5 * 60 * 1000;

function toAnthropicMessages(messages: ChatMessage[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({
        role: "user",
        content: m.images?.length
          ? [...m.images.map((img): Anthropic.ImageBlockParam => ({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } })), { type: "text", text: m.content }]
          : m.content,
      });
    } else if (m.role === "assistant") {
      const content: Anthropic.ContentBlockParam[] = [];
      if (m.text) content.push({ type: "text", text: m.text });
      for (const call of m.toolCalls) {
        content.push({ type: "tool_use", id: call.id, name: call.name, input: (call.input ?? {}) as Record<string, unknown> });
      }
      if (!content.length) content.push({ type: "text", text: "(no output)" });
      out.push({ role: "assistant", content });
    } else {
      out.push({
        role: "user",
        content: m.results.map(
          (r): Anthropic.ToolResultBlockParam => ({ type: "tool_result", tool_use_id: r.toolCallId, content: r.output, is_error: r.isError || undefined }),
        ),
      });
    }
  }
  return out;
}

function toAnthropicTools(tools: ToolDefinition[]): Anthropic.Tool[] {
  return tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema as Anthropic.Tool["input_schema"] }));
}

function mapStop(reason: string | null | undefined): StopReason {
  switch (reason) {
    case "end_turn":
    case "stop_sequence":
      return "end_turn";
    case "tool_use":
      return "tool_use";
    case "max_tokens":
    case "model_context_window_exceeded":
      return "max_tokens";
    case "refusal":
      return "refusal";
    default:
      return "other";
  }
}

export function createAnthropicProvider(apiKey: string): AiProvider {
  const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 2 });
  return {
    id: "anthropic",
    async *stream(request: ProviderRequest): AsyncIterable<ProviderEvent> {
      const stream = client.messages.stream(
        {
          model: request.model,
          max_tokens: request.maxTokens,
          system: request.system,
          messages: toAnthropicMessages(request.messages),
          tools: request.tools.length ? toAnthropicTools(request.tools) : undefined,
        },
        { signal: request.abortSignal, timeout: TIMEOUT_MS },
      );
      // Accumulate input_json_delta per content block index.
      const pending = new Map<number, { id: string; name: string; json: string }>();
      let inputTokens = 0;
      let outputTokens = 0;
      let stop: StopReason = "other";
      try {
        for await (const event of stream) {
          if (request.abortSignal?.aborted) {
            stream.abort();
            break;
          }
          switch (event.type) {
            case "message_start":
              inputTokens = event.message.usage?.input_tokens ?? 0;
              break;
            case "content_block_start":
              if (event.content_block.type === "tool_use") {
                pending.set(event.index, { id: event.content_block.id, name: event.content_block.name, json: "" });
              }
              break;
            case "content_block_delta":
              if (event.delta.type === "text_delta") {
                if (event.delta.text) yield { type: "text_delta", text: event.delta.text };
              } else if (event.delta.type === "input_json_delta") {
                const p = pending.get(event.index);
                if (p) p.json += event.delta.partial_json;
              }
              break;
            case "content_block_stop": {
              const p = pending.get(event.index);
              if (p) {
                pending.delete(event.index);
                const parsed = parseToolInput(p.json);
                if (parsed.ok) yield { type: "tool_call", id: p.id, name: p.name, input: parsed.value };
                else yield { type: "error", message: `Could not parse tool input for ${p.name}: ${parsed.error}`, code: "tool_input_invalid", retryable: true };
              }
              break;
            }
            case "message_delta":
              outputTokens = event.usage?.output_tokens ?? outputTokens;
              if (event.delta.stop_reason) stop = mapStop(event.delta.stop_reason);
              break;
            default:
              break;
          }
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
      yield { type: "usage", inputTokens, outputTokens };
      yield { type: "stop", reason: request.abortSignal?.aborted ? "cancelled" : stop };
    },
  };
}

function describeError(err: unknown): { message: string; code: string; retryable: boolean } {
  if (err instanceof Anthropic.AuthenticationError) return { message: "Anthropic rejected the API key (ANTHROPIC_API_KEY).", code: "auth", retryable: false };
  if (err instanceof Anthropic.RateLimitError) return { message: "Anthropic rate limit reached. Try again shortly.", code: "rate_limited", retryable: true };
  if (err instanceof Anthropic.BadRequestError) return { message: `Anthropic rejected the request: ${err.message}`, code: "bad_request", retryable: false };
  if (err instanceof Anthropic.APIError) return { message: `Anthropic API error ${err.status ?? ""}: ${err.message}`.trim(), code: "api_error", retryable: (err.status ?? 500) >= 500 };
  if (err instanceof Anthropic.APIConnectionError) return { message: "Could not reach the Anthropic API.", code: "network", retryable: true };
  return { message: err instanceof Error ? err.message : "Unknown provider error", code: "unknown", retryable: false };
}
