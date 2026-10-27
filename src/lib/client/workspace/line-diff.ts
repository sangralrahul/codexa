/**
 * Which lines of `after` are new or changed compared with `before` (1-based line numbers).
 * Used for the editor's AI gutter marks. Pure; no browser APIs.
 * Common prefix/suffix are trimmed first; the middle is diffed with an LCS when it is
 * small enough, otherwise the whole middle is reported as modified (honest and cheap).
 */
export type LineChanges = { added: number[]; modified: number[] };

const MAX_CELLS = 600_000;

function splitLines(s: string | null): string[] {
  if (s === null || s === undefined) return [];
  return s.split(/\r?\n/);
}

export function changedLines(before: string | null, after: string | null): LineChanges {
  const a = splitLines(before);
  const b = splitLines(after);
  if (!b.length || after === null) return { added: [], modified: [] };
  if (before === null) return { added: b.map((_, i) => i + 1), modified: [] };

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length - 1;
  let endB = b.length - 1;
  while (endA >= start && endB >= start && a[endA] === b[endB]) {
    endA--;
    endB--;
  }
  const midA = a.slice(start, endA + 1);
  const midB = b.slice(start, endB + 1);
  if (!midB.length) return { added: [], modified: [] };
  if (!midA.length) return { added: midB.map((_, i) => start + i + 1), modified: [] };
  if (midA.length * midB.length > MAX_CELLS) return { added: [], modified: midB.map((_, i) => start + i + 1) };

  // LCS table (lengths of suffixes), then walk it to find matched lines.
  const n = midA.length;
  const m = midB.length;
  const table = new Uint32Array((n + 1) * (m + 1));
  const at = (i: number, j: number) => i * (m + 1) + j;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[at(i, j)] = midA[i] === midB[j] ? table[at(i + 1, j + 1)] + 1 : Math.max(table[at(i + 1, j)], table[at(i, j + 1)]);
    }
  }
  const added: number[] = [];
  const modified: number[] = [];
  let i = 0;
  let j = 0;
  // Collect hunks: a run of removed lines next to a run of inserted lines is a modification.
  let removed = 0;
  let inserted: number[] = [];
  const flush = () => {
    if (inserted.length) (removed > 0 ? modified : added).push(...inserted);
    removed = 0;
    inserted = [];
  };
  while (i < n || j < m) {
    if (i < n && j < m && midA[i] === midB[j]) {
      flush();
      i++;
      j++;
    } else if (j < m && (i >= n || table[at(i, j + 1)] >= table[at(i + 1, j)])) {
      inserted.push(start + j + 1);
      j++;
    } else {
      removed++;
      i++;
    }
  }
  flush();
  return { added, modified };
}
