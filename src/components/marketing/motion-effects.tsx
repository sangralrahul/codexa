"use client";

import { useEffect } from "react";

/**
 * Site-wide motion helpers, mounted once:
 *  - elements with [data-reveal] get .is-visible when they scroll into view
 *    (CSS in globals.css does the fade/blur-up; delays via --reveal-delay);
 *  - .glow-card elements get --mx/--my so their light follows the pointer;
 *  - clicking any button, link, tab or menu item spreads a ripple from the
 *    pointer, drawn in a fixed layer on <body> (never inside React's DOM).
 * One observer and two pointer listeners for the whole page, so server
 * components only need to add attributes and classes.
 */
const RIPPLE_TARGETS = 'button, a[href], summary, [role="button"], [role="tab"], [role="menuitem"], [role="option"], [role="radio"]';

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

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onDown = (ev: PointerEvent) => {
      if (reduced || ev.button !== 0) return;
      const el = (ev.target as Element | null)?.closest?.(RIPPLE_TARGETS) as HTMLElement | null;
      if (!el || el.closest("[data-no-ripple], .monaco-editor") || el.matches(":disabled, [aria-disabled='true']")) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.width > 1200 || r.height > 600) return;
      const cs = getComputedStyle(el);
      const host = document.createElement("span");
      host.className = "ripple-host";
      Object.assign(host.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: cs.borderRadius });
      const size = Math.hypot(r.width, r.height) * 2;
      const dot = document.createElement("span");
      dot.className = "ripple-dot";
      Object.assign(dot.style, { width: `${size}px`, height: `${size}px`, left: `${ev.clientX - r.left - size / 2}px`, top: `${ev.clientY - r.top - size / 2}px`, background: cs.color });
      host.appendChild(dot);
      document.body.appendChild(host);
      setTimeout(() => host.remove(), 700);
    };
    window.addEventListener("pointerdown", onDown, { passive: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
