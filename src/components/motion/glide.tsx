"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const ACTIVE = '[aria-selected="true"], [data-state="active"], [aria-current="page"], [aria-current="true"], [aria-checked="true"], [data-active="true"]';
const ITEMS = '[role="tab"], [role="radio"], [role="option"], [role="menuitem"], a[href], button';

/**
 * M12 glide: one indicator moves (transform + size, 380ms --ease-snap) between
 * the active items of a container. Works with Radix tabs, radiogroups, nav links
 * (aria-current) and listboxes; follows keyboard focus and, with `hover`, the pointer.
 *
 * The container must be `position: relative`; render <GlideIndicator ref={indicatorRef} />
 * as its first child and give the items `relative z-[1]` (or any z-index above it).
 *
 * @example
 *   const listRef = useRef<HTMLDivElement>(null);
 *   const glide = useGlide(listRef, { hover: true });
 *   <div ref={listRef} className="relative flex"><GlideIndicator ref={glide} className="bg-muted rounded-md" />…</div>
 */
export function useGlide(
  containerRef: React.RefObject<HTMLElement | null>,
  { selector = ACTIVE, itemSelector = ITEMS, axis = "x", hover = false }: { selector?: string; itemSelector?: string; axis?: "x" | "y" | "both"; hover?: boolean } = {},
) {
  const indicatorRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const box = containerRef.current;
    if (!box) return;
    let hovered: HTMLElement | null = null;
    let frame = 0;

    const place = (target: HTMLElement | null, animate = true) => {
      const ind = indicatorRef.current;
      if (!ind) return;
      if (!target || !box.contains(target) || target.offsetParent === null) {
        delete ind.dataset.ready;
        return;
      }
      const b = box.getBoundingClientRect();
      const r = target.getBoundingClientRect();
      const x = r.left - b.left + box.scrollLeft - box.clientLeft;
      const y = r.top - b.top + box.scrollTop - box.clientTop;
      if (animate && ind.dataset.ready !== undefined) ind.dataset.animate = "";
      else delete ind.dataset.animate;
      if (axis === "x") {
        ind.style.transform = `translateX(${x}px)`;
        ind.style.width = `${r.width}px`;
      } else if (axis === "y") {
        ind.style.transform = `translateY(${y}px)`;
        ind.style.height = `${r.height}px`;
      } else {
        ind.style.transform = `translate(${x}px, ${y}px)`;
        ind.style.width = `${r.width}px`;
        ind.style.height = `${r.height}px`;
      }
      ind.dataset.ready = "";
    };

    const active = () => box.querySelector<HTMLElement>(selector);
    const sync = (animate = true) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => place(hovered ?? active(), animate));
    };

    sync(false);
    const mo = new MutationObserver(() => sync());
    mo.observe(box, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-selected", "data-state", "aria-current", "aria-checked", "data-active"] });
    const ro = new ResizeObserver(() => sync(false));
    ro.observe(box);

    const itemFrom = (t: EventTarget | null) => {
      const el = (t as Element | null)?.closest?.(itemSelector) as HTMLElement | null;
      return el && box.contains(el) && el !== box ? el : null;
    };
    const onOver = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const el = itemFrom(e.target);
      if (el && el !== hovered) {
        hovered = el;
        sync();
      }
    };
    const onLeave = () => {
      hovered = null;
      sync();
    };
    const onFocus = (e: FocusEvent) => {
      const el = itemFrom(e.target);
      if (el && (e.target as HTMLElement).matches(":focus-visible")) {
        hovered = el;
        sync();
      }
    };
    const onBlur = (e: FocusEvent) => {
      if (!box.contains(e.relatedTarget as Node | null)) onLeave();
    };
    if (hover) {
      box.addEventListener("pointerover", onOver);
      box.addEventListener("pointerleave", onLeave);
      box.addEventListener("focusin", onFocus);
      box.addEventListener("focusout", onBlur);
    }
    const onResize = () => sync(false);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      mo.disconnect();
      ro.disconnect();
      box.removeEventListener("pointerover", onOver);
      box.removeEventListener("pointerleave", onLeave);
      box.removeEventListener("focusin", onFocus);
      box.removeEventListener("focusout", onBlur);
    };
  }, [containerRef, selector, itemSelector, axis, hover]);

  return indicatorRef;
}

/**
 * The gliding pill/bar. Default look is a raised pill (card + hairline); restyle with
 * utilities, or add `glide-indicator--bar` for a 2px signal underline.
 * Vertical/horizontal extent not driven by the axis comes from your classes (e.g. `inset-y-1`).
 */
export function GlideIndicator({ className, ref }: { className?: string; ref?: React.Ref<HTMLElement | null> }) {
  return <span ref={ref as React.Ref<HTMLSpanElement>} aria-hidden="true" className={cn("glide-indicator", className)} />;
}
