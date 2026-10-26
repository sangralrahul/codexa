"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { isCalm, useCalm } from "@/lib/client/motion";

type SceneValue = {
  /** Current chapter (0-based). */
  step: number;
  /** Overall progress through the pinned scene (0–1), updated every frame without re-rendering. */
  progressRef: React.RefObject<number>;
  /** True when the scene is pinned (≥ breakpoint and not calm). Optimistically true until mounted. */
  pinned: boolean;
  steps: number;
  /** Go to a chapter: scrolls there when pinned, otherwise just switches (tablist mode). */
  setStep: (i: number) => void;
  sceneRef: React.RefObject<HTMLDivElement | null>;
};

const SceneContext = React.createContext<SceneValue | null>(null);
const fallbackProgress = { current: 0 };
const fallbackScene = { current: null };

/** Chapter state for children of <ScrollScene>. Outside a scene it returns a static step 0. */
export function useScene(): SceneValue {
  const ctx = React.useContext(SceneContext);
  return ctx ?? { step: 0, progressRef: fallbackProgress, pinned: false, steps: 1, setStep: () => {}, sceneRef: fallbackScene };
}

const QUERIES = { md: "(min-width: 48rem)", lg: "(min-width: 64rem)" } as const;

/** Scrolls the window so chapter `i` of a pinned scene is active (smooth unless calm). */
export function scrollToStep(sceneEl: HTMLElement | null | undefined, i: number) {
  if (!sceneEl) return;
  const steps = Math.max(1, Number(sceneEl.dataset.steps) || 1);
  const stickyTop = parseFloat(sceneEl.style.getPropertyValue("--scene-top")) || 0;
  const total = sceneEl.offsetHeight - (window.innerHeight - stickyTop);
  const top = sceneEl.getBoundingClientRect().top + window.scrollY - stickyTop;
  const clamped = Math.max(0, Math.min(steps - 1, Math.round(i)));
  const target = total > 0 ? top + ((clamped + 0.04) / steps) * total : top;
  window.scrollTo({ top: Math.max(0, target), behavior: isCalm() ? "auto" : "smooth" });
}

/**
 * M5 chapter pin: "scroll picks the chapter, time plays it".
 *
 * Pinning is pure CSS (media query + calm), so there is no layout shift:
 * at ≥ pinFrom the scene is `length` tall and its child sticks at `stickyTop`.
 * JS only reads scroll progress (one rAF per scroll, only near the viewport),
 * writes `--p` (0–1) on the scene and re-renders when the chapter changes.
 * Below the breakpoint or when calm it is not pinned; children (or `fallback`,
 * after mount) render as a normal block and chapters switch with setStep().
 */
export function ScrollScene({
  steps,
  length = "330svh",
  pinFrom = "lg",
  stickyTop = 0,
  className,
  children,
  fallback,
  onStep,
  label,
}: {
  steps: number;
  length?: string;
  pinFrom?: "md" | "lg";
  stickyTop?: number;
  className?: string;
  children: React.ReactNode;
  /** Rendered instead of children when the scene cannot pin (small screens, calm), after mount. */
  fallback?: React.ReactNode;
  onStep?: (i: number) => void;
  /** Accessible name; when set the scene is a labelled region. */
  label?: string;
}) {
  const sceneRef = React.useRef<HTMLDivElement>(null);
  const progressRef = React.useRef(0);
  const stepRef = React.useRef(0);
  const onStepRef = React.useRef(onStep);
  const [step, setStepState] = React.useState(0);
  const [wide, setWide] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);
  const calm = useCalm();
  const pinned = wide && !calm;

  React.useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  React.useEffect(() => {
    const mq = window.matchMedia(QUERIES[pinFrom]);
    const sync = () => setWide(mq.matches);
    const raf = requestAnimationFrame(() => {
      sync();
      setMounted(true);
    });
    mq.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener("change", sync);
    };
  }, [pinFrom]);

  const commitStep = React.useCallback((s: number) => {
    if (s === stepRef.current) return;
    stepRef.current = s;
    setStepState(s);
    onStepRef.current?.(s);
  }, []);

  React.useEffect(() => {
    const el = sceneRef.current;
    if (!el || !pinned) return;
    let frame = 0;
    let near = false;
    const measure = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const total = r.height - (window.innerHeight - stickyTop);
      const p = total > 0 ? Math.min(1, Math.max(0, (stickyTop - r.top) / total)) : 0;
      progressRef.current = p;
      el.style.setProperty("--p", p.toFixed(4));
      commitStep(Math.min(steps - 1, Math.floor(p * steps)));
    };
    const schedule = () => {
      if (near && !frame) frame = requestAnimationFrame(measure);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        schedule();
      },
      { rootMargin: "100% 0px 100% 0px" },
    );
    io.observe(el);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [pinned, steps, stickyTop, commitStep]);

  const setStep = React.useCallback(
    (i: number) => {
      const s = Math.max(0, Math.min(steps - 1, Math.round(i)));
      if (pinned) scrollToStep(sceneRef.current, s);
      else commitStep(s);
    },
    [pinned, steps, commitStep],
  );

  const value = React.useMemo<SceneValue>(() => ({ step, progressRef, pinned, steps, setStep, sceneRef }), [step, pinned, steps, setStep]);
  const content = !pinned && mounted && fallback !== undefined ? fallback : children;

  return (
    <div
      ref={sceneRef}
      className={cn("scroll-scene", className)}
      data-pin-from={pinFrom}
      data-steps={steps}
      data-step={step}
      data-pinned={pinned && mounted ? "" : undefined}
      role={label ? "region" : undefined}
      aria-label={label}
      style={{ "--scene-length": length, "--scene-top": `${stickyTop}px` } as React.CSSProperties}
    >
      <div className="scroll-scene__sticky">
        <SceneContext.Provider value={value}>{content}</SceneContext.Provider>
      </div>
    </div>
  );
}
