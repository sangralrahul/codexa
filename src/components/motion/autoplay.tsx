"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCalm } from "@/lib/client/motion";

/**
 * Autoplay gate for any looping or scripted region.
 * `playing` is true only while the element is in view, the tab is visible,
 * the visitor has not paused it and calm is off. Pair with <PauseButton>
 * (WCAG 2.2.2: anything that moves for more than 5s needs a pause control).
 */
export function useAutoplay(ref: React.RefObject<Element | null>, { threshold = 0.25, initialPaused = false }: { threshold?: number; initialPaused?: boolean } = {}) {
  const calm = useCalm();
  const [inView, setInView] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  const [paused, setPausedState] = React.useState(initialPaused);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);

  React.useEffect(() => {
    const sync = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  const setPaused = React.useCallback((b: boolean | ((prev: boolean) => boolean)) => setPausedState(b), []);
  return { playing: inView && !hidden && !paused && !calm, paused, setPaused, inView, calm };
}

/**
 * Pause / play toggle for an autoplaying region (aria-pressed = paused).
 * Keep it rendered when calm too, so the control stays discoverable.
 */
export function PauseButton({
  paused,
  onToggle,
  label = "Pause animation",
  className,
  showLabel = false,
}: {
  paused: boolean;
  onToggle: () => void;
  label?: string;
  className?: string;
  /** Show the word "Pause"/"Play" next to the icon. */
  showLabel?: boolean;
}) {
  const Icon = paused ? Play : Pause;
  return (
    <button
      type="button"
      aria-pressed={paused}
      aria-label={label}
      title={paused ? "Play" : "Pause"}
      onClick={onToggle}
      data-no-ripple
      className={cn(
        "glass inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-border text-xs font-medium text-muted-foreground shadow-sm transition-[color,border-color,scale] duration-200 hover:border-border-strong hover:text-foreground",
        showLabel ? "px-3" : "w-8",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" fill="currentColor" strokeWidth={0} />
      {showLabel ? <span aria-hidden="true">{paused ? "Play" : "Pause"}</span> : null}
    </button>
  );
}
