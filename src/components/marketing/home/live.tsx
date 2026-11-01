"use client";

import * as React from "react";
import { PauseButton, useAutoplay } from "@/components/motion/autoplay";
import { cn } from "@/lib/utils";

const noop = () => () => {};

/**
 * A region whose CSS animations run only while it is useful: on screen, tab visible, not paused,
 * not calm. `data-armed` (set after mount unless calm) switches the loops on in home.css and
 * `data-live` (while playing) lets them run; without JS, or under calm, neither is set and every
 * picture shows its complete, still frame. Server children pass straight through, so the
 * animated pieces themselves stay server-rendered. `pauseLabel` adds the WCAG 2.2.2 pause control.
 */
export function Live({
  children,
  className,
  pauseLabel,
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  pauseLabel?: string;
  as?: "div" | "section" | "figure" | "li";
} & Omit<React.HTMLAttributes<HTMLElement>, "children" | "className">) {
  const ref = React.useRef<HTMLElement>(null);
  const { playing, paused, setPaused, calm } = useAutoplay(ref, { threshold: 0.05 });
  const mounted = React.useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const Any = Tag as React.ElementType;
  return (
    <Any ref={ref} className={cn("hm-live", className)} data-armed={(mounted && !calm) || undefined} data-live={playing || undefined} {...rest}>
      {children}
      {pauseLabel ? (
        <div className="hm-live__pause">
          <PauseButton paused={paused || calm} onToggle={() => setPaused((p) => !p)} label={pauseLabel} />
        </div>
      ) : null}
    </Any>
  );
}
