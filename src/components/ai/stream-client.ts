"use client";

import { ClientApiError, type ApiErrorShape } from "@/lib/client/api";
import { SseParser } from "@/lib/ai/sse";
import type { AgentMode, SseEvent } from "./types";

export type GenerateBody = { prompt: string; mode: AgentMode; conversationId?: string | null };

/**
 * POST /generate and feed every SSE event to `onEvent` until the stream ends.
 * Non-200 responses (503 ai_not_configured, 402 quota_exceeded, 429 …) throw a
 * ClientApiError before any event is delivered.
 */
export async function streamGenerate(projectId: string, body: GenerateBody, opts: { signal?: AbortSignal; onEvent: (event: SseEvent) => void }): Promise<void> {
  const res = await fetch(`/api/v1/projects/${encodeURIComponent(projectId)}/ai/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    credentials: "same-origin",
    signal: opts.signal,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: ApiErrorShape };
    throw new ClientApiError(res.status, data.error ?? { code: "error", message: `Request failed (${res.status})` });
  }
  if (!res.body) throw new ClientApiError(500, { code: "no_stream", message: "The server did not return a stream." });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser();
  const deliver = (events: { event: string; data: string }[]) => {
    for (const e of events) {
      let data: unknown;
      try {
        data = JSON.parse(e.data);
      } catch {
        continue;
      }
      opts.onEvent({ event: e.event, data } as SseEvent);
    }
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      deliver(parser.push(decoder.decode(value, { stream: true })));
    }
    deliver(parser.push(decoder.decode()));
    deliver(parser.end());
  } finally {
    reader.releaseLock();
  }
}
