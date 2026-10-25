import "server-only";
import MiniSearch from "minisearch";
import { getBySection } from "./index";
import { makeSnippet } from "./markdown";
import { CONTENT_SECTIONS, type ContentSection } from "./types";
import { GLOSSARY } from "./glossary";
import { TEMPLATES } from "@/templates";

export type SearchType = ContentSection | "glossary" | "templates" | "integrations";
export const SEARCH_TYPES: SearchType[] = [...CONTENT_SECTIONS, "glossary", "templates", "integrations"];

export type SearchDocument = {
  id: string;
  type: SearchType;
  title: string;
  description: string;
  body: string;
  tags: string;
  href: string;
};

export type SearchResult = { type: SearchType; title: string; description: string; href: string; snippet: string; score: number };

type IntegrationLike = { id: string; name: string; description?: string; category?: string; tags?: string[]; href?: string; docsUrl?: string };

/** Load the integrations directory if another module has shipped it; otherwise skip quietly. */
async function loadIntegrations(): Promise<IntegrationLike[]> {
  try {
    // A template path makes the bundler build a directory context instead of
    // failing the build when src/config/integrations.ts does not exist yet.
    const name = "integrations";
    const mod = (await import(`../../config/${name}`)) as Record<string, unknown>;
    const list = (mod.INTEGRATIONS ?? mod.integrations ?? mod.default) as unknown;
    if (!Array.isArray(list)) return [];
    return list.filter((x): x is IntegrationLike => Boolean(x && typeof x === "object" && "id" in x && "name" in x));
  } catch {
    return [];
  }
}

export async function collectSearchDocuments(): Promise<SearchDocument[]> {
  const docs: SearchDocument[] = [];
  for (const section of CONTENT_SECTIONS) {
    for (const d of await getBySection(section)) {
      docs.push({ id: `${section}:${d.slug}`, type: section, title: d.title, description: d.description, body: d.plain, tags: d.tags.join(" "), href: d.href });
    }
  }
  for (const g of GLOSSARY) {
    docs.push({ id: `glossary:${g.slug}`, type: "glossary", title: g.term, description: g.definition, body: g.definition, tags: (g.tags ?? []).join(" "), href: `/glossary#${g.slug}` });
  }
  for (const t of TEMPLATES) {
    docs.push({ id: `templates:${t.id}`, type: "templates", title: t.name, description: t.description, body: t.longDescription ?? t.description, tags: [...t.tags, t.framework, t.category].join(" "), href: `/templates/${t.id}` });
  }
  for (const i of await loadIntegrations()) {
    docs.push({ id: `integrations:${i.id}`, type: "integrations", title: i.name, description: i.description ?? "", body: i.description ?? "", tags: [...(i.tags ?? []), i.category ?? ""].join(" "), href: i.href ?? i.docsUrl ?? `/integrations/${i.id}` });
  }
  return docs;
}

export type SearchIndex = { mini: MiniSearch<SearchDocument>; byId: Map<string, SearchDocument> };

/** Pure: build an index from documents (used by tests with fixture data). */
export function createSearchIndex(documents: SearchDocument[]): SearchIndex {
  const mini = new MiniSearch<SearchDocument>({
    fields: ["title", "description", "tags", "body"],
    storeFields: ["type", "title", "description", "href"],
    searchOptions: {
      boost: { title: 4, tags: 2.5, description: 2 },
      prefix: true,
      fuzzy: (term) => (term.length > 4 ? 0.2 : false),
      combineWith: "AND",
    },
  });
  mini.addAll(documents);
  return { mini, byId: new Map(documents.map((d) => [d.id, d])) };
}

export function runSearch(index: SearchIndex, query: string, opts: { type?: SearchType; limit?: number } = {}): SearchResult[] {
  const q = query.trim();
  if (!q) return [];
  const limit = opts.limit ?? 20;
  let hits = index.mini.search(q, opts.type ? { filter: (r) => r.type === opts.type } : undefined);
  if (hits.length === 0) {
    // Relax to OR matching so multi-word queries still return something.
    hits = index.mini.search(q, { combineWith: "OR", ...(opts.type ? { filter: (r) => r.type === opts.type } : {}) });
  }
  return hits.slice(0, limit).map((h) => {
    const doc = index.byId.get(String(h.id));
    return {
      type: h.type as SearchType,
      title: h.title as string,
      description: h.description as string,
      href: h.href as string,
      snippet: doc ? makeSnippet(doc.body || doc.description, q) : "",
      score: h.score,
    };
  });
}

/** Title suggestions for very short queries (prefix match on titles). */
export function runSuggestions(index: SearchIndex, query: string, limit = 8): { title: string; href: string; type: SearchType }[] {
  const q = query.trim().toLowerCase();
  const all = [...index.byId.values()];
  const pool = q ? all.filter((d) => d.title.toLowerCase().includes(q)) : all.filter((d) => d.type === "docs");
  return pool
    .sort((a, b) => Number(b.title.toLowerCase().startsWith(q)) - Number(a.title.toLowerCase().startsWith(q)) || a.title.localeCompare(b.title))
    .slice(0, limit)
    .map((d) => ({ title: d.title, href: d.href, type: d.type }));
}

let cached: Promise<SearchIndex> | null = null;
const shouldCache = process.env.NODE_ENV === "production";

export async function getSearchIndex(): Promise<SearchIndex> {
  if (!shouldCache) return createSearchIndex(await collectSearchDocuments());
  if (!cached) cached = collectSearchDocuments().then(createSearchIndex);
  return cached;
}

export function isSearchType(value: string): value is SearchType {
  return (SEARCH_TYPES as string[]).includes(value);
}
