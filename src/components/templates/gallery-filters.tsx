"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { GlideIndicator, useGlide } from "@/components/motion/glide";
import { cn } from "@/lib/utils";
import type { TemplateCategory } from "@/templates";
import { filterTemplateCards } from "./gallery-search";
import { useGallery, type GalleryFilterState } from "./gallery-state";

export type { GalleryFilterState };

type Props = {
  categories: { id: TemplateCategory; name: string }[];
  frameworks: { id: string; name: string }[];
  /** Sticky offset under the page's own header (default: under the marketing header). */
  stickyClassName?: string;
  className?: string;
};

const SORTS = [
  { value: "featured", label: "Featured first" },
  { value: "name", label: "Name A–Z" },
  { value: "difficulty", label: "Difficulty" },
];

/**
 * The gallery's sticky, single-line filter bar: search, category chips (gliding pill, edge fades
 * when they overflow), framework and sort. State lives in <GalleryProvider>; every change morphs
 * the grid and keeps the URL in sync (q, framework, sort, category).
 */
export function GalleryFilters({ categories, frameworks, stickyClassName = "md:top-[4.5rem] lg:top-[4.75rem]", className }: Props) {
  const { state, items, results, pending, navigate } = useGallery();
  const [q, setQ] = React.useState(state.q);
  const debounce = React.useRef<number | null>(null);
  const barRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLSpanElement>(null);
  const [stuck, setStuck] = React.useState(false);

  // Keep the input in sync when the state changes from elsewhere (chips, reset, back/forward).
  const [syncedQ, setSyncedQ] = React.useState(state.q);
  if (state.q !== syncedQ) {
    setSyncedQ(state.q);
    setQ(state.q);
  }

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < window.innerHeight / 2), { rootMargin: "-96px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function onSearchChange(next: string) {
    setQ(next);
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => navigate({ q: next }), 180);
  }

  // Category counts reflect the current search and framework, so a chip never promises an empty page.
  const counts = React.useMemo(() => {
    const base = filterTemplateCards(items, { ...state, category: "all" });
    const m = new Map<string, number>();
    for (const t of base) m.set(t.category, (m.get(t.category) ?? 0) + 1);
    return { all: base.length, by: m };
  }, [items, state]);

  return (
    // `contents`: the sticky bar's containing block is the whole gallery, so it stays put while the grid scrolls.
    <div className={cn("contents", className)} aria-busy={pending || undefined}>
      <span ref={sentinelRef} aria-hidden="true" className="block h-0" />
      <div
        ref={barRef}
        data-stuck={stuck ? "" : undefined}
        className={cn(
          "z-30 -mx-2 rounded-[18px] border border-transparent p-2 transition-[background-color,border-color,box-shadow] duration-(--dur-4) ease-out md:sticky",
          "data-[stuck]:border-border data-[stuck]:bg-[var(--glass)] data-[stuck]:shadow-lg data-[stuck]:backdrop-blur-xl data-[stuck]:backdrop-saturate-150",
          stickyClassName,
        )}
      >
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (debounce.current) window.clearTimeout(debounce.current);
            navigate({ q });
          }}
          className="grid grid-cols-2 items-center gap-2 md:grid-cols-[minmax(0,1fr)_11rem_10rem] lg:flex lg:gap-2"
        >
          <div className="relative col-span-2 transition-[width] duration-(--dur-4) ease-out md:col-span-1 lg:w-52 lg:shrink-0 lg:focus-within:w-72 xl:w-60 xl:focus-within:w-80">
            <Label htmlFor="template-search" className="sr-only">
              Search templates
            </Label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="template-search"
              type="search"
              value={q}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search templates (e.g. kanban, express, landing)"
              className="h-10 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
              autoComplete="off"
              enterKeyHint="search"
            />
            {q ? (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  navigate({ q: "" });
                }}
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <CategoryChips
            className="col-span-2 row-start-3 md:col-span-3 md:row-start-2 lg:order-none lg:min-w-0 lg:flex-1"
            value={state.category}
            categories={categories}
            counts={counts}
            onChange={(category) => navigate({ category })}
          />

          <div className="min-w-0 lg:w-44 lg:shrink-0">
            <Label htmlFor="template-framework" className="sr-only">
              Framework
            </Label>
            <SelectMenu
              id="template-framework"
              value={state.framework}
              onValueChange={(framework) => navigate({ framework })}
              options={[{ value: "all", label: "All frameworks" }, ...frameworks.map((f) => ({ value: f.id, label: f.name }))]}
            />
          </div>
          <div className="min-w-0 lg:w-40 lg:shrink-0">
            <Label htmlFor="template-sort" className="sr-only">
              Sort by
            </Label>
            <SelectMenu id="template-sort" value={state.sort} onValueChange={(sort) => navigate({ sort })} options={SORTS} />
          </div>
        </form>
      </div>

      <p className="text-meta mt-3 px-0.5 text-muted-foreground" role="status" aria-live="polite">
        {pending ? "Updating…" : `${results.length} template${results.length === 1 ? "" : "s"}`}
        {state.q ? ` matching “${state.q}”` : ""}
      </p>
    </div>
  );
}

/** Single-line chip scroller: gliding active pill, edge fades only on the sides that overflow. */
function CategoryChips({
  value,
  categories,
  counts,
  onChange,
  className,
}: {
  value: TemplateCategory | "all";
  categories: { id: TemplateCategory; name: string }[];
  counts: { all: number; by: Map<string, number> };
  onChange: (c: TemplateCategory | "all") => void;
  className?: string;
}) {
  const scroller = React.useRef<HTMLDivElement>(null);
  const glide = useGlide(scroller, { selector: '[data-active="true"]', itemSelector: "button" });
  const [fade, setFade] = React.useState<"none" | "left" | "right" | "both">("none");

  const measure = React.useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setFade(left && right ? "both" : left ? "left" : right ? "right" : "none");
  }, []);

  React.useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  // Bring the active chip into view when it changes (keyboard, back/forward, deep links).
  React.useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [value]);

  const chip = (id: TemplateCategory | "all", label: string, count: number) => {
    const active = value === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => onChange(id)}
        aria-pressed={active}
        data-active={active ? "true" : "false"}
        className={cn(
          "relative z-[1] inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-medium transition-colors duration-(--dur-2)",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
          active ? "text-background" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        <span className={cn("font-mono text-[10.5px] tabular-nums", active ? "text-background/70" : "text-foreground-dim", count === 0 && !active && "opacity-60")}>{count}</span>
      </button>
    );
  };

  return (
    <div
      ref={scroller}
      role="group"
      aria-label="Filter by category"
      onScroll={measure}
      data-fade={fade}
      className={cn(
        "relative flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden items-center gap-0.5 overflow-x-auto overscroll-x-contain py-1",
        "data-[fade=both]:[mask-image:linear-gradient(to_right,transparent,black_28px,black_calc(100%-28px),transparent)]",
        "data-[fade=left]:[mask-image:linear-gradient(to_right,transparent,black_28px)]",
        "data-[fade=right]:[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)]",
        className,
      )}
    >
      <GlideIndicator ref={glide} className="inset-y-1 rounded-full bg-foreground shadow-sm" />
      {chip("all", "All", counts.all)}
      {categories.map((c) => chip(c.id, c.name, counts.by.get(c.id) ?? 0))}
    </div>
  );
}
