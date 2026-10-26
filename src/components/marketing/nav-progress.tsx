"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Thin progress line at the top of the window: starts the moment an
 * internal link is clicked and completes when the new route renders, so
 * every navigation gets immediate feedback even before the page arrives.
 * Driven through a data attribute (CSS in globals.css), no React state.
 */
export function NavProgress() {
  const bar = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const el = bar.current;
    if (!el || el.dataset.state !== "loading") return;
    el.dataset.state = "done";
    const t = setTimeout(() => (el.dataset.state = "idle"), 500);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    let fallback = 0;
    const onClick = (ev: MouseEvent) => {
      const el = bar.current;
      if (!el || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      const a = (ev.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/") || url.pathname === location.pathname) return;
      el.dataset.state = "loading";
      clearTimeout(fallback);
      // A navigation that never changes the path (cancelled, redirected back) must not leave the bar hanging.
      fallback = window.setTimeout(() => el.dataset.state === "loading" && (el.dataset.state = "idle"), 10000);
    };
    // Capture phase: next/link calls preventDefault() on clicks it handles.
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimeout(fallback);
    };
  }, []);

  return <div ref={bar} aria-hidden="true" data-state="idle" className="nav-progress" />;
}
