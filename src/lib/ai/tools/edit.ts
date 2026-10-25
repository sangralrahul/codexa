export class EditError extends Error {}

/**
 * Replace exactly one occurrence of `search` in `content`.
 * Fails loudly when the search string is missing or ambiguous so the model
 * has to provide more context instead of silently editing the wrong place.
 */
export function applyEdit(content: string, search: string, replace: string): { content: string; line: number } {
  if (!search) throw new EditError("search must not be empty");
  const first = content.indexOf(search);
  if (first === -1) {
    // Help the model: try a whitespace-insensitive hint.
    const hint = content.includes(search.trim()) ? " (the text exists with different surrounding whitespace; copy it exactly)" : "";
    throw new EditError(`search text not found in file${hint}`);
  }
  const second = content.indexOf(search, first + search.length);
  if (second !== -1) {
    const count = countOccurrences(content, search);
    throw new EditError(`search text matches ${count} locations; include more surrounding lines so it is unique`);
  }
  const line = content.slice(0, first).split("\n").length;
  return { content: content.slice(0, first) + replace + content.slice(first + search.length), line };
}

export function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    n++;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return n;
}

/** Count added / removed lines between two versions (simple LCS-free estimate used for UI chips). */
export function lineDelta(before: string | null, after: string | null): { added: number; removed: number } {
  const b = before == null ? [] : before.split("\n");
  const a = after == null ? [] : after.split("\n");
  if (before == null) return { added: a.length, removed: 0 };
  if (after == null) return { added: 0, removed: b.length };
  // Myers would be nicer; a multiset difference is good enough for +/- counts.
  const counts = new Map<string, number>();
  for (const line of b) counts.set(line, (counts.get(line) ?? 0) + 1);
  let added = 0;
  for (const line of a) {
    const c = counts.get(line) ?? 0;
    if (c > 0) counts.set(line, c - 1);
    else added++;
  }
  let removed = 0;
  for (const c of counts.values()) removed += c;
  return { added, removed };
}
