"use client";

import * as React from "react";
import { GlideIndicator, useGlide } from "@/components/motion/glide";
import { cn } from "@/lib/utils";

export type OnThisPageItem = { id: string; title: string };

/**
 * In-page index (replaces ScrollSpyNav and the static TOC card). Desktop: a sticky list with a
 * gliding signal marker on the section in view and a reading-progress fill; phones: a sticky,
 * horizontally scrolling chip bar. The current item carries aria-current="location".
 * Renders only for five or more sections.
 */
export function OnThisPage({
  items,
  label = "On this page",
  targetId,
  className,
  numbered = true,
  minItems = 5,
  rootMargin = "-18% 0px -62% 0px",
}: {
  items: OnThisPageItem[];
  label?: string;
  /** Element whose scroll progress fills the rail (defaults to the sections' span). */
  targetId?: string;
  className?: string;
  numbered?: boolean;
  minItems?: number;
  /** IntersectionObserver band that decides the current section. */
  rootMargin?: string;
}) {
  const [active, setActive] = React.useState(items[0]?.id);
  const listRef = React.useRef<HTMLDivElement>(null);
  const chipsRef = React.useRef<HTMLUListElement>(null);
  const fillRef = React.useRef<HTMLSpanElement>(null);
  const marker = useGlide(listRef, { axis: "y", selector: '[aria-current="location"]' });
  const enabled = items.length >= minItems;

  React.useEffect(() => {
    if (!enabled) return;
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const first = items.find((it) => visible.has(it.id));
        if (first) setActive(first.id);
      },
      { rootMargin },
    );
    for (const it of items) {
      const el = document.getElementById(it.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [items, enabled, rootMargin]);

  // Reading progress through the sections (one rAF per scroll).
  React.useEffect(() => {
    if (!enabled) return;
    const first = document.getElementById(items[0].id);
    const last = document.getElementById(items[items.length - 1].id);
    const target = targetId ? document.getElementById(targetId) : null;
    let frame = 0;
    const write = () => {
      frame = 0;
      const fill = fillRef.current;
      if (!fill) return;
      const top = (target ?? first)?.getBoundingClientRect().top ?? 0;
      const bottom = target ? target.getBoundingClientRect().bottom : (last?.getBoundingClientRect().bottom ?? 0);
      const vh = window.innerHeight;
      const span = Math.max(1, bottom - top - vh * 0.5);
      const p = Math.min(1, Math.max(0, (vh * 0.2 - top) / span));
      fill.style.transform = `scaleY(${p.toFixed(3)})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };
    write();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items, targetId, enabled]);

  // Keep the active chip in view on phones.
  React.useEffect(() => {
    const bar = chipsRef.current;
    const chip = bar?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!bar || !chip || bar.offsetParent === null) return;
    const left = chip.offsetLeft - bar.clientWidth / 2 + chip.offsetWidth / 2;
    bar.scrollTo({ left, behavior: "smooth" });
  }, [active]);

  if (!enabled) return null;

  return (
    <>
      {/* Phones and tablets: sticky chip bar under the header. */}
      <nav aria-label={label} className={cn("sticky top-16 z-30 -mx-4 mb-8 border-y border-border bg-background/85 backdrop-blur-md sm:-mx-6 lg:hidden", className)}>
        <ul ref={chipsRef} className="flex snap-x gap-1.5 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
          {items.map((it, i) => {
            const on = it.id === active;
            return (
              <li key={it.id} className="snap-start">
                <a
                  href={`#${it.id}`}
                  aria-current={on ? "location" : undefined}
                  onClick={() => setActive(it.id)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] transition-colors duration-200",
                    on ? "border-foreground/20 bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {numbered ? <span className="font-mono text-[10.5px] tabular-nums opacity-60">{String(i + 1).padStart(2, "0")}</span> : null}
                  {it.title}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Desktop: sticky list with a gliding marker and a progress fill. */}
      <nav aria-label={label} className={cn("hidden lg:block", className)}>
        <p className="text-label mb-4 text-muted-foreground">{label}</p>
        <div ref={listRef} className="relative pl-4">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-border" />
          <span ref={fillRef} aria-hidden="true" className="absolute inset-y-0 left-0 w-px origin-top bg-foreground/35" style={{ transform: "scaleY(0)" }} />
          <GlideIndicator ref={marker} className="-left-px w-[3px] rounded-full bg-signal shadow-none" />
          <ul className="relative">
            {items.map((it, i) => {
              const on = it.id === active;
              return (
                <li key={it.id}>
                  <a
                    href={`#${it.id}`}
                    aria-current={on ? "location" : undefined}
                    onClick={() => setActive(it.id)}
                    className={cn("flex items-baseline gap-3 py-1.5 text-[13.5px] leading-snug transition-colors duration-200", on ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    {numbered ? <span className="font-mono text-[10.5px] tabular-nums text-foreground-dim">{String(i + 1).padStart(2, "0")}</span> : null}
                    <span>{it.title}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}
