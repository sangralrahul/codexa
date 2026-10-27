"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { isCalm } from "@/lib/client/motion";
import { cn } from "@/lib/utils";

/**
 * A vertical rail whose signal line fills as the reader scrolls through the block (transform only).
 * With calm motion the line is drawn full and static. Decorative: the rail is aria-hidden.
 */
export function ScrollFill({ children, className, railClassName }: { children: React.ReactNode; className?: string; railClassName?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isCalm()) {
      el.style.setProperty("--fill", "1");
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const progress = (window.innerHeight * 0.55 - r.top) / Math.max(1, r.height);
      el.style.setProperty("--fill", String(Math.min(1, Math.max(0, progress))));
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)} style={{ "--fill": 0 } as React.CSSProperties}>
      <span aria-hidden="true" className={cn("pointer-events-none absolute bottom-3 left-[7px] top-3 w-px bg-border", railClassName)} />
      <span
        aria-hidden="true"
        className={cn("pointer-events-none absolute bottom-3 left-[7px] top-3 w-px origin-top bg-signal [transform:scaleY(var(--fill))] motion-safe:transition-transform motion-safe:duration-(--dur-2)", railClassName)}
      />
      {children}
    </div>
  );
}
