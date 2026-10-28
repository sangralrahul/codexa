/**
 * Provider-neutral streaming interface for the AI engine.
 * Every provider (Anthropic, OpenAI, mock) turns its native stream into the
 * same sequence of `ProviderEvent`s so the agent loop never sees SDK types.
 */
import type { AiProviderId } from "./keys";

export type JsonSchema = Record<string, unknown>;

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
};

export type ToolCall = { id: string; name: string; input: unknown };

export type ToolResult = { toolCallId: string; name: string; output: string; isError?: boolean };

/** An image sent to the model with a user message (base64, no data: prefix). */
export type ImageInput = { mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; data: string };

export type ChatMessage =
  | { role: "user"; content: string; images?: ImageInput[] }
  | { role: "assistant"; text: string; toolCalls: ToolCall[] }
  | { role: "tool"; results: ToolResult[] };

export type ProviderRequest = {
  system: string;
  messages: ChatMessage[];
  tools: ToolDefinition[];
  model: string;
  maxTokens: number;
  abortSignal?: AbortSignal;
};

export type StopReason = "end_turn" | "tool_use" | "max_tokens" | "refusal" | "cancelled" | "other";

export type ProviderEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_call"; id: string; name: string; input: unknown }
  | { type: "usage"; inputTokens: number; outputTokens: number }
  | { type: "stop"; reason: StopReason }
  | { type: "error"; message: string; code?: string; retryable?: boolean };

export interface AiProvider {
  id: AiProviderId;
  stream(request: ProviderRequest): AsyncIterable<ProviderEvent>;
}

export class ProviderError extends Error {
  code: string;
  retryable: boolean;
  constructor(message: string, code = "provider_error", retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

/** Safely parse accumulated tool-call JSON; returns `{}` for an empty input. */
export function parseToolInput(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "invalid JSON" };
  }
}
