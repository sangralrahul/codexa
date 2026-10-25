/** Output size limits for tool results (characters, not tokens). */
export const LIMITS = {
  readFile: 60_000,
  listFiles: 2_000, // entries
  searchResults: 50,
  commandOutput: 20_000,
  logLines: 200,
  logOutput: 20_000,
  writeContent: 400_000,
  toolResultDefault: 20_000,
} as const;

/** Keep the head and tail of a long string, with an explicit marker in the middle. */
export function truncateMiddle(text: string, max: number): string {
  if (text.length <= max) return text;
  const keep = Math.max(0, max - 60);
  const head = Math.ceil(keep * 0.7);
  const tail = keep - head;
  const removed = text.length - head - tail;
  return `${text.slice(0, head)}\n…[truncated ${removed} characters]…\n${tail > 0 ? text.slice(text.length - tail) : ""}`;
}

/** Keep only the tail of a long string (for logs / command output). */
export function truncateTail(text: string, max: number): string {
  if (text.length <= max) return text;
  const removed = text.length - max;
  return `…[truncated ${removed} earlier characters]…\n${text.slice(text.length - max)}`;
}
