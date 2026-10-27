"use client";

import * as React from "react";

/**
 * Writes the parent's height to --pin-h so a pinned (sticky) section taller than the viewport
 * sticks at its bottom edge instead of its top: the whole hero stays reachable before the next
 * sheet slides over it (home.css .home-pin). Renders nothing.
 */
export function StickyFit() {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => host.style.setProperty("--pin-h", `${host.offsetHeight}px`));
    ro.observe(host);
    return () => ro.disconnect();
  }, []);
  return <span ref={ref} hidden />;
}
