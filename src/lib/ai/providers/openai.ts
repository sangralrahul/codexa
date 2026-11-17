import "server-only";
import OpenAI from "openai";
import type { AiProvider, ChatMessage, ProviderEvent, ProviderRequest, StopReason, ToolDefinition } from "../provider";
import { parseToolInput } from "../provider";

const TIMEOUT_MS = 5 * 60 * 1000;

/**
 * OpenAI through the Responses API (current GPT models, incl. GPT-6 Astra and GPT-6.1 Sol, take
 * function tools there). Stateless: `store: false`, the whole conversation is sent each turn, and
 * replayed function calls carry only `call_id` (no server item ids, so no stored reasoning is needed).
 */
type InputItem = OpenAI.Responses.ResponseInputItem;

export function toResponsesInput(messages: ChatMessage[]): InputItem[] {
  const out: InputItem[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({
        role: "user",
        content: m.images?.length
          ? [
              ...m.images.map((img): OpenAI.Responses.ResponseInputImage => ({ type: "input_image", detail: "auto", image_url: `data:${img.mediaType};base64,${img.data}` })),
              { type: "input_text" as const, text: m.content },
            ]
          : m.content,
      });
    } else if (m.role === "assistant") {
      if (m.text) out.push({ role: "assistant", content: m.text });
      for (const c of m.toolCalls) out.push({ type: "function_call", call_id: c.id, name: c.name, arguments: JSON.stringify(c.input ?? {}) });
    } else {
      for (const r of m.results) out.push({ type: "function_call_output", call_id: r.toolCallId, output: r.isError ? `ERROR: ${r.output}` : r.output });
    }
  }
  return out;
}

function toResponsesTools(tools: ToolDefinition[]): OpenAI.Responses.FunctionTool[] {
  return tools.map((t) => ({ type: "function", name: t.name, description: t.description, parameters: t.inputSchema as Record<string, unknown>, strict: false }));
}

export function createOpenAiProvider(apiKey: string): AiProvider {
  const client = new OpenAI({ apiKey, timeout: TIMEOUT_MS, maxRetries: 2 });
  return {
    id: "openai",
    async *stream(request: ProviderRequest): AsyncIterable<ProviderEvent> {
      let inputTokens = 0;
      let outputTokens = 0;
      let stop: StopReason = "end_turn";
      let sawCall = false;
      // Function calls by output item id: name and call_id arrive first, arguments stream in.
      const calls = new Map<string, { callId: string; name: string; args: string }>();
      try {
        const stream = await client.responses.create(
          {
            model: request.model,
            instructions: request.system,
            input: toResponsesInput(request.messages),
            tools: request.tools.length ? toResponsesTools(request.tools) : undefined,
            max_output_tokens: request.maxTokens,
            store: false,
            stream: true,
          },
          { signal: request.abortSignal, timeout: TIMEOUT_MS },
        );
        for await (const event of stream) {
          if (request.abortSignal?.aborted) break;
          switch (event.type) {
            case "response.output_text.delta":
              if (event.delta) yield { type: "text_delta", text: event.delta };
              break;
            case "response.refusal.delta":
              if (event.delta) yield { type: "text_delta", text: event.delta };
              stop = "refusal";
              break;
            case "response.output_item.added":
              if (event.item.type === "function_call") calls.set(event.item.id ?? event.item.call_id, { callId: event.item.call_id, name: event.item.name, args: event.item.arguments ?? "" });
              break;
            case "response.function_call_arguments.delta": {
              const c = calls.get(event.item_id);
              if (c) c.args += event.delta;
              break;
            }
            case "response.output_item.done":
              if (event.item.type === "function_call") {
                const key = event.item.id ?? event.item.call_id;
                const c = calls.get(key);
                calls.delete(key);
                const args = event.item.arguments || c?.args || "";
                const parsed = parseToolInput(args);
                sawCall = true;
                if (parsed.ok) yield { type: "tool_call", id: event.item.call_id, name: event.item.name, input: parsed.value };
                else yield { type: "error", message: `Could not parse tool arguments for ${event.item.name}: ${parsed.error}`, code: "tool_input_invalid", retryable: true };
              }
              break;
            case "response.completed":
            case "response.incomplete":
            case "response.failed": {
              const r = event.response;
              inputTokens = r.usage?.input_tokens ?? inputTokens;
              outputTokens = r.usage?.output_tokens ?? outputTokens;
              if (event.type === "response.incomplete") {
                const reason = r.incomplete_details?.reason;
                stop = reason === "max_output_tokens" ? "max_tokens" : reason === "content_filter" ? "refusal" : "other";
              } else if (event.type === "response.failed") {
                yield { type: "error", message: `OpenAI could not finish the response: ${r.error?.message ?? "unknown error"}`, code: r.error?.code ?? "api_error", retryable: false };
                stop = "other";
              }
              break;
            }
            case "error":
              yield { type: "error", message: `OpenAI error: ${event.message}`, code: event.code ?? "api_error", retryable: false };
              stop = "other";
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
      if (sawCall && stop === "end_turn") stop = "tool_use";
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
