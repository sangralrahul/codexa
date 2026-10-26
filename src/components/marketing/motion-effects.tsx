"use client";

import { useEffect } from "react";
import { isCalm } from "@/lib/client/motion";

/**
 * Site-wide motion engine, mounted once in the root layout. Server components only
 * add attributes and classes; this wires them up with a handful of shared listeners:
 *
 *  - [data-reveal] / [data-reveal="stagger"] / SplitHeading play="view": `.is-visible` once 10% is in view (M1, M2);
 *  - [data-spotlight] / [data-spotlight-tile] / .glow-card: --mx/--my follow the pointer, centred on keyboard focus (M15);
 *    [data-spotlight="grid"] shares one light across its tiles;
 *  - ripple (12% currentColor, 520ms) on buttons and menu rows; skips [data-no-ripple], .monaco-editor, disabled (M13);
 *  - [data-spark]: eight ember strokes + an icon nudge on activation (M13 tier 2);
 *  - [data-magnetic]: drifts ≤6px toward a fine pointer, springs back (M13);
 *  - img[data-develop]: `data-developed` once loaded → develop animation (M11);
 *  - .comet-border / .marquee / [data-onscreen-watch]: `data-onscreen` while near the viewport;
 *  - .marquee: scroll velocity boosts drift up to 2.5×, hover/focus eases it to 0 (M21);
 *  - .scroll-tilt / .scroll-fade / .scroll-scale: writes --p where CSS scroll timelines are missing (M4).
 * Everything respects calm (isCalm()) at the moment it runs, so the MotionToggle applies live.
 * New content after client navigation is picked up by one MutationObserver.
 */
const RIPPLE_TARGETS = 'button, [role="button"], a[data-btn], a.btn-solid, a.btn-ember, [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"]';
const REVEAL = '[data-reveal]:not(.is-visible), [data-split][data-play="view"]:not(.is-visible)';
const ONSCREEN = ".comet-border, .marquee, [data-onscreen-watch]";
const SPOT = "[data-spotlight], [data-spotlight-tile], .glow-card";
const SCROLLFX = ".scroll-tilt, .scroll-fade, .scroll-scale";
const DEVELOP = "img[data-develop]:not([data-developed])";
const WATCHED = `${REVEAL}, ${ONSCREEN}, ${SCROLLFX}, ${DEVELOP}`;

type MarqueeState = { rate: number; hover: boolean };

export function MotionEffects() {
  useEffect(() => {
    const root = document.documentElement;
    const fine = window.matchMedia("(pointer: fine)");
    const timelines = typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: scroll()");

    /* ---------- Reveal ---------- */
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-visible");
          reveal.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );

    /* ---------- On-screen flag (comet borders, marquees) ---------- */
    const marquees = new Map<HTMLElement, MarqueeState>();
    const onscreen = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) el.setAttribute("data-onscreen", "");
          else el.removeAttribute("data-onscreen");
        }
      },
      { rootMargin: "120px 0px" },
    );

    /* ---------- Scroll-linked fallback (--p) ---------- */
    const scrollFx = new Set<HTMLElement>();
    const writeScrollFx = () => {
      const vh = window.innerHeight;
      for (const el of scrollFx) {
        if (!el.isConnected) {
          scrollFx.delete(el);
          continue;
        }
        let p: number;
        if (el.classList.contains("scroll-scale")) {
          const r = el.getBoundingClientRect();
          p = (vh - r.top) / (0.4 * (vh + r.height));
        } else {
          p = window.scrollY / (0.6 * vh);
        }
        el.style.setProperty("--p", Math.min(1, Math.max(0, p)).toFixed(3));
      }
    };

    /* ---------- Develop ---------- */
    const develop = (img: HTMLImageElement) => img.setAttribute("data-developed", "");
    const onLoad = (ev: Event) => {
      const t = ev.target;
      if (t instanceof HTMLImageElement && t.hasAttribute("data-develop")) develop(t);
    };
    document.addEventListener("load", onLoad, true);
    document.addEventListener("error", onLoad, true);

    const marqueeEnter = (ev: Event) => {
      const st = marquees.get(ev.currentTarget as HTMLElement);
      if (st) {
        st.hover = true;
        kick();
      }
    };
    const marqueeLeave = (ev: Event) => {
      const el = ev.currentTarget as HTMLElement;
      const st = marquees.get(el);
      if (!st) return;
      if (ev.type === "focusout" && el.contains((ev as FocusEvent).relatedTarget as Node | null)) return;
      if (ev.type === "pointerleave" && el.matches(":focus-within")) return;
      st.hover = false;
      kick();
    };

    const watch = (el: Element) => {
      if (el.matches(REVEAL)) reveal.observe(el);
      if (el.matches(ONSCREEN)) onscreen.observe(el);
      if (el.matches(".marquee") && !marquees.has(el as HTMLElement)) {
        const m = el as HTMLElement;
        marquees.set(m, { rate: 1, hover: false });
        m.setAttribute("data-motion-managed", "");
        m.addEventListener("pointerenter", marqueeEnter);
        m.addEventListener("pointerleave", marqueeLeave);
        m.addEventListener("focusin", marqueeEnter);
        m.addEventListener("focusout", marqueeLeave);
      }
      if (!timelines && el.matches(SCROLLFX)) scrollFx.add(el as HTMLElement);
      if (el.matches(DEVELOP)) {
        const img = el as HTMLImageElement;
        if (img.complete) develop(img);
      }
    };
    const scan = (node: ParentNode) => node.querySelectorAll(WATCHED).forEach(watch);
    scan(document);
    if (scrollFx.size) writeScrollFx();

    const mo = new MutationObserver((records) => {
      let added = false;
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches(WATCHED)) watch(n);
          if (n.firstElementChild) scan(n);
          added = true;
        });
        r.removedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches(ONSCREEN)) onscreen.unobserve(n);
          if (marquees.has(n as HTMLElement)) marquees.delete(n as HTMLElement);
        });
      }
      if (added && scrollFx.size) writeScrollFx();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    /* ---------- Marquee velocity (one rAF loop, only while something changes) ---------- */
    let boost = 0;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let loop = 0;
    let loopT = 0;
    const step = (now: number) => {
      const dt = Math.min(64, now - (loopT || now));
      loopT = now;
      boost *= Math.exp(-dt / 220);
      if (boost < 0.01) boost = 0;
      let busy = boost > 0;
      for (const [el, st] of marquees) {
        if (!el.isConnected) {
          marquees.delete(el);
          continue;
        }
        const target = st.hover ? 0 : 1 + boost;
        const k = 1 - Math.exp(-dt / (st.hover ? 140 : 90));
        st.rate += (target - st.rate) * k;
        if (Math.abs(target - st.rate) < 0.005) st.rate = target;
        else busy = true;
        if (!el.hasAttribute("data-onscreen")) continue;
        const track = el.querySelector<HTMLElement>(".marquee__track");
        track?.getAnimations().forEach((a) => {
          a.playbackRate = st.rate;
        });
      }
      loop = busy ? requestAnimationFrame(step) : 0;
      if (!loop) loopT = 0;
    };
    const kick = () => {
      if (!loop && marquees.size && !isCalm()) loop = requestAnimationFrame(step);
    };

    /* ---------- Scroll ---------- */
    let scrollFrame = 0;
    const onScroll = () => {
      const now = performance.now();
      const v = Math.abs(window.scrollY - lastY) / Math.max(1, now - lastT);
      lastY = window.scrollY;
      lastT = now;
      if (marquees.size && !isCalm()) {
        boost = Math.min(1.5, Math.max(boost, v * 0.9));
        kick();
      }
      if (scrollFx.size && !scrollFrame) {
        scrollFrame = requestAnimationFrame(() => {
          scrollFrame = 0;
          writeScrollFx();
        });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", writeScrollFx);

    /* ---------- Spotlight + magnet (one rAF per pointer move) ---------- */
    let moveFrame = 0;
    let lastMove: PointerEvent | null = null;
    let magnet: HTMLElement | null = null;
    const setSpot = (el: HTMLElement, x: number, y: number) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${Math.round(x - r.left)}px`);
      el.style.setProperty("--my", `${Math.round(y - r.top)}px`);
    };
    const releaseMagnet = () => {
      if (!magnet) return;
      magnet.style.transition = "translate 500ms var(--ease-spring)";
      magnet.style.translate = "";
      magnet = null;
    };
    const applyMove = () => {
      moveFrame = 0;
      const ev = lastMove;
      if (!ev) return;
      const target = ev.target as Element | null;
      const calm = isCalm();
      if (!calm) {
        const spot = target?.closest?.(SPOT) as HTMLElement | null;
        if (spot) {
          const grid = spot.closest('[data-spotlight="grid"]') as HTMLElement | null;
          if (grid) {
            setSpot(grid, ev.clientX, ev.clientY);
            grid.querySelectorAll<HTMLElement>("[data-spotlight-tile], .glow-card").forEach((t) => setSpot(t, ev.clientX, ev.clientY));
          } else setSpot(spot, ev.clientX, ev.clientY);
        }
      }
      const m = !calm && fine.matches ? (target?.closest?.("[data-magnetic]") as HTMLElement | null) : null;
      if (m !== magnet) releaseMagnet();
      if (m && !m.matches(":disabled, [aria-disabled='true']")) {
        magnet = m;
        const r = m.getBoundingClientRect();
        const dx = ((ev.clientX - (r.left + r.width / 2)) / (r.width / 2)) * 6;
        const dy = ((ev.clientY - (r.top + r.height / 2)) / (r.height / 2)) * 4;
        const clamp = (v: number, n: number) => Math.max(-n, Math.min(n, v));
        m.style.transition = "translate 160ms var(--ease-out)";
        m.style.translate = `${clamp(dx, 6).toFixed(1)}px ${clamp(dy, 4).toFixed(1)}px`;
      }
    };
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerType === "touch") return;
      lastMove = ev;
      if (!moveFrame) moveFrame = requestAnimationFrame(applyMove);
    };
    const onLeaveWindow = (ev: PointerEvent) => {
      if (!ev.relatedTarget) releaseMagnet();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeaveWindow);

    const onFocusIn = (ev: FocusEvent) => {
      const el = ev.target as HTMLElement | null;
      if (!el?.matches?.(":focus-visible") || isCalm()) return;
      const spot = el.closest(SPOT) as HTMLElement | null;
      if (!spot) return;
      const r = el.getBoundingClientRect();
      setSpot(spot, r.left + r.width / 2, r.top + r.height / 2);
    };
    document.addEventListener("focusin", onFocusIn);

    /* ---------- Ripple (pointerdown) ---------- */
    const onDown = (ev: PointerEvent) => {
      if (ev.button !== 0 || isCalm()) return;
      const el = (ev.target as Element | null)?.closest?.(RIPPLE_TARGETS) as HTMLElement | null;
      if (!el || el.closest("[data-no-ripple], .monaco-editor") || el.matches(":disabled, [aria-disabled='true'], [data-disabled]")) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.width > 1200 || r.height > 400) return;
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
      setTimeout(() => host.remove(), 600);
    };
    window.addEventListener("pointerdown", onDown, { passive: true });

    /* ---------- Spark (click, so keyboard activation sparks too) ---------- */
    const onClick = (ev: MouseEvent) => {
      if (isCalm()) return;
      const el = (ev.target as Element | null)?.closest?.("[data-spark]") as HTMLElement | null;
      if (!el || el.matches(":disabled, [aria-disabled='true']") || !el.animate) return;
      const r = el.getBoundingClientRect();
      const inside = ev.detail > 0 && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      const x = inside ? ev.clientX : r.left + r.width / 2;
      const y = inside ? ev.clientY : r.top + r.height / 2;
      const host = document.createElement("span");
      host.className = "spark-host";
      Object.assign(host.style, { left: `${x}px`, top: `${y}px` });
      for (let i = 0; i < 8; i++) {
        const ray = document.createElement("span");
        ray.className = "spark-ray";
        host.appendChild(ray);
        const a = i * 45 + (i % 2 ? 8 : -6);
        const d = 18 + ((i * 7) % 11);
        ray.animate(
          [
            { transform: `rotate(${a}deg) translateY(-6px) scaleY(1)`, opacity: 1 },
            { transform: `rotate(${a}deg) translateY(-${d}px) scaleY(0.25)`, opacity: 0 },
          ],
          { duration: 480, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" },
        );
      }
      document.body.appendChild(host);
      setTimeout(() => host.remove(), 560);
      const icon = (el.querySelector("[data-spark-icon]") as HTMLElement | null) ?? (el.lastElementChild instanceof SVGElement ? (el.lastElementChild as unknown as HTMLElement) : null);
      icon?.animate?.(
        [
          { transform: "translateX(0)", opacity: 1 },
          { transform: "translateX(12px)", opacity: 0, offset: 0.42 },
          { transform: "translateX(-8px)", opacity: 0, offset: 0.43 },
          { transform: "translateX(0)", opacity: 1 },
        ],
        { duration: 520, easing: "cubic-bezier(.16,1,.3,1)" },
      );
    };
    document.addEventListener("click", onClick, true);

    // Calm turned on live (MotionToggle): drop any magnet offset and stop the marquee loop.
    const onMotion = () => {
      if (!isCalm()) return;
      releaseMagnet();
      cancelAnimationFrame(loop);
      loop = 0;
    };
    window.addEventListener("codexa:motion", onMotion);

    root.dataset.motionReady = "";
    return () => {
      reveal.disconnect();
      onscreen.disconnect();
      mo.disconnect();
      document.removeEventListener("load", onLoad, true);
      document.removeEventListener("error", onLoad, true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", writeScrollFx);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeaveWindow);
      document.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("codexa:motion", onMotion);
      for (const m of marquees.keys()) {
        m.removeEventListener("pointerenter", marqueeEnter);
        m.removeEventListener("pointerleave", marqueeLeave);
        m.removeEventListener("focusin", marqueeEnter);
        m.removeEventListener("focusout", marqueeLeave);
      }
      cancelAnimationFrame(loop);
      cancelAnimationFrame(moveFrame);
      cancelAnimationFrame(scrollFrame);
      delete root.dataset.motionReady;
    };
  }, []);
  return null;
}
