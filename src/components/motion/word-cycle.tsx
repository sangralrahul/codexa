"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Cycles through `words` one by one (the first word is the server render). The outgoing word lifts
 * away and the next rises in, while the slot eases to the new word's width so the line re-centres
 * smoothly. Each word carries `wordClassName` (e.g. the H1's .mark-select ink). Decorative: render
 * it inside aria-hidden copy and keep the real sentence for screen readers. Calm mode, a hidden tab
 * or hovering the heading holds the current word.
 */
export function WordCycle({ words, interval = 2600, wordClassName }: { words: readonly string[]; interval?: number; wordClassName?: string }) {
  const [index, setIndex] = React.useState(0);
  const [width, setWidth] = React.useState<number | null>(null);
  const slot = React.useRef<HTMLSpanElement>(null);
  const measures = React.useRef<(HTMLSpanElement | null)[]>([]);

  React.useEffect(() => {
    const el = slot.current;
    if (!el) return;
    const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduced";
    let hovered = false;
    const heading = el.closest("h1, h2, h3");
    const enter = () => (hovered = true);
    const leave = () => (hovered = false);
    heading?.addEventListener("pointerenter", enter);
    heading?.addEventListener("pointerleave", leave);
    const id = window.setInterval(() => {
      if (hovered || document.hidden || calm()) return;
      setIndex((i) => (i + 1) % words.length);
    }, interval);
    return () => {
      window.clearInterval(id);
      heading?.removeEventListener("pointerenter", enter);
      heading?.removeEventListener("pointerleave", leave);
    };
  }, [words.length, interval]);

  React.useLayoutEffect(() => {
    const m = measures.current[index];
    if (m) setWidth(m.offsetWidth);
  }, [index]);

  // Keep the width right when fonts load or the viewport changes the type size.
  React.useEffect(() => {
    const m = measures.current[0]?.parentElement;
    if (!m || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const cur = measures.current[index];
      if (cur) setWidth(cur.offsetWidth);
    });
    ro.observe(m);
    return () => ro.disconnect();
  }, [index]);

  return (
    <span ref={slot} className="word-cycle" style={width ? { width: `${width}px` } : undefined}>
      {words.map((w, i) => (
        <span key={w} className={cn("word-cycle__word", wordClassName)} data-state={i === index ? "in" : "out"}>
          {w}
        </span>
      ))}
      {/* Off-screen copies for measuring each word's width at the current type size. */}
      <span className="word-cycle__measure">
        {words.map((w, i) => (
          <span
            key={w}
            ref={(el) => {
              measures.current[i] = el;
            }}
            className={wordClassName}
          >
            {w}
          </span>
        ))}
      </span>
    </span>
  );
}
