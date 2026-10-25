/**
 * Server-sent events helpers shared by the generate route (encoder) and the
 * chat panel (decoder). Pure functions, safe to import on either side.
 */
export const SSE_EVENT_NAMES = ["run", "stage", "text", "tool_call", "tool_result", "file_change", "plan", "usage", "done", "error"] as const;
export type SseEventName = (typeof SSE_EVENT_NAMES)[number];

/** `event: <name>\ndata: <json>\n\n` — data is a single line because JSON.stringify never emits raw newlines. */
export function encodeSseEvent(name: string, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data ?? null)}\n\n`;
}

/** Comment line used as keep-alive; ignored by EventSource-style parsers. */
export function encodeSseComment(text = "keep-alive"): string {
  return `: ${text}\n\n`;
}

export type ParsedSseEvent = { event: string; data: string };

/**
 * Incremental SSE parser. Feed chunks; receive complete events.
 * Keeps the unfinished tail in `buffer` between calls.
 */
export class SseParser {
  private buffer = "";

  push(chunk: string): ParsedSseEvent[] {
    this.buffer += chunk.replace(/\r\n/g, "\n");
    const events: ParsedSseEvent[] = [];
    let idx: number;
    while ((idx = this.buffer.indexOf("\n\n")) !== -1) {
      const block = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 2);
      const parsed = parseBlock(block);
      if (parsed) events.push(parsed);
    }
    return events;
  }

  /** Flush a trailing block without a terminating blank line (end of stream). */
  end(): ParsedSseEvent[] {
    const rest = this.buffer;
    this.buffer = "";
    const parsed = rest.trim() ? parseBlock(rest) : null;
    return parsed ? [parsed] : [];
  }
}

function parseBlock(block: string): ParsedSseEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }
  if (!data.length) return null;
  return { event, data: data.join("\n") };
}
