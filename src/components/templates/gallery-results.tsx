"use client";

import * as React from "react";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FEATURED_LEAD } from "./gallery-search";
import { useGallery } from "./gallery-state";

/**
 * The gallery's result area. Tiles are rendered on the server (they may hold server-rendered
 * actions) and handed over by id; this component only decides which appear, where, and in what
 * order, so a filter change is a pure re-order that the View Transition can morph.
 * Default view: a Featured row of three large tiles, then every other template in a 4-column grid.
 */
export function GalleryResults({ tiles, featured, className }: { tiles: Record<string, React.ReactNode>; featured: Record<string, React.ReactNode>; className?: string }) {
  const { results, showFeatured, reset, state } = useGallery();
  const lead = FEATURED_LEAD.filter((id) => featured[id]);
  const featuredRow = showFeatured && lead.length === FEATURED_LEAD.length;
  const grid = featuredRow ? results.filter((t) => !lead.includes(t.id as (typeof FEATURED_LEAD)[number])) : results;

  return (
    <div className={cn("mt-6 space-y-14", className)}>
      {featuredRow ? (
        <section aria-labelledby="tpl-featured-heading">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 id="tpl-featured-heading" className="text-label text-muted-foreground">
              Featured
            </h2>
            <p className="text-meta hidden text-foreground-dim sm:block">Screenshots captured from each starter&apos;s own build</p>
          </div>
          <ul data-spotlight="grid" className="grid gap-x-6 gap-y-10 md:grid-cols-3" aria-label="Featured templates">
            {lead.map((id) => (
              <React.Fragment key={id}>{featured[id]}</React.Fragment>
            ))}
          </ul>
        </section>
      ) : null}

      {grid.length ? (
        <section aria-labelledby="tpl-all-heading">
          <h2 id="tpl-all-heading" className={featuredRow ? "text-label mb-5 text-muted-foreground" : "sr-only"}>
            {featuredRow ? "All templates" : "Results"}
          </h2>
          <ul data-spotlight="grid" className={cn("grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", featuredRow && "[&_[data-featured-label]]:hidden")} aria-label="Templates">
            {grid.map((t) => (
              <React.Fragment key={t.id}>{tiles[t.id]}</React.Fragment>
            ))}
          </ul>
        </section>
      ) : (
        <div className="rounded-[22px] border border-dashed border-border-strong px-6 py-12 text-center">
          <span className="mx-auto mb-4 grid size-11 place-items-center rounded-xl border border-border bg-surface text-muted-foreground shadow-[inset_0_1px_0_var(--hairline)]">
            <SearchX className="size-5" aria-hidden="true" />
          </span>
          <h2 className="text-[15px] font-semibold tracking-tight">No templates match</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-pretty text-sm text-muted-foreground">
            {state.q ? <>Nothing matches “{state.q}” with these filters. </> : null}Try a different search term, another category, or clear the framework filter.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-5" onClick={reset}>
            Clear filters
          </Button>
          {lead.length ? (
            <div className="mx-auto mt-10 max-w-4xl text-left">
              <p className="text-label mb-4 text-center text-muted-foreground">Or start from a featured starter</p>
              <ul className="grid gap-5 sm:grid-cols-3" aria-label="Featured templates">
                {lead.map((id) => (
                  <React.Fragment key={id}>{tiles[id]}</React.Fragment>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
