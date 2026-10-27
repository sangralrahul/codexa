import { Suspense } from "react";
import { Plug } from "lucide-react";
import { EmptyState } from "@/components/ui/misc";
import { INTEGRATION_CATEGORIES } from "@/config/integrations";
import { DirectoryFilters } from "./directory-filters";
import { IntegrationCard } from "./integration-card";
import { searchIntegrations, type IntegrationSearch } from "./search";

/** Server component: URL-synced filters (client) + the card grid. */
export function IntegrationsDirectory({ search }: { search: IntegrationSearch }) {
  const results = searchIntegrations(search);
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="h-24 animate-pulse rounded-[14px] bg-muted calm:animate-none" aria-hidden="true" />}>
        <DirectoryFilters value={search} categories={INTEGRATION_CATEGORIES.map((c) => ({ id: c.id, name: c.name }))} resultCount={results.length} />
      </Suspense>
      {results.length === 0 ? (
        <EmptyState icon={<Plug className="size-8" aria-hidden="true" />} title="No integrations match" description="Try a different search term, another category, or clear the status filter." />
      ) : (
        <ul data-spotlight="grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Integrations">
          {results.map((i) => (
            <IntegrationCard key={i.id} integration={i} />
          ))}
        </ul>
      )}
    </div>
  );
}
