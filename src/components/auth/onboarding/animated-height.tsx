"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { isCalm } from "@/lib/client/motion";

/**
 * A box whose height follows its content smoothly (320ms) instead of snapping, e.g. when
 * an onboarding step changes. Height is otherwise `auto`; the content is clipped only while
 * the box moves. Calm: no animation.
 */
export const AnimatedHeight = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string; innerClassName?: string }>(function AnimatedHeight(
  { children, className, innerClassName },
  ref,
) {
  const outer = React.useRef<HTMLDivElement | null>(null);
  const inner = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i || typeof ResizeObserver === "undefined") return;
    let last = i.offsetHeight;
    let anim: Animation | null = null;
    const ro = new ResizeObserver(() => {
      const next = i.offsetHeight;
      if (Math.abs(next - last) < 2) {
        last = next;
        return;
      }
      const from = anim ? o.getBoundingClientRect().height : last;
      last = next;
      if (isCalm() || !o.animate) return;
      anim?.cancel();
      o.setAttribute("data-animating", "");
      anim = o.animate([{ height: `${from}px` }, { height: `${next}px` }], { duration: 320, easing: "cubic-bezier(.16,1,.3,1)" });
      anim.onfinish = anim.oncancel = () => {
        o.removeAttribute("data-animating");
        anim = null;
      };
    });
    ro.observe(i);
    return () => {
      ro.disconnect();
      anim?.cancel();
    };
  }, []);

  return (
    <div
      ref={(el) => {
        outer.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      className={cn("ob-height", className)}
    >
      <div ref={inner} className={innerClassName}>
        {children}
      </div>
    </div>
  );
});
