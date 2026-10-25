"use client";

import { useEffect } from "react";

/**
 * Site-wide motion helpers, mounted once:
 *  - elements with [data-reveal] get .is-visible when they scroll into view
 *    (CSS in globals.css does the fade/blur-up; delays via --reveal-delay);
 *  - .glow-card elements get --mx/--my so their light follows the pointer.
 * One observer and one pointer listener for the whole page, so server
 * components only need to add attributes and classes.
 */
export function MotionEffects() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const watch = (root: ParentNode) => root.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((el) => io.observe(el));
    watch(document);
    // New content after client-side navigation.
    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => n instanceof Element && (n.matches("[data-reveal]") ? io.observe(n) : watch(n)));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    let frame = 0;
    const onMove = (ev: PointerEvent) => {
      const card = (ev.target as Element | null)?.closest?.(".glow-card") as HTMLElement | null;
      if (!card || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${ev.clientX - r.left}px`);
        card.style.setProperty("--my", `${ev.clientY - r.top}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
