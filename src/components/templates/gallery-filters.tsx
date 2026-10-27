"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { GlideIndicator, useGlide } from "@/components/motion/glide";
import { isCalm } from "@/lib/client/motion";
import { cn } from "@/lib/utils";
import type { TemplateCategory } from "@/templates";
import { filterTemplateCards, isDefaultView } from "./gallery-search";
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
 * The gallery's sticky filter bar. Row one: search, framework and sort. Row two (full width): the
 * category chips (gliding pill), a single line that scrolls with edge fades and arrow buttons only
 * when the categories don't all fit. State lives in <GalleryProvider>; every change morphs the
 * grid and keeps the URL in sync (q, framework, sort, category).
 */
/** Under the marketing header: the header's height token plus a small breath (the condensed pill ends above it). */
const MARKETING_STICKY = "md:top-[calc(var(--header-h)+0.25rem)]";

export function GalleryFilters({ categories, frameworks, stickyClassName, className }: Props) {
  // Only under the marketing header does the docked bar get a full-bleed backdrop up to the top of
  // the viewport, so nothing scrolls visibly between (or beside) the header pill and the bar.
  const dockScrim = stickyClassName === undefined;
  const { state, items, results, pending, navigate } = useGallery();
  const [q, setQ] = React.useState(state.q);
  const debounce = React.useRef<number | null>(null);
  const barRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLSpanElement>(null);
  const [stuck, setStuck] = React.useState(false);
  const [scrimH, setScrimH] = React.useState(0);

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

  // Size the docked backdrop to reach just past the bar's bottom edge (the bar grows a row on narrow screens).
  React.useEffect(() => {
    const bar = barRef.current;
    if (!dockScrim || !stuck || !bar) return;
    const measure = () => setScrimH(Math.ceil(bar.getBoundingClientRect().bottom) + 8);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(bar);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [dockScrim, stuck]);

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
      {dockScrim ? (
        <div
          aria-hidden="true"
          data-on={stuck && scrimH > 0 ? "" : undefined}
          style={{ height: scrimH || undefined }}
          className={cn(
            "pointer-events-none fixed inset-x-0 top-0 z-20 hidden border-b border-border bg-background/85 opacity-0 backdrop-blur-xl backdrop-saturate-150 transition-opacity duration-(--dur-4) ease-out motion-reduce:transition-none md:block",
            "data-[on]:opacity-100",
          )}
        />
      ) : null}
      <div
        ref={barRef}
        data-stuck={stuck ? "" : undefined}
        className={cn(
          "z-30 -mx-2 rounded-[18px] border border-transparent p-2 transition-[background-color,border-color,box-shadow] duration-(--dur-4) ease-out md:sticky",
          dockScrim
            ? "data-[stuck]:border-border data-[stuck]:bg-card/70 data-[stuck]:shadow-sm"
            : "data-[stuck]:border-border data-[stuck]:bg-[var(--glass)] data-[stuck]:shadow-lg data-[stuck]:backdrop-blur-xl data-[stuck]:backdrop-saturate-150",
          stickyClassName ?? MARKETING_STICKY,
        )}
      >
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (debounce.current) window.clearTimeout(debounce.current);
            navigate({ q });
          }}
          className="grid grid-cols-2 items-center gap-2 md:grid-cols-[minmax(0,1fr)_11rem_10rem] lg:grid-cols-[minmax(0,1fr)_12rem_11rem]"
        >
          <div className="relative col-span-2 md:col-span-1">
            <Label htmlFor="template-search" className="sr-only">
              Search templates
            </Label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="template-search"
              type="search"
              value={q}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search templates"
              title="Search by name, framework or tag (e.g. kanban, express, landing)"
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
            className="col-span-2 row-start-3 md:col-span-3 md:row-start-2"
            value={state.category}
            categories={categories}
            counts={counts}
            onChange={(category) => navigate({ category })}
          />

          <div className="min-w-0">
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
          <div className="min-w-0">
            <Label htmlFor="template-sort" className="sr-only">
              Sort by
            </Label>
            <SelectMenu id="template-sort" value={state.sort} onValueChange={(sort) => navigate({ sort })} options={SORTS} />
          </div>
        </form>
      </div>

      {/* The unfiltered count is already on the "All" chip, so the line only shows once a filter narrows it. */}
      <p className={cn("text-meta mt-3 px-0.5 text-muted-foreground", isDefaultView(state) && !pending && "sr-only")} role="status" aria-live="polite">
        {pending ? "Updating…" : `${results.length} template${results.length === 1 ? "" : "s"}`}
        {state.q ? ` matching “${state.q}”` : ""}
      </p>
    </div>
  );
}

/**
 * Single-line chip scroller: gliding active pill. When the chips overflow (narrow screens), the
 * overflowing side gets an edge fade plus an arrow button that pages the row, so mouse users can
 * reach every category; keyboard users tab through the chips, which scroll themselves into view.
 */
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

  // Bring the active chip into view when it changes (keyboard, back/forward, deep links). Scrolls
  // the row only (never the page, so a deep link below the fold doesn't jump).
  React.useEffect(() => {
    const box = scroller.current;
    const el = box?.querySelector<HTMLElement>('[data-active="true"]');
    if (!box || !el) return;
    const pad = 40;
    const start = el.offsetLeft - pad;
    const end = el.offsetLeft + el.offsetWidth + pad - box.clientWidth;
    const target = box.scrollLeft > start ? start : box.scrollLeft < end ? end : null;
    if (target !== null) box.scrollTo({ left: Math.max(0, target), behavior: isCalm() ? "auto" : "smooth" });
  }, [value]);

  const page = (dir: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.7), behavior: isCalm() ? "auto" : "smooth" });
  };

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
          // Until the gliding pill has measured (first paint, before hydration), the active chip draws its own.
          active ? "bg-foreground text-background in-[[data-chips]:has(>.glide-indicator[data-ready])]:bg-transparent" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        <span className={cn("font-mono text-[10.5px] tabular-nums", active ? "text-background/70" : "text-foreground-dim", count === 0 && !active && "opacity-60")}>{count}</span>
      </button>
    );
  };

  const canLeft = fade === "left" || fade === "both";
  const canRight = fade === "right" || fade === "both";
  const arrow = "absolute top-1/2 z-[2] grid size-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-[opacity,scale,color] duration-(--dur-2) ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        ref={scroller}
        role="group"
        aria-label="Filter by category"
        data-chips=""
        onScroll={measure}
        data-fade={fade}
        className={cn(
          "relative flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden items-center gap-0.5 overflow-x-auto overscroll-x-contain py-1",
          "data-[fade=both]:[mask-image:linear-gradient(to_right,transparent,black_44px,black_calc(100%-44px),transparent)]",
          "data-[fade=left]:[mask-image:linear-gradient(to_right,transparent,black_44px)]",
          "data-[fade=right]:[mask-image:linear-gradient(to_right,black_calc(100%-44px),transparent)]",
        )}
      >
        <GlideIndicator ref={glide} className="inset-y-1 rounded-full bg-foreground shadow-sm" />
        {chip("all", "All", counts.all)}
        {categories.map((c) => chip(c.id, c.name, counts.by.get(c.id) ?? 0))}
      </div>
      {/* Pointer affordance only (tabIndex -1): keyboard users reach every chip with Tab. */}
      <button
        type="button"
        tabIndex={-1}
        disabled={!canLeft}
        aria-hidden={!canLeft || undefined}
        aria-label="Show earlier categories"
        onClick={() => page(-1)}
        className={cn(arrow, "left-0", canLeft ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0")}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        tabIndex={-1}
        disabled={!canRight}
        aria-hidden={!canRight || undefined}
        aria-label="Show more categories"
        onClick={() => page(1)}
        className={cn(arrow, "right-0", canRight ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0")}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
