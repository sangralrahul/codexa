import type { Template, TemplateCategory, Framework, TemplateDifficulty } from "./types";
import { viteReactTemplates } from "./vite-react";
import { staticTemplates } from "./static";
import { nodeExpressTemplates } from "./node-express";
import { catalogTemplates } from "./catalog";

export type { Template, TemplateCategory, Framework, TemplateDifficulty };

export const TEMPLATES: Template[] = [...viteReactTemplates, ...staticTemplates, ...nodeExpressTemplates, ...catalogTemplates];

const byId = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): Template | undefined {
  return byId.get(id);
}

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; name: string; description: string }[] = [
  { id: "websites", name: "Websites", description: "Marketing and content websites" },
  { id: "web-apps", name: "Web apps", description: "Interactive applications" },
  { id: "saas", name: "SaaS", description: "Multi-tenant SaaS starters" },
  { id: "dashboards", name: "Dashboards", description: "Analytics and operations" },
  { id: "ecommerce", name: "Ecommerce", description: "Storefronts and catalogs" },
  { id: "portfolios", name: "Portfolios", description: "Personal and agency sites" },
  { id: "ai-tools", name: "AI tools", description: "Chat and generation apps" },
  { id: "admin-panels", name: "Admin panels", description: "CRUD and management" },
  { id: "crm", name: "CRM", description: "Contacts and pipelines" },
  { id: "landing-pages", name: "Landing pages", description: "Single conversion pages" },
  { id: "mobile-first", name: "Mobile-first", description: "Designed for phones first" },
];

export function isTemplateCategory(value: string): value is TemplateCategory {
  return TEMPLATE_CATEGORIES.some((c) => c.id === value);
}

/**
 * Frameworks the runtime can execute. Only the three with prebuilt dependency sets
 * are used by templates; "nextjs" is kept in the map for project rows that may
 * reference it (roadmap) but no template may use it.
 */
export const FRAMEWORKS: Record<Framework, { name: string; description: string; devCommand: string; buildCommand: string; outputDir: string; port: number }> = {
  "vite-react": { name: "Vite + React + TypeScript", description: "Fast SPA with Tailwind CSS", devCommand: "npm run dev", buildCommand: "npm run build", outputDir: "dist", port: 5173 },
  static: { name: "Static HTML/CSS/JS", description: "No build step", devCommand: "codexa-static", buildCommand: "", outputDir: ".", port: 5173 },
  "node-express": { name: "Node.js + Express", description: "REST API with TypeScript", devCommand: "npm run dev", buildCommand: "npm run build", outputDir: "dist", port: 3000 },
  nextjs: { name: "Next.js", description: "Full-stack React (roadmap)", devCommand: "npm run dev", buildCommand: "npm run build", outputDir: ".next", port: 3000 },
};

/** Frameworks templates may use (the runner has prebuilt dependency sets for these). */
export const TEMPLATE_FRAMEWORKS = ["vite-react", "static", "node-express"] as const satisfies readonly Framework[];
export type TemplateFramework = (typeof TEMPLATE_FRAMEWORKS)[number];

export function isTemplateFramework(value: string): value is TemplateFramework {
  return (TEMPLATE_FRAMEWORKS as readonly string[]).includes(value);
}

export const TEMPLATE_SORTS = ["featured", "name", "difficulty"] as const;
export type TemplateSort = (typeof TEMPLATE_SORTS)[number];

export function isTemplateSort(value: string): value is TemplateSort {
  return (TEMPLATE_SORTS as readonly string[]).includes(value);
}

export type TemplateSearch = { q?: string; category?: TemplateCategory | "all"; framework?: Framework | "all"; sort?: TemplateSort };

const DIFFICULTY_ORDER: Record<TemplateDifficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 };

export function searchTemplates(opts: TemplateSearch = {}) {
  let list = TEMPLATES.slice();
  if (opts.category && opts.category !== "all") list = list.filter((t) => t.category === opts.category);
  if (opts.framework && opts.framework !== "all") list = list.filter((t) => t.framework === opts.framework);
  const q = opts.q?.trim().toLowerCase();
  if (q) {
    list = list.filter((t) =>
      [t.name, t.description, t.longDescription ?? "", t.category, t.framework, FRAMEWORKS[t.framework].name, ...t.tags].some((s) => s.toLowerCase().includes(q)),
    );
  }
  if (opts.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  else if (opts.sort === "difficulty") list.sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] || a.name.localeCompare(b.name));
  else list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.name.localeCompare(b.name));
  return list;
}

/** Template metadata without file contents — safe to send to the browser and to list endpoints. */
export type TemplateSummary = Omit<Template, "files" | "settings"> & { fileCount: number; frameworkName: string; longDescription: string };

export function summarizeTemplate(t: Template): TemplateSummary {
  const { files, settings: _settings, ...rest } = t;
  void _settings;
  return { ...rest, longDescription: t.longDescription ?? t.description, fileCount: Object.keys(files).length, frameworkName: FRAMEWORKS[t.framework].name };
}

/** Parse untrusted query-string values into a TemplateSearch, ignoring unknown values. */
export function parseTemplateSearch(input: { q?: string | null; category?: string | null; framework?: string | null; sort?: string | null }): Required<TemplateSearch> {
  return {
    q: (input.q ?? "").slice(0, 100),
    category: input.category && isTemplateCategory(input.category) ? input.category : "all",
    framework: input.framework && isTemplateFramework(input.framework) ? input.framework : "all",
    sort: input.sort && isTemplateSort(input.sort) ? input.sort : "featured",
  };
}
