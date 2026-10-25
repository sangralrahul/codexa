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

/** GitHub-compatible heading slug (same rules rehype-slug applies). */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

/** Produce unique ids the way github-slugger does: foo, foo-1, foo-2 ... */
export function createSlugger() {
  const seen = new Map<string, number>();
  return (text: string) => {
    const base = slugifyHeading(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
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
    const text = m[2].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[`*_]/g, "");
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
