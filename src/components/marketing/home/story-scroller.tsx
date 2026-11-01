"use client";

import * as React from "react";

/**
 * Drives the "How it works" story: whichever step sits across the middle band of the viewport
 * becomes active, written straight onto this element as `data-active` (no React state, so the
 * server-rendered children never re-render). Without JS the server's data-active="0" stands and
 * every step still shows its own picture on narrow screens.
 */
export function StoryScroller({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const steps = [...root.querySelectorAll<HTMLElement>("[data-step]")];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) root.dataset.active = e.target.getAttribute("data-step") ?? "0";
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    steps.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} data-active="0">
      {children}
    </div>
  );
}
