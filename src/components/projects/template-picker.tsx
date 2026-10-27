"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { withViewTransition } from "@/lib/client/view-transition";
import { TemplatePreview } from "@/components/templates/template-preview";

export type PickerTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  framework: string;
  frameworkName: string;
  tags: string[];
  prebuilt: boolean;
  featured: boolean;
  difficulty: "beginner" | "intermediate" | "advanced";
  fileCount: number;
};

/** Category names (kept here so the client bundle never imports the template sources). */
export const CATEGORY_NAMES: Record<string, string> = {
  websites: "Websites",
  "web-apps": "Web apps",
  saas: "SaaS",
  dashboards: "Dashboards",
  ecommerce: "Ecommerce",
  portfolios: "Portfolios",
  "ai-tools": "AI tools",
  "admin-panels": "Admin panels",
  crm: "CRM",
  "landing-pages": "Landing pages",
  "mobile-first": "Mobile-first",
};

const FRAMEWORK_SHORT: Record<string, string> = { "vite-react": "React", static: "HTML & CSS", "node-express": "Express", nextjs: "Next.js" };

/** "React · 12 files · Beginner" */
export function pickerMeta(t: Pick<PickerTemplate, "framework" | "fileCount" | "difficulty">) {
  return `${FRAMEWORK_SHORT[t.framework] ?? t.framework} · ${t.fileCount} file${t.fileCount === 1 ? "" : "s"} · ${t.difficulty.charAt(0).toUpperCase()}${t.difficulty.slice(1)}`;
}

/** Category filter row: single line, edge fades and scroll arrows when it overflows. */
function CategoryRow({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, number][] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const sync = () => setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, []);
  const nudge = (dir: 1 | -1) => rowRef.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
  return (
    <div className="relative">
      <div
        ref={rowRef}
        role="group"
        aria-label="Template categories"
        className="flex gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={edges.left || edges.right ? { maskImage: `linear-gradient(90deg, ${edges.left ? "transparent" : "black"}, black 28px, black calc(100% - 44px), ${edges.right ? "transparent" : "black"})` } : undefined}
      >
        {options.map(([c, n]) => {
          const on = value === c;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(c)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[10px] border px-3 text-[13px] transition-[color,background-color,border-color] duration-(--dur-2)",
                on ? "border-foreground bg-foreground text-background" : "border-border bg-card/60 text-muted-foreground hover:border-border-strong hover:text-foreground",
              )}
            >
              {c === "all" ? "All" : (CATEGORY_NAMES[c] ?? c)}
              <span className={cn("text-[11px] tabular-nums", on ? "opacity-70" : "opacity-60")}>{n}</span>
            </button>
          );
        })}
      </div>
      {edges.left ? (
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => nudge(-1)} className="absolute left-0 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-md">
          <ChevronLeft className="size-4" />
        </button>
      ) : null}
      {edges.right ? (
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => nudge(1)} className="absolute right-0 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-md">
          <ChevronRight className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Template chooser: a category filter, then a 2-column grid of tiles (the shared tile look:
 * the real screenshot in a slow-panning 16:10 frame, name, "React · 12 files · Beginner").
 * role=radiogroup with roving focus: arrow keys move and select, like native radios.
 * Filter changes morph through View Transitions.
 */
export function TemplatePicker({ templates, value, onChange, columns = 2 }: { templates: PickerTemplate[]; value: string; onChange: (id: string) => void; columns?: 2 | 3 }) {
  const [category, setCategory] = useState("all");
  const gridRef = useRef<HTMLDivElement>(null);
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of templates) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
    return [["all", templates.length] as [string, number], ...counts.entries()];
  }, [templates]);
  const list = category === "all" ? templates : templates.filter((t) => t.category === category);
  const focusable = list.some((t) => t.id === value) ? value : list[0]?.id;

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = list.findIndex((t) => t.id === value);
    const next = e.key === "Home" ? list[0] : e.key === "End" ? list.at(-1) : list[(Math.max(0, i) + step + list.length) % list.length];
    if (!next) return;
    onChange(next.id);
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(`[data-template="${CSS.escape(next.id)}"]`)?.focus());
  };

  return (
    <div>
      <CategoryRow value={category} onChange={(c) => withViewTransition(() => setCategory(c))} options={categories} />
      <div ref={gridRef} role="radiogroup" aria-label="Template" onKeyDown={onKey} className={cn("mt-5 grid gap-x-5 gap-y-7 sm:grid-cols-2", columns === 3 && "xl:grid-cols-3")}>
        {list.map((t, i) => {
          const selected = t.id === value;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${t.name}: ${pickerMeta(t)}`}
              tabIndex={t.id === focusable ? 0 : -1}
              data-template={t.id}
              data-no-ripple
              onClick={() => onChange(t.id)}
              style={{ viewTransitionName: `np-tpl-${t.id}` }}
              className="group/tile shot-pan flex min-w-0 flex-col text-left outline-none"
            >
              <span
                className={cn(
                  "relative block w-full overflow-hidden rounded-[16px] border bg-surface-2 shadow-[inset_0_1px_0_var(--hairline),var(--shadow-sm)] transition-[border-color,box-shadow,translate] duration-(--dur-3) ease-out",
                  "group-hover/tile:-translate-y-0.5 group-hover/tile:shadow-[var(--shadow-lg)] calm:group-hover/tile:translate-y-0",
                  "group-focus-visible/tile:outline-2 group-focus-visible/tile:outline-offset-[3px] group-focus-visible/tile:outline-ring",
                  selected ? "border-foreground/50 shadow-[0_0_0_1px_var(--foreground),var(--shadow-lg)]" : "border-border group-hover/tile:border-border-strong",
                )}
              >
                <TemplatePreview id={t.id} category={t.category} sizes="(min-width: 1280px) 360px, (min-width: 640px) 40vw, 100vw" priority={i < 2} className="rounded-none border-0 shadow-none" />
                {t.featured ? (
                  <span className="absolute bottom-2.5 left-2.5 inline-flex h-5 items-center gap-1 rounded-full bg-black/70 px-2 font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] text-white backdrop-blur-md">
                    <Sparkles className="size-2.5 text-signal-2" aria-hidden="true" /> Featured
                  </span>
                ) : null}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-full border shadow-sm transition-[opacity,scale] duration-(--dur-3) ease-snap",
                    selected ? "scale-100 border-transparent bg-foreground text-background opacity-100" : "scale-75 border-border bg-card/80 opacity-0 group-hover/tile:scale-100 group-hover/tile:opacity-100",
                  )}
                >
                  <Check className="size-3.5" strokeWidth={2.5} />
                </span>
              </span>
              <span className="mt-3 block truncate px-0.5 text-[15px] font-semibold tracking-[-0.01em]">{t.name}</span>
              <span className="mt-0.5 line-clamp-1 px-0.5 text-[13px] text-muted-foreground">{t.description}</span>
              <span className="text-meta mt-1.5 block px-0.5 text-foreground-dim">{pickerMeta(t)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
