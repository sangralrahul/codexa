import type { TemplateCategory } from "@/templates";
import type { TemplateCardData } from "./types";

/**
 * Client-safe twin of `searchTemplates()` in @/templates (same matching and ordering), run over
 * card summaries so the gallery can filter instantly and morph between states. The server renders
 * the same result from the same URL, so a reload shows exactly what the client showed.
 */
export type GalleryFilterState = { q: string; category: TemplateCategory | "all"; framework: string; sort: string };

const DIFFICULTY_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

/** The three starters that lead the gallery (PLAN §5.4), in this order. */
export const FEATURED_LEAD = ["vite-react-dashboard", "vite-react-storefront", "vite-react-saas"] as const;

export function filterTemplateCards(items: TemplateCardData[], s: GalleryFilterState): TemplateCardData[] {
  let list = items.slice();
  if (s.category !== "all") list = list.filter((t) => t.category === s.category);
  if (s.framework !== "all") list = list.filter((t) => t.framework === s.framework);
  const q = s.q.trim().toLowerCase();
  if (q) list = list.filter((t) => [t.name, t.description, t.longDescription ?? "", t.category, t.framework, t.frameworkName, ...t.tags].some((v) => v.toLowerCase().includes(q)));
  if (s.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  else if (s.sort === "difficulty") list.sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] || a.name.localeCompare(b.name));
  else list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.name.localeCompare(b.name));
  return list;
}

/** The unfiltered landing view shows the Featured row above the grid. */
export function isDefaultView(s: GalleryFilterState) {
  return s.category === "all" && !s.q.trim() && s.framework === "all" && s.sort === "featured";
}

/** Query string for a state (defaults omitted). `category` is only a param in query mode. */
export function galleryQuery(s: GalleryFilterState, categoryMode: "path" | "query", keep?: URLSearchParams) {
  const sp = new URLSearchParams(keep?.toString() ?? "");
  const set = (k: string, v: string, def: string) => (v && v !== def ? sp.set(k, v) : sp.delete(k));
  set("q", s.q.trim(), "");
  set("framework", s.framework, "all");
  set("sort", s.sort, "featured");
  if (categoryMode === "query") set("category", s.category, "all");
  else sp.delete("category");
  return sp.toString();
}

/** Short framework name for meta lines ("React · 12 files · Beginner"). */
export const FRAMEWORK_SHORT: Record<string, string> = { "vite-react": "React", static: "HTML & CSS", "node-express": "Express", nextjs: "Next.js" };

export function templateMeta(t: Pick<TemplateCardData, "framework" | "fileCount" | "difficulty">) {
  const level = t.difficulty.charAt(0).toUpperCase() + t.difficulty.slice(1);
  return `${FRAMEWORK_SHORT[t.framework] ?? t.framework} · ${t.fileCount} file${t.fileCount === 1 ? "" : "s"} · ${level}`;
}
