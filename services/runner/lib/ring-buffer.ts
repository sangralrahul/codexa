export type LogStream = "stdout" | "stderr" | "system";
export type LogLine = { ts: string; stream: LogStream; line: string };

type Listener = (line: LogLine) => void;

/**
 * Fixed-size ring buffer of log lines with live subscribers. Lines longer
 * than `maxLineLength` are truncated so a runaway process cannot make the
 * buffer unbounded.
 */
export class LogBuffer {
  private buf: (LogLine | undefined)[];
  private head = 0; // next write position
  private count = 0;
  private listeners = new Set<Listener>();
  private partial: Record<"stdout" | "stderr", string> = { stdout: "", stderr: "" };

  constructor(
    private readonly capacity = 2000,
    private readonly maxLineLength = 8192,
  ) {
    if (capacity < 1) throw new Error("capacity must be >= 1");
    this.buf = new Array(capacity);
  }

  get size() {
    return this.count;
  }

  push(stream: LogStream, line: string) {
    const entry: LogLine = { ts: new Date().toISOString(), stream, line: line.length > this.maxLineLength ? line.slice(0, this.maxLineLength) + "…" : line };
    this.buf[this.head] = entry;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
    for (const l of this.listeners) l(entry);
  }

  /** Feed a chunk of process output; splits on newlines and keeps partial lines across chunks. */
  write(stream: "stdout" | "stderr", chunk: string) {
    const data = this.partial[stream] + chunk.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = data.split("\n");
    this.partial[stream] = lines.pop() ?? "";
    for (const l of lines) this.push(stream, l);
  }

  /** Flush partial lines (on process exit). */
  flush() {
    for (const s of ["stdout", "stderr"] as const) {
      if (this.partial[s]) {
        this.push(s, this.partial[s]);
        this.partial[s] = "";
      }
    }
  }

  tail(n = this.capacity): LogLine[] {
    const take = Math.max(0, Math.min(n, this.count));
    const out: LogLine[] = [];
    for (let i = this.count - take; i < this.count; i++) {
      const idx = (this.head - this.count + i + this.capacity * 2) % this.capacity;
      const e = this.buf[idx];
      if (e) out.push(e);
    }
    return out;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Plain-text rendering (used for build logs and truncated exec output). */
  text(): string {
    return this.tail()
      .map((l) => l.line)
      .join("\n");
  }
}

/** Keep at most `maxBytes` of output, preferring the tail (where errors usually are). */
export function truncateOutput(output: string, maxBytes: number): { text: string; truncated: boolean } {
  const bytes = Buffer.byteLength(output, "utf8");
  if (bytes <= maxBytes) return { text: output, truncated: false };
  const headBytes = Math.floor(maxBytes * 0.25);
  const tailBytes = maxBytes - headBytes;
  const buf = Buffer.from(output, "utf8");
  const head = buf.subarray(0, headBytes).toString("utf8");
  const tail = buf.subarray(buf.length - tailBytes).toString("utf8");
  return { text: `${head}\n…[output truncated: ${bytes - maxBytes} bytes omitted]…\n${tail}`, truncated: true };
}
