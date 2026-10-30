"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useCalm } from "@/lib/client/motion";
import { CAPTURES, type CaptureId } from "@/components/marketing/captures";

/**
 * The animated homepage demo: four real captures of the product, layered in one frame, played as
 * a loop (3.5 s a step) with a crossfade, a typed caption, step dots and a progress line.
 * Dependency-free: timers and CSS transitions only. It pauses while hovered or focused, and when
 * motion is reduced (OS setting or the site toggle) it shows step 1 static with every caption
 * available through the step buttons. Every picture is a capture; nothing in the frame is drawn.
 */
const STEP_MS = 3500;
const TYPE_MS = 28;

type Step = { id: string; label: string; capture: CaptureId; caption: string };

export const DEMO_STEPS: Step[] = [
  { id: "describe", label: "Describe", capture: "demoDescribe", caption: "Describe the app in a sentence and pick a starter." },
  { id: "build", label: "Build", capture: "demoAgent", caption: "The agent plans the files, writes them and lists every action." },
  { id: "review", label: "Review", capture: "demoHistory", caption: "Every run is a checkpoint: diff any file, restore in one click." },
  { id: "publish", label: "Publish", capture: "demoPublish", caption: "Run the pre-publish checks and go live at your address." },
];

/** Types `text` in one character at a time (a new text restarts from nothing); the whole text at once when `on` is false. */
function useTyped(text: string, on: boolean) {
  const [typed, setTyped] = React.useState({ text, n: 0 });
  // A new caption restarts the typing (state adjustment during render, no effect needed).
  if (typed.text !== text) setTyped({ text, n: 0 });
  const done = typed.n >= text.length;
  React.useEffect(() => {
    if (!on || done) return;
    const t = window.setInterval(() => setTyped((s) => (s.n >= s.text.length ? s : { ...s, n: s.n + 1 })), TYPE_MS);
    return () => window.clearInterval(t);
  }, [text, on, done]);
  return on ? text.slice(0, typed.n) : text;
}

export function ProductDemo({ className }: { className?: string }) {
  const calm = useCalm();
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [inView, setInView] = React.useState(true);
  const [manual, setManual] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const playing = !calm && !paused && inView && !manual;

  // Only run while on screen.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % DEMO_STEPS.length), STEP_MS);
    return () => window.clearTimeout(t);
  }, [playing, index]);

  // A manual pick holds its step for a while, then the loop resumes.
  React.useEffect(() => {
    if (!manual) return;
    const t = window.setTimeout(() => setManual(false), STEP_MS * 2);
    return () => window.clearTimeout(t);
  }, [manual, index]);

  const step = DEMO_STEPS[index];
  const caption = useTyped(step.caption, !calm);

  return (
    <div
      ref={rootRef}
      className={cn("mk-demo", className)}
      data-playing={playing ? "" : undefined}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="mk-browser">
        <div aria-hidden="true" className="mk-browser__bar">
          <span className="mk-browser__dots">
            <span />
            <span />
            <span />
          </span>
          <span className="mk-browser__url">{CAPTURES[step.capture].url}</span>
          <span className="w-[46px]" />
        </div>
        {/* The frames: all four captures stacked, the current one opaque. Each is a real capture. */}
        <div className="mk-demo__stage" role="group" aria-roledescription="product demo" aria-label="What the product looks like, step by step">
          {DEMO_STEPS.map((s, i) => {
            const c = CAPTURES[s.capture];
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={s.id}
                src={c.src}
                alt={c.alt}
                width={c.width}
                height={c.height}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
                decoding="async"
                aria-hidden={i !== index}
                className={cn("mk-demo__frame", i === index && "is-on")}
              />
            );
          })}
          {/* Progress line: fills across the current step while playing. */}
          <span aria-hidden="true" className="mk-demo__progress" key={`${index}-${playing ? "p" : "s"}`} style={{ animationDuration: `${STEP_MS}ms` }} />
        </div>
      </div>

      <div className="mk-demo__bar">
        <p className="mk-demo__caption" aria-live="polite">
          <span className="mk-demo__step">{index + 1}</span>
          <span>{caption}</span>
          {!calm && caption.length < step.caption.length ? <span aria-hidden="true" className="mk-demo__caret" /> : null}
        </p>
        <div className="mk-demo__dots" role="tablist" aria-label="Demo steps">
          {DEMO_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${i + 1}. ${s.label}`}
              title={s.label}
              onClick={() => {
                setIndex(i);
                setManual(true);
              }}
              className={cn("mk-demo__dot", i === index && "is-on")}
            >
              <span className="mk-demo__dot-label">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
