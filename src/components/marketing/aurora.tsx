"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Grid trails: [axis, grid line index from centre, duration s, delay s]. Lines sit every 64px.
const TRAILS: [("x" | "y"), number, number, number][] = [
  ["y", -7, 7, 0],
  ["y", 4, 9, 2.5],
  ["y", -2, 8, 5],
  ["y", 9, 10, 1.2],
  ["x", 3, 9, 0.8],
  ["x", 6, 11, 4],
  ["x", 1, 12, 7],
];

/**
 * Hero light scene: a drifting colour mesh, slow light rays, a blueprint grid with light
 * trails running along its lines, twinkling dust and a glow that follows the pointer.
 * Pure CSS animation (transform/opacity only); calm mode freezes it on a still frame.
 * Place as the first child of a `relative isolate` section; it never takes pointer events.
 */
export function Aurora({ className }: { className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host || !window.matchMedia("(pointer: fine)").matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--ax", `${(x - r.left).toFixed(0)}px`);
      el.style.setProperty("--ay", `${(y - r.top).toFixed(0)}px`);
      el.dataset.pointer = "on";
    };
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const leave = () => {
      delete el.dataset.pointer;
    };
    host.addEventListener("pointermove", move, { passive: true });
    host.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className={cn("aurora", className)}>
      <div className="aurora__mesh">
        <span className="aurora__blob aurora__blob--1" />
        <span className="aurora__blob aurora__blob--2" />
        <span className="aurora__blob aurora__blob--3" />
        <span className="aurora__blob aurora__blob--4" />
      </div>
      <div className="aurora__rays" />
      <div className="aurora__grid">
        {TRAILS.map(([axis, line, dur, delay], i) => (
          <span
            key={i}
            className={axis === "y" ? "aurora__trail aurora__trail--down" : "aurora__trail aurora__trail--across"}
            style={{ "--line": line, "--dur": `${dur}s`, "--delay": `${delay}s` } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="aurora__dust" />
      <div className="aurora__dust aurora__dust--2" />
      <div className="aurora__glow" />
      <div className="aurora__fade" />
      <div className="bg-noise absolute inset-0" />
    </div>
  );
}
