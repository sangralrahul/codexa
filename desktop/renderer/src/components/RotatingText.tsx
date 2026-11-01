import * as React from "react";
import { useCalm } from "../lib/motion";
import { cn } from "../lib/util";

/**
 * Port of the web app's RotatingText (src/components/motion/rotating-text.tsx); keep the two in step.
 *
 * A headline phrase that cycles through `phrases` (the first one is the server render, so SSR and the
 * first client paint match). Every phrase sits in one slot: the active one is in flow, the others are
 * stacked on top of it. On a change the old phrase lifts away and blurs out, the next rises in from
 * below, and the slot eases to the new phrase's measured width so a centred line re-centres smoothly.
 *
 * Decorative: render it inside aria-hidden copy and keep a stable sentence for screen readers. Calm mode
 * (OS reduced motion or <html data-motion="reduced">) holds the first phrase; a hidden tab or an
 * off-screen heading pauses the cycle.
 *
 * `jumpEvent` + `jumpTo`: a window CustomEvent whose `detail` is a key in `jumpTo` (key → phrase index)
 * jumps straight to that phrase and restarts the timer (the dashboard's runtime tabs use it).
 */
export function RotatingText({
  phrases,
  interval = 2600,
  className,
  phraseClassName,
  underline = false,
  jumpEvent,
  jumpTo,
}: {
  phrases: readonly string[];
  interval?: number;
  className?: string;
  phraseClassName?: string;
  /** A soft monochrome rule under the slot that follows its width. */
  underline?: boolean;
  jumpEvent?: string;
  jumpTo?: Record<string, number>;
}) {
  const calm = useCalm();
  const [index, setIndex] = React.useState(0);
  const [prev, setPrev] = React.useState<number | null>(null);
  const [widths, setWidths] = React.useState<number[] | null>(null);
  const [tick, setTick] = React.useState(0);
  const slot = React.useRef<HTMLSpanElement>(null);
  const items = React.useRef<(HTMLSpanElement | null)[]>([]);
  const indexRef = React.useRef(0);

  const go = React.useCallback((next: number) => {
    const cur = indexRef.current;
    if (next === cur) return;
    indexRef.current = next;
    setPrev(cur);
    setIndex(next);
  }, []);

  // Measure every phrase at the current type size (fonts loading and resizes change it).
  React.useLayoutEffect(() => {
    const el = slot.current;
    if (!el) return;
    const measure = () => {
      const next = items.current.map((n) => (n ? n.getBoundingClientRect().width : 0));
      setWidths((cur) => (cur && cur.length === next.length && cur.every((w, i) => Math.abs(w - next[i]!) < 0.5) ? cur : next));
    };
    measure();
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined" && el.parentElement) {
      ro = new ResizeObserver(measure);
      ro.observe(el.parentElement);
    }
    void document.fonts?.ready.then(measure);
    return () => ro?.disconnect();
  }, [phrases]);

  // Calm holds the first phrase (the cycle below is off too).
  const shown = calm ? 0 : index;
  const leaving = calm ? null : prev;
  const width = widths?.[shown] || null;

  // The cycle: one timeout per step, held while the tab is hidden or the heading is off-screen.
  React.useEffect(() => {
    if (calm || phrases.length < 2) return;
    const el = slot.current;
    let visible = true;
    let timer: number | undefined;
    const arm = () => {
      window.clearTimeout(timer);
      if (document.hidden || !visible) return;
      timer = window.setTimeout(() => go((indexRef.current + 1) % phrases.length), interval);
    };
    const onVisibility = () => arm();
    document.addEventListener("visibilitychange", onVisibility);
    let io: IntersectionObserver | undefined;
    if (el && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([entry]) => {
        visible = entry?.isIntersecting ?? true;
        arm();
      });
      io.observe(el);
    }
    arm();
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      io?.disconnect();
    };
  }, [calm, phrases.length, interval, go, index, tick]);

  React.useEffect(() => {
    if (!jumpEvent || !jumpTo) return;
    const onJump = (e: Event) => {
      const key = (e as CustomEvent<unknown>).detail;
      const target = typeof key === "string" ? jumpTo[key] : undefined;
      if (target === undefined || calm) return;
      go(target);
      setTick((t) => t + 1);
    };
    window.addEventListener(jumpEvent, onJump);
    return () => window.removeEventListener(jumpEvent, onJump);
  }, [jumpEvent, jumpTo, calm, go]);

  return (
    <span ref={slot} className={cn("rt", underline && "rt--underline", className)} style={width ? { width: `${width}px` } : undefined}>
      {phrases.map((p, i) => (
        <span
          key={p}
          ref={(n) => {
            items.current[i] = n;
          }}
          className={cn("rt__phrase", phraseClassName)}
          data-state={i === shown ? "in" : i === leaving ? "out" : "wait"}
        >
          {p}
        </span>
      ))}
    </span>
  );
}

/**
 * Splits `text` into words that rise in with a staggered blur-to-sharp fade (CSS only). `start` offsets
 * the stagger so several runs in one headline continue one sequence. Calm shows the words at rest.
 */
export function RiseWords({ text, start = 0 }: { text: string; start?: number }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((w, i) => (
        <React.Fragment key={`${w}-${i}`}>
          {i > 0 ? " " : null}
          <span className="rise-word" style={{ "--rise-i": start + i } as React.CSSProperties}>
            {w}
          </span>
        </React.Fragment>
      ))}
    </>
  );
}

/** One element (e.g. a RotatingText slot) joining a RiseWords sequence at stagger `index`. */
export function Rise({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <span className="rise-word" style={{ "--rise-i": index } as React.CSSProperties}>
      {children}
    </span>
  );
}
