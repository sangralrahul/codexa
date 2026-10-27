"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Stacked sections (Razorpay style): each direct child `.stack-panel` sticks while the next one
 * slides up over it like a card, and the covered panel sinks back and dims (`--cover`, 0–1).
 * A panel taller than the viewport pins by its bottom edge (`--pin-top`), so all of it scrolls
 * past before the next card covers it; a fully covered panel stops painting (`data-covered`).
 * Script-driven (rAF, passive scroll) so it behaves the same in every browser. Phones and calm
 * mode get plain scrolling (CSS). Wraps server-rendered children; renders no extra markup.
 */
export function StackScroll({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const panels = Array.from(root.children).filter((el): el is HTMLElement => el instanceof HTMLElement && el.classList.contains("stack-panel"));
    let frame = 0;

    const measure = () => {
      const vh = window.innerHeight;
      for (const p of panels) p.style.setProperty("--pin-top", `${Math.min(0, vh - p.offsetHeight)}px`);
    };
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (let i = 0; i < panels.length; i++) {
        const next = panels[i + 1];
        const top = next ? next.getBoundingClientRect().top : vh;
        const cover = Math.min(1, Math.max(0, (vh - top) / vh));
        panels[i].style.setProperty("--cover", cover.toFixed(3));
        // Hide a panel only once the next card fully covers it and is itself pinned.
        if (cover >= 1 && top <= 0.5) panels[i].dataset.covered = "";
        else delete panels[i].dataset.covered;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    measure();
    update();
    const ro = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    panels.forEach((p) => ro.observe(p));
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={ref} data-stack="" className={cn("stack", className)}>
      {children}
    </div>
  );
}
