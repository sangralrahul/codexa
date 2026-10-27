"use client";

import * as React from "react";
import { isCalm } from "@/lib/client/motion";

/**
 * Reading-progress hairline for long policies: a 2px ember line across the top of the viewport.
 * Uses a CSS scroll timeline where the browser has one (marketing.css .mk-progress); otherwise a
 * passive scroll listener writes the scale once per frame. Decorative (aria-hidden).
 */
export function ReadingProgress() {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: scroll()") && !isCalm()) return;
    let frame = 0;
    const write = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.setProperty("--p", String(max > 0 ? Math.min(1, window.scrollY / max) : 0));
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };
    write();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);
  return <div ref={ref} aria-hidden="true" className="mk-progress" />;
}
