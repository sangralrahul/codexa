"use client";

import * as React from "react";
import { useCalm } from "@/lib/client/motion";

function indexAt(schedule: number[], t: number) {
  let idx = -1;
  for (let i = 0; i < schedule.length; i++) if (schedule[i] <= t) idx = i;
  return idx;
}

function nextCue(schedule: number[], t: number) {
  for (const s of schedule) if (s > t) return s;
  return Infinity;
}

/**
 * Script clock for scripted replays. `scheduleMs` lists cue start times (ascending);
 * `index` is the latest cue reached (-1 before the first). Time only advances while
 * `playing`; it re-renders only when a cue is crossed (timeouts, no rAF).
 * `loop` restarts after `totalMs`. `final` pins the last cue (use it when calm or
 * for SSR posters).
 *
 * @example const { index } = useTimeline([0, 800, 1600], { playing, totalMs: 3000 });
 */
export function useTimeline(
  scheduleMs: number[],
  { playing, loop = false, totalMs, final = false }: { playing: boolean; loop?: boolean; totalMs: number; final?: boolean },
) {
  const last = scheduleMs.length - 1;
  const key = scheduleMs.join(",");
  const elapsed = React.useRef(0);
  const [index, setIndex] = React.useState(() => (final ? last : indexAt(scheduleMs, 0)));
  const [epoch, setEpoch] = React.useState(0);

  React.useEffect(() => {
    const schedule = key ? key.split(",").map(Number) : [];
    if (final) {
      const id = requestAnimationFrame(() => setIndex(schedule.length - 1));
      return () => cancelAnimationFrame(id);
    }
    if (!playing) return;
    let start = performance.now() - elapsed.current;
    let timer = 0;
    const tick = () => {
      const now = performance.now();
      let t = now - start;
      if (t >= totalMs) {
        if (loop) {
          start = now;
          t = 0;
        } else {
          elapsed.current = totalMs;
          setIndex(indexAt(schedule, totalMs));
          return;
        }
      }
      elapsed.current = t;
      setIndex(indexAt(schedule, t));
      const next = Math.min(nextCue(schedule, t), totalMs);
      timer = window.setTimeout(tick, Math.max(16, next - t));
    };
    timer = window.setTimeout(tick, 0);
    return () => {
      clearTimeout(timer);
      const t = performance.now() - start;
      elapsed.current = loop ? t % Math.max(1, totalMs) : Math.min(totalMs, t);
    };
  }, [playing, loop, totalMs, final, key, epoch]);

  const seek = React.useCallback(
    (i: number) => {
      const schedule = key ? key.split(",").map(Number) : [];
      const c = Math.max(0, Math.min(schedule.length - 1, i));
      elapsed.current = schedule[c] ?? 0;
      setIndex(c);
      setEpoch((e) => e + 1);
    },
    [key],
  );

  const restart = React.useCallback(() => {
    const schedule = key ? key.split(",").map(Number) : [];
    elapsed.current = 0;
    setIndex(indexAt(schedule, 0));
    setEpoch((e) => e + 1);
  }, [key]);

  return { index, seek, restart };
}

/** Seeded PRNG so typing jitter is identical on every run (and in tests). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Cumulative appearance time (ms) of each character: ~1000/cps ±8ms, +300ms after punctuation. */
function typingTimes(text: string, cps: number, startDelayMs: number) {
  const rand = mulberry32(hash(text));
  const base = 1000 / Math.max(1, cps);
  const out = new Array<number>(text.length);
  let t = startDelayMs;
  for (let i = 0; i < text.length; i++) {
    t += base + (rand() * 16 - 8);
    out[i] = t;
    if (/[.,!?;:]/.test(text[i]) && text[i + 1] === " ") t += 300;
  }
  return out;
}

/**
 * M6 type stream: returns the visible prefix of `text`. Advances only while `playing`,
 * re-renders at most ~30 times a second, restarts when `text` changes.
 * Calm (or `complete`) returns the full text.
 */
export function useTypewriter(
  text: string,
  {
    playing,
    cps = 42,
    startDelayMs = 0,
    complete = false,
    restartKey = 0,
  }: { playing: boolean; cps?: number; startDelayMs?: number; complete?: boolean; /** Change it to type the same text again from the start. */ restartKey?: string | number },
): string {
  const calm = useCalm();
  const [state, setState] = React.useState({ text, key: restartKey, n: 0 });
  const elapsed = React.useRef(0);
  const n = state.text === text && state.key === restartKey ? state.n : 0;

  React.useEffect(() => {
    elapsed.current = 0;
  }, [text, restartKey]);

  React.useEffect(() => {
    if (calm || complete || !playing || !text) return;
    const times = typingTimes(text, cps, startDelayMs);
    const start = performance.now() - elapsed.current;
    let timer = 0;
    let shown = -1;
    const tick = () => {
      const t = performance.now() - start;
      elapsed.current = t;
      let k = 0;
      while (k < times.length && times[k] <= t) k++;
      if (k !== shown) {
        shown = k;
        setState({ text, key: restartKey, n: k });
      }
      if (k < times.length) timer = window.setTimeout(tick, 33);
    };
    timer = window.setTimeout(tick, 0);
    return () => clearTimeout(timer);
  }, [text, restartKey, playing, cps, startDelayMs, calm, complete]);

  if (calm || complete) return text;
  return text.slice(0, n);
}
