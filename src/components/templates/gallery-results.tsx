"use client";

import * as React from "react";
import { ChevronDown, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FEATURED_LEAD } from "./gallery-search";
import { useGallery } from "./gallery-state";

/**
 * The gallery's result area. Tiles are rendered on the server (they may hold server-rendered
 * actions) and handed over by id; this component only decides which appear, where, and in what
 * order, so a filter change is a pure re-order that the View Transition can morph.
 * Default view: a Featured row of three large tiles, then every other template in a 4-column grid.
 * Phones (< sm): the Featured row is a horizontal swipe row (proximity snap, the next tile peeks)
 * and the grid is two columns of compact tiles (name and meta; the tile opens the preview, where
 * "Use template" lives), so the gallery stays a few screens long instead of eighteen.
 */
/** Tiles shown before "Show all": six rows of four on desktop, a few phone screens of two-up tiles. */
const PAGE = 24;

export function GalleryResults({ tiles, featured, caption = true, className }: { tiles: Record<string, React.ReactNode>; featured: Record<string, React.ReactNode>; caption?: boolean; className?: string }) {
  const { results, showFeatured, reset, state } = useGallery();
  const lead = FEATURED_LEAD.filter((id) => featured[id]);
  const featuredRow = showFeatured && lead.length === FEATURED_LEAD.length;
  const grid = featuredRow ? results.filter((t) => !lead.includes(t.id as (typeof FEATURED_LEAD)[number])) : results;
  // The full list is one click away; a new search or filter starts collapsed again.
  const filterKey = JSON.stringify(state);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const showAll = expanded === filterKey || grid.length <= PAGE + 4;
  const visible = showAll ? grid : grid.slice(0, PAGE);

  return (
    <div className={cn("mt-6 space-y-14", className)}>
      {featuredRow ? (
        <section aria-labelledby="tpl-featured-heading">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 id="tpl-featured-heading" className="text-label text-muted-foreground">
              Featured
            </h2>
            {caption ? <p className="text-meta hidden text-foreground-dim sm:block">Screenshots captured from each starter&apos;s own build</p> : null}
          </div>
          <ul
            data-spotlight="grid"
            className={cn(
              "grid gap-x-6 gap-y-10 md:grid-cols-3",
              "max-sm:-mx-4 max-sm:flex max-sm:snap-x max-sm:snap-proximity max-sm:scroll-px-4 max-sm:gap-4 max-sm:overflow-x-auto max-sm:overscroll-x-contain max-sm:px-4 max-sm:py-1 max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden",
              "max-sm:[&>li]:w-[82%] max-sm:[&>li]:shrink-0 max-sm:[&>li]:snap-start",
            )}
            aria-label="Featured templates"
          >
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
          <ul
            data-spotlight="grid"
            className={cn(
              "grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-9 lg:grid-cols-3 xl:grid-cols-4",
              // Phones: compact tiles (no description, no action row, smaller title and label).
              "max-sm:[&_[data-tile-desc]]:hidden max-sm:[&_[data-tile-actions]]:hidden max-sm:[&_[data-featured-label]]:hidden max-sm:[&_h3]:text-[14px] max-sm:[&_[data-spotlight-tile]]:rounded-md",
              featuredRow && "[&_[data-featured-label]]:hidden",
            )}
            aria-label="Templates"
          >
            {visible.map((t) => (
              <React.Fragment key={t.id}>{tiles[t.id]}</React.Fragment>
            ))}
          </ul>
          {showAll ? null : (
            <div className="mt-10 flex flex-col items-center gap-3 border-t border-border pt-8 text-center">
              <p className="text-sm text-muted-foreground">
                Showing {visible.length} of {grid.length} templates
              </p>
              <Button type="button" variant="outline" onClick={() => setExpanded(filterKey)}>
                Show all {grid.length} templates
                <ChevronDown className="size-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </section>
      ) : (
        <div className="rounded-lg border border-dashed border-border-strong px-6 py-12 text-center">
          <span className="mx-auto mb-4 grid size-11 place-items-center rounded-lg border border-border bg-surface text-muted-foreground shadow-[inset_0_1px_0_var(--hairline)]">
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
