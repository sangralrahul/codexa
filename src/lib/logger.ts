type Level = "debug" | "info" | "warn" | "error";

const levelOrder: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel: Level = (process.env.LOG_LEVEL as Level) ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (levelOrder[level] < levelOrder[minLevel]) return;
  const entry = { level, time: new Date().toISOString(), msg, ...redact(meta) };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

const SENSITIVE = /(password|secret|token|key|authorization|cookie)/i;
function redact(meta?: Record<string, unknown>) {
  if (!meta) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = SENSITIVE.test(k) ? "[redacted]" : v instanceof Error ? { message: v.message, stack: v.stack } : v;
  }
  return out;
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
};
