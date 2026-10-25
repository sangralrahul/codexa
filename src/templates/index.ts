import type { Template, TemplateCategory, Framework } from "./types";
import { viteReactTemplates } from "./vite-react";
import { staticTemplates } from "./static";
import { nodeExpressTemplates } from "./node-express";

export type { Template, TemplateCategory, Framework };

export const TEMPLATES: Template[] = [...viteReactTemplates, ...staticTemplates, ...nodeExpressTemplates];

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

export const FRAMEWORKS: Record<Framework, { name: string; description: string; devCommand: string; buildCommand: string; outputDir: string; port: number }> = {
  "vite-react": { name: "Vite + React + TypeScript", description: "Fast SPA with Tailwind CSS", devCommand: "npm run dev", buildCommand: "npm run build", outputDir: "dist", port: 5173 },
  static: { name: "Static HTML/CSS/JS", description: "No build step", devCommand: "npx serve -l 5173 .", buildCommand: "", outputDir: ".", port: 5173 },
  "node-express": { name: "Node.js + Express", description: "REST API with TypeScript", devCommand: "npm run dev", buildCommand: "npm run build", outputDir: "dist", port: 3000 },
  nextjs: { name: "Next.js", description: "Full-stack React", devCommand: "npm run dev", buildCommand: "npm run build", outputDir: ".next", port: 3000 },
};

export function searchTemplates(opts: { q?: string; category?: TemplateCategory | "all"; framework?: Framework | "all"; sort?: "featured" | "name" | "difficulty" }) {
  let list = TEMPLATES.slice();
  if (opts.category && opts.category !== "all") list = list.filter((t) => t.category === opts.category);
  if (opts.framework && opts.framework !== "all") list = list.filter((t) => t.framework === opts.framework);
  if (opts.q) {
    const q = opts.q.toLowerCase();
    list = list.filter((t) => [t.name, t.description, ...t.tags].some((s) => s.toLowerCase().includes(q)));
  }
  const order = { beginner: 0, intermediate: 1, advanced: 2 };
  if (opts.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  else if (opts.sort === "difficulty") list.sort((a, b) => order[a.difficulty] - order[b.difficulty]);
  else list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.name.localeCompare(b.name));
  return list;
}
