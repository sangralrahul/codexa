import matter from "gray-matter";
import { frontmatterSchema, type Frontmatter, type Heading } from "./types";

/**
 * Pure helpers shared by the loader, the search index and tests. No fs here.
 */

export const WORDS_PER_MINUTE = 220;

export function computeReadingTime(markdown: string): { minutes: number; words: number; text: string } {
  const plain = markdownToPlainText(markdown);
  const words = plain.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  return { minutes, words, text: `${minutes} min read` };
}

/**
 * GitHub-compatible heading slug: the rules github-slugger (used by rehype-slug) applies to a
 * heading's rendered text. Lowercase, drop everything except letters, marks, numbers, connector
 * punctuation (so `_` stays: `quota_exceeded (402)` → `quota_exceeded-402`), spaces and hyphens,
 * then turn spaces into hyphens.
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "")
    .replace(/ /g, "-");
}

/** Produce unique ids exactly the way github-slugger does: foo, foo-1, foo-2 ... */
export function createSlugger() {
  const occurrences = new Map<string, number>();
  return (text: string) => {
    const original = slugifyHeading(text);
    let result = original;
    while (occurrences.has(result)) {
      const n = (occurrences.get(original) ?? 0) + 1;
      occurrences.set(original, n);
      result = `${original}-${n}`;
    }
    occurrences.set(result, 0);
    return result;
  };
}

/**
 * The rendered text of a single line of inline markdown (what rehype-slug sees): code spans keep
 * their content verbatim, links/images keep their text, emphasis markers go. Underscores inside
 * words (`snake_case`) are literal in CommonMark, so only flanking `_` runs are removed.
 */
const ESCAPED = { "*": "\uE000", _: "\uE001", "~": "\uE002" } as const;
const UNESCAPED: Record<string, string> = { "\uE000": "*", "\uE001": "_", "\uE002": "~" };

export function inlineMarkdownText(md: string): string {
  const parts = md.split(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/);
  let out = "";
  // split() with two capture groups yields [text, ticks, code, text, ticks, code, …].
  for (let i = 0; i < parts.length; i += 3) {
    out += parts[i]
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Backslash escapes are literal: park escaped markers so the emphasis rules skip them.
      .replace(/\\([*_~])/g, (_m, c: string) => ESCAPED[c as keyof typeof ESCAPED])
      .replace(/\\([\\`{}\[\]()#+\-.!])/g, "$1")
      .replace(/\*+/g, "")
      .replace(/~~/g, "")
      .replace(/(^|[^\p{L}\p{N}_])_+(?=\S)/gu, "$1")
      .replace(/(?<=\S)_+(?=$|[^\p{L}\p{N}_])/gu, "")
      .replace(/[\uE000-\uE002]/g, (c) => UNESCAPED[c]);
    if (i + 2 < parts.length) out += parts[i + 2].replace(/^ (.*) $/, "$1");
  }
  return out;
}

/** Extract h2/h3 headings (outside fenced code) with the ids rehype-slug will assign. */
export function extractHeadings(markdown: string): Heading[] {
  const out: Heading[] = [];
  const slug = createSlugger();
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    // rehype-slug numbers every heading level, so h1 must be fed to the slugger too.
    const m = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const depth = m[1].length;
    const text = inlineMarkdownText(m[2]);
    const id = slug(text);
    if (depth === 2 || depth === 3) out.push({ depth, text, id });
  }
  return out;
}

/** Rough markdown → plain text for snippets and word counts. */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\|/g, " ")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type ParsedContent = { frontmatter: Frontmatter; body: string };

/**
 * Split frontmatter from body and validate it. Throws a descriptive error
 * naming the record so broken files fail loudly during development.
 */
export function parseContent(raw: string, id: string): ParsedContent {
  const { data, content } = matter(raw);
  // YAML parses unquoted dates (2026-10-24) as Date objects; normalise them back to YYYY-MM-DD.
  for (const key of ["date", "updated"]) {
    const v = (data as Record<string, unknown>)[key];
    if (v instanceof Date && !Number.isNaN(v.getTime())) (data as Record<string, unknown>)[key] = v.toISOString().slice(0, 10);
  }
  const result = frontmatterSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    throw new Error(`Invalid frontmatter in ${id}: ${issues}`);
  }
  return { frontmatter: result.data, body: content.trim() };
}

/** First N characters of plain text around the first match of the query, with ellipses. */
export function makeSnippet(plain: string, query: string, length = 160): string {
  if (!plain) return "";
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lower = plain.toLowerCase();
  let idx = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i !== -1 && (idx === -1 || i < idx)) idx = i;
  }
  if (idx === -1) return plain.length > length ? plain.slice(0, length - 1).trimEnd() + "…" : plain;
  const start = Math.max(0, idx - Math.floor(length / 3));
  const end = Math.min(plain.length, start + length);
  return (start > 0 ? "…" : "") + plain.slice(start, end).trim() + (end < plain.length ? "…" : "");
}
