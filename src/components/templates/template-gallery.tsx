import { Suspense } from "react";
import { LayoutTemplate } from "lucide-react";
import { EmptyState } from "@/components/ui/misc";
import { FRAMEWORKS, TEMPLATE_CATEGORIES, TEMPLATE_FRAMEWORKS, searchTemplates, summarizeTemplate, type TemplateSearch } from "@/templates";
import { GalleryFilters } from "./gallery-filters";
import { TemplateCard } from "./template-card";
import type { TemplateCardData } from "./types";

export type GalleryProps = {
  search: Required<TemplateSearch>;
  categoryMode: "path" | "query";
  basePath: string;
  /** Renders the "Use template" control for a card. */
  renderAction: (template: TemplateCardData) => React.ReactNode;
};

/** Server component: filters (client, URL-synced) + result grid. */
export function TemplateGallery({ search, categoryMode, basePath, renderAction }: GalleryProps) {
  const results = searchTemplates(search).map(summarizeTemplate);
  const frameworks = TEMPLATE_FRAMEWORKS.map((id) => ({ id, name: FRAMEWORKS[id].name }));
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-muted" aria-hidden="true" />}>
        <GalleryFilters
          value={{ q: search.q, category: search.category, framework: search.framework, sort: search.sort }}
          categories={TEMPLATE_CATEGORIES.map((c) => ({ id: c.id, name: c.name }))}
          frameworks={frameworks}
          categoryMode={categoryMode}
          basePath={basePath}
          resultCount={results.length}
        />
      </Suspense>
      {results.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate className="size-8" aria-hidden="true" />}
          title="No templates match"
          description="Try a different search term, another category, or clear the framework filter."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Templates">
          {results.map((t) => (
            <TemplateCard key={t.id} template={t} action={renderAction(t)} />
          ))}
        </ul>
      )}
    </div>
  );
}
