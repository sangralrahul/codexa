"use client";

import * as React from "react";
import { AppWindow } from "@/components/frames/app-window";
import { IllustrationBadge } from "@/components/frames/illustration-badge";
import { cn } from "@/lib/utils";

export type SpecScene = { id: string; label: string; node: React.ReactElement<{ playing?: boolean; className?: string }>; detail: string; project: string };

/**
 * The sticky stage of the /features spec sheet: crossfades (opacity, scale .98→1, blur 4px→0,
 * 500ms) to the vignette of the group whose section crosses 40% of the viewport. The vignette
 * plays once when its group first becomes active; the rest wait at their final frames.
 * The stage sizes to its content: every scene sits in one grid cell, so the window is as tall as
 * the tallest final frame (never a fixed, half-empty box, and it never changes height), and each
 * scene fills that height (flex-1) rather than floating in the middle. The chapter label is a
 * strip pinned under the window chrome.
 */
export function SpecStage({ scenes, className }: { scenes: SpecScene[]; className?: string }) {
  const [active, setActive] = React.useState(0);
  const ids = React.useMemo(() => scenes.map((s) => s.id), [scenes]);

  React.useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = ids.indexOf(e.target.id);
          if (i >= 0) setActive(i);
        }
      },
      { rootMargin: "-40% 0px -59% 0px", threshold: 0 },
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, [ids]);

  const current = scenes[active] ?? scenes[0];
  return (
    <div className={cn("sticky top-24", className)}>
      <AppWindow project={current.project} toolbar={<IllustrationBadge label="Illustration" detail={current.detail} />} bodyClassName="flex flex-col bg-background/40">
        <p aria-live="polite" className="text-label flex h-9 shrink-0 items-center gap-2 border-b border-border bg-surface/60 px-5 text-muted-foreground">
          <span className="font-mono text-signal-ink">{String(active + 1).padStart(2, "0")}</span>
          <span aria-hidden="true" className="h-px w-5 bg-border-strong" />
          {current.label}
        </p>
        <div className="grid min-h-0 flex-1 p-5">
          {scenes.map((s, i) => {
            const on = i === active;
            return (
              <div
                key={s.id}
                aria-hidden={!on}
                inert={!on}
                className={cn(
                  "col-start-1 row-start-1 flex min-w-0 flex-col transition-[opacity,scale,filter,visibility] duration-500 ease-out calm:transition-none",
                  on ? "visible scale-100 opacity-100 blur-0" : "invisible scale-[0.98] opacity-0 blur-[4px]",
                )}
              >
                {React.isValidElement(s.node) ? React.cloneElement(s.node, { playing: on, className: "flex-1" }) : s.node}
              </div>
            );
          })}
        </div>
      </AppWindow>
    </div>
  );
}
