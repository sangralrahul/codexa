import "server-only";
import { FRAMEWORKS, TEMPLATES, type Template } from "@/templates";
import type { TemplateSummary } from "@/lib/client/workspace/types";

/** Template metadata for client components (no file contents), with the real number of files a new project gets. */
export type HubTemplate = TemplateSummary & { fileCount: number };

/** Strip file contents so template metadata can be passed to client components. */
export function summarizeTemplate(t: Template): HubTemplate {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    framework: t.framework,
    frameworkName: FRAMEWORKS[t.framework].name,
    tags: t.tags,
    prebuilt: t.prebuilt,
    featured: Boolean(t.featured),
    difficulty: t.difficulty,
    fileCount: Object.keys(t.files).length,
  };
}

export function listTemplateSummaries(): HubTemplate[] {
  return TEMPLATES.slice()
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.name.localeCompare(b.name))
    .map(summarizeTemplate);
}

export const DEFAULT_TEMPLATE_ID = "vite-react-starter";

/** Template category for a project's thumbnail (null when the project has no known template). */
export function templateCategory(templateId: string | null): string | null {
  return (templateId && TEMPLATES.find((t) => t.id === templateId)?.category) || null;
}
