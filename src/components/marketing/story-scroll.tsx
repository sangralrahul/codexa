"use client";

import * as React from "react";
import { AppWindow } from "@/components/frames/app-window";
import { IllustrationBadge } from "@/components/frames/illustration-badge";
import { cn } from "@/lib/utils";

export type StoryStage = {
  /** A vignette element (rendered on the server); the story drives its `playing` prop (and sizes it with `className`). */
  node: React.ReactElement<{ playing?: boolean; className?: string }>;
  detail: string;
  project: string;
};

/**
 * "How it works" as sticky scrollytelling (PLAN §5.3): steps on the left, a sticky workspace
 * window on the right whose vignette switches as each step crosses the middle of the viewport,
 * and a rail that fills step by step. Scroll picks the step; the vignette then plays once.
 * Inactive vignettes sit stacked at their final frame (so the stage never changes height), and
 * the active one fills that height (flex-1, top-aligned) instead of floating in a half-empty box.
 * Inactive steps stay fully legible (muted text, never faded below it): focus is carried by the
 * title colour, the rail marker and a small shift. Phones: the stage sits above the list and the
 * step titles (or the numbered chips) switch it.
 */
export function StoryScroll({
  steps,
  stages,
  label = "How it works",
}: {
  steps: { title: string; body: React.ReactNode }[];
  stages: StoryStage[];
  label?: string;
}) {
  const [active, setActive] = React.useState(0);
  const activeRef = React.useRef(0);
  const itemRefs = React.useRef<(HTMLLIElement | null)[]>([]);
  const n = steps.length;

  const activate = React.useCallback((i: number) => {
    if (activeRef.current === i) return;
    activeRef.current = i;
    setActive(i);
  }, []);

  React.useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = itemRefs.current.indexOf(e.target as HTMLLIElement);
          if (i >= 0) activate(i);
        }
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );
    for (const el of itemRefs.current) if (el) io.observe(el);
    return () => io.disconnect();
  }, [activate, n]);

  const select = (i: number) => {
    activate(i);
    const el = itemRefs.current[i];
    // On desktop the list drives the stage: bring the chosen step to the middle.
    if (el && window.matchMedia("(min-width: 64rem)").matches) el.scrollIntoView({ block: "center", behavior: document.documentElement.dataset.motion === "reduced" ? "auto" : "smooth" });
  };

  const current = stages[Math.min(active, stages.length - 1)];
  const playable = (node: StoryStage["node"], on: boolean) => (React.isValidElement(node) ? React.cloneElement(node, { playing: on, className: "flex-1" }) : node);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <div className="order-2 lg:order-1">
        <ol aria-label={label} className="relative">
          <span aria-hidden="true" className="absolute bottom-3 left-[13px] top-3 w-px bg-border" />
          <span
            aria-hidden="true"
            className="absolute bottom-3 left-[13px] top-3 w-px origin-top bg-primary transition-transform duration-500 ease-out calm:transition-none"
            style={{ transform: `scaleY(${n > 1 ? active / (n - 1) : 1})` }}
          />
          {steps.map((s, i) => {
            const on = i === active;
            const done = i < active;
            return (
              <li
                key={s.title}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                data-on={on ? "" : undefined}
                className="relative pb-10 pl-12 last:pb-0 lg:flex lg:min-h-[38svh] lg:flex-col lg:justify-center lg:pb-0 lg:first:justify-start lg:first:pt-2"
              >
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -left-12 top-0.5 inline-flex size-[27px] items-center justify-center rounded-full border bg-background font-mono text-[11px] tabular-nums transition-[color,border-color,background-color,box-shadow] duration-300",
                      on ? "border-primary/50 text-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_12%,transparent)]" : done ? "border-border-strong text-foreground" : "border-border text-muted-foreground",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className={cn("transition-transform duration-300 ease-out calm:transition-none", on && "lg:translate-x-1")}>
                    <h3 className={cn("text-display-4 transition-colors duration-300", on ? "text-foreground" : "lg:text-muted-foreground")}>
                      <button type="button" onClick={() => select(i)} aria-pressed={on} className="text-left outline-offset-4 hover:text-foreground">
                        <span className="sr-only">Step {i + 1}: </span>
                        {s.title}
                      </button>
                    </h3>
                    <div className={cn("mt-3 max-w-md text-[15px] leading-relaxed transition-colors duration-300", on ? "text-foreground/80" : "text-muted-foreground")}>{s.body}</div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="order-1 min-w-0 lg:order-2">
        <div className="lg:sticky lg:top-[max(6rem,calc(50svh-15rem))]">
          <AppWindow project={current.project} toolbar={<IllustrationBadge label="Illustration" detail={current.detail} />} bodyClassName="bg-background/40 p-4 sm:p-6">
            <div className="grid">
              {stages.map((st, i) => (
                <div
                  key={i}
                  aria-hidden={i !== active}
                  inert={i !== active}
                  className={cn(
                    "col-start-1 row-start-1 flex min-w-0 flex-col transition-[opacity,translate,visibility] duration-[420ms] ease-out calm:transition-none",
                    i === active ? "visible translate-y-0 opacity-100" : "invisible translate-y-2 opacity-0",
                  )}
                >
                  {playable(st.node, i === active)}
                </div>
              ))}
            </div>
          </AppWindow>
          {/* Phones: numbered chips switch the stage directly. */}
          <div className="mt-4 flex flex-wrap justify-center gap-1.5 lg:hidden">
            {steps.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => select(i)}
                aria-pressed={i === active}
                aria-label={`Show step ${i + 1}: ${s.title}`}
                className={cn(
                  "inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2.5 font-mono text-[11px] tabular-nums transition-colors",
                  i === active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
