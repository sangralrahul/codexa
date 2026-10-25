import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES } from "@/config/routes";
import { site } from "@/config/site";

const abs = (path: string) => new URL(path, site.url).toString();

/** Markdown content sections (docs, guides, blog, ...) owned by the docs team; skipped if the module is unavailable. */
async function contentPaths(): Promise<MetadataRoute.Sitemap> {
  try {
    const content = await import("@/lib/content");
    const docs = await content.listDocs();
    return docs
      .filter((d) => !d.draft)
      .map((d) => ({ url: abs(`${content.SECTION_BASE_PATH[d.section]}/${d.slug}`), lastModified: d.updated ?? d.date, changeFrequency: "monthly" as const, priority: 0.5 }));
  } catch {
    return [];
  }
}

/** Template detail pages owned by the templates team; skipped if the module is unavailable. */
async function templatePaths(): Promise<MetadataRoute.Sitemap> {
  try {
    const mod = await import("@/templates");
    return mod.TEMPLATES.map((t) => ({ url: abs(`/templates/${t.id}`), changeFrequency: "monthly" as const, priority: 0.5 }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base: MetadataRoute.Sitemap = PUBLIC_ROUTES.filter((r) => !r.noindex).map((r) => ({
    url: abs(r.path),
    lastModified: now,
    changeFrequency: r.path === "/" ? "weekly" : "monthly",
    priority: r.priority ?? 0.6,
  }));
  const [content, templates] = await Promise.all([contentPaths(), templatePaths()]);
  const seen = new Set(base.map((e) => e.url));
  const extra = [...content, ...templates].filter((e) => {
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });
  return [...base, ...extra];
}
