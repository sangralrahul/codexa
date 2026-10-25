import "server-only";
import { getContentSource } from "./source";
import { computeReadingTime, extractHeadings, markdownToPlainText, parseContent } from "./markdown";
import {
  CONTENT_SECTIONS,
  SECTION_BASE_PATH,
  type ContentDoc,
  type ContentSection,
  type ContentSummary,
  type RawContentRecord,
} from "./types";

export * from "./types";
export { computeReadingTime, extractHeadings, markdownToPlainText } from "./markdown";

/**
 * Content loader. Reads markdown through the active ContentSource, validates
 * frontmatter, computes reading time and headings, and caches the result in
 * module scope. In development the cache is bypassed so edits to content/
 * show up on refresh.
 */

const cache = new Map<ContentSection, Promise<ContentDoc[]>>();
const shouldCache = process.env.NODE_ENV === "production";

export function clearContentCache() {
  cache.clear();
}

function build(section: ContentSection, record: RawContentRecord): ContentDoc {
  const { frontmatter, body } = parseContent(record.raw, record.id);
  const slug = frontmatter.slug ?? record.defaultSlug;
  return {
    ...frontmatter,
    slug,
    section,
    href: `${SECTION_BASE_PATH[section]}/${slug}`,
    body,
    plain: markdownToPlainText(body),
    readingTime: computeReadingTime(body),
    headings: extractHeadings(body),
    sourceId: record.id,
  };
}

async function loadSection(section: ContentSection): Promise<ContentDoc[]> {
  const records = await getContentSource().list(section);
  const docs = records.map((r) => build(section, r)).filter((d) => !d.draft);
  const seen = new Set<string>();
  for (const d of docs) {
    if (seen.has(d.slug)) throw new Error(`Duplicate slug "${d.slug}" in content/${section}`);
    seen.add(d.slug);
  }
  return sortDocs(docs);
}

/** Docs/guides/tutorials/help sort by category order then `order`; blog/changelog newest first. */
export function sortDocs(docs: ContentDoc[]): ContentDoc[] {
  return docs.slice().sort((a, b) => {
    if (a.section === "blog" || a.section === "changelog") {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      return (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title);
    }
    const byOrder = (a.order ?? 1000) - (b.order ?? 1000);
    if (byOrder !== 0) return byOrder;
    return a.title.localeCompare(b.title);
  });
}

export async function getBySection(section: ContentSection): Promise<ContentDoc[]> {
  if (!shouldCache) return loadSection(section);
  let p = cache.get(section);
  if (!p) {
    p = loadSection(section);
    cache.set(section, p);
  }
  return p;
}

export async function listDocs(section?: ContentSection): Promise<ContentSummary[]> {
  const sections = section ? [section] : CONTENT_SECTIONS;
  const all = await Promise.all(sections.map((s) => getBySection(s)));
  return all.flat().map(toSummary);
}

export async function getDoc(section: ContentSection, slug: string): Promise<ContentDoc | null> {
  const docs = await getBySection(section);
  return docs.find((d) => d.slug === slug) ?? null;
}

export function toSummary(doc: ContentDoc): ContentSummary {
  const { body: _body, plain: _plain, headings: _headings, ...rest } = doc;
  return rest;
}

export type NavGroup = { category: string; items: ContentSummary[] };

/** Group a section's docs by category, preserving document order. */
export async function getNavigation(section: ContentSection): Promise<NavGroup[]> {
  const docs = await getBySection(section);
  const groups = new Map<string, ContentSummary[]>();
  for (const d of docs) {
    const list = groups.get(d.category) ?? [];
    list.push(toSummary(d));
    groups.set(d.category, list);
  }
  return [...groups.entries()].map(([category, items]) => ({ category, items }));
}

/** Previous and next entries in section order. */
export async function getAdjacent(section: ContentSection, slug: string): Promise<{ prev: ContentSummary | null; next: ContentSummary | null }> {
  const docs = await getBySection(section);
  const i = docs.findIndex((d) => d.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return { prev: i > 0 ? toSummary(docs[i - 1]) : null, next: i < docs.length - 1 ? toSummary(docs[i + 1]) : null };
}

/**
 * Related articles: explicit `related` slugs first (looked up across every
 * section, same section preferred), then tag overlap, capped at `limit`.
 */
export async function getRelated(doc: ContentDoc, limit = 4): Promise<ContentSummary[]> {
  const all = (await Promise.all(CONTENT_SECTIONS.map((s) => getBySection(s)))).flat();
  const out: ContentSummary[] = [];
  const taken = new Set<string>([doc.href]);
  for (const slug of doc.related) {
    const match = all.find((d) => d.slug === slug && d.section === doc.section) ?? all.find((d) => d.slug === slug);
    if (match && !taken.has(match.href)) {
      out.push(toSummary(match));
      taken.add(match.href);
    }
  }
  if (out.length < limit && doc.tags.length) {
    const tagged = all
      .filter((d) => !taken.has(d.href))
      .map((d) => ({ d, score: d.tags.filter((t) => doc.tags.includes(t)).length }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.d.title.localeCompare(b.d.title));
    for (const { d } of tagged) {
      if (out.length >= limit) break;
      out.push(toSummary(d));
      taken.add(d.href);
    }
  }
  return out.slice(0, limit);
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
