"use client";

import * as React from "react";
import { CHAPTER_END, CHAPTER_START, CHAPTERS, LAST_CUE, SCHEDULE } from "./script";

/**
 * "Scroll picks the chapter, time plays it" (PLAN §3.3 M5).
 *
 * - Before the stage is first seen (and with JS off) it shows the poster: the finished story.
 * - The first time it is in view and motion is allowed, it cuts to the start of the current
 *   chapter and plays it.
 * - Moving forward plays the new chapter from its start (earlier chapters stay finished);
 *   moving back, pausing or calm shows the chapter's finished frame.
 * - Unpinned (below lg) the chapters advance on their own after a short hold, once.
 *
 * Timing uses timeouts between cues (no rAF), so the stage re-renders only when a cue is crossed.
 */

type Run = { from: number; to: number; play: boolean; key: number };

const FINAL: Run = { from: LAST_CUE, to: LAST_CUE, play: false, key: 0 };
const HOLD_MS = 1500;

function playRun(step: number, key: number): Run {
  return { from: CHAPTER_START[step], to: CHAPTER_END[step], play: true, key };
}
function finishedRun(step: number, key: number): Run {
  return { from: CHAPTER_END[step], to: CHAPTER_END[step], play: false, key };
}

/** Advances through SCHEDULE[run.from..run.to] while `live`; resumes where it paused. */
function useCueClock(run: Run, live: boolean) {
  const [state, setState] = React.useState({ key: run.key, index: run.from });
  const elapsed = React.useRef(0);
  const index = state.key === run.key ? state.index : run.from;

  React.useEffect(() => {
    elapsed.current = 0;
  }, [run.key]);

  React.useEffect(() => {
    if (!run.play || !live) return;
    const base = SCHEDULE[run.from];
    const start = performance.now() - elapsed.current;
    let timer = 0;
    const tick = () => {
      const t = performance.now() - start;
      elapsed.current = t;
      let i = run.from;
      while (i < run.to && SCHEDULE[i + 1] <= base + t) i++;
      setState((s) => (s.key === run.key && s.index === i ? s : { key: run.key, index: i }));
      if (i >= run.to) return;
      timer = window.setTimeout(tick, Math.max(12, SCHEDULE[i + 1] - (base + t)));
    };
    timer = window.setTimeout(tick, 0);
    return () => clearTimeout(timer);
  }, [run, live]);

  return index;
}

export function useStoryClock({
  step,
  pinned,
  live,
  calm,
  setStep,
  replaySignal,
}: {
  step: number;
  pinned: boolean;
  /** In view, tab visible, not paused, not calm. */
  live: boolean;
  calm: boolean;
  setStep: (i: number) => void;
  /** Changes when the current chapter should replay (e.g. a chip switched the scenario). */
  replaySignal: number;
}) {
  const [run, setRun] = React.useState<Run>(FINAL);
  const [poster, setPoster] = React.useState(true);
  const [prevStep, setPrevStep] = React.useState(step);
  const [prevSignal, setPrevSignal] = React.useState(replaySignal);
  const [pendingPlay, setPendingPlay] = React.useState<number | null>(null);
  const [autoDone, setAutoDone] = React.useState(false);

  // First view: cut from the poster to the start of the current chapter and play it.
  if (poster && live) {
    setPoster(false);
    setRun(playRun(step, run.key + 1));
  }

  // Chapter changed (scroll, tab, auto-advance).
  if (step !== prevStep) {
    const forward = step > prevStep;
    setPrevStep(step);
    setPoster(false);
    if (pendingPlay === step || (forward && live)) {
      setPendingPlay(null);
      setRun(playRun(step, run.key + 1));
    } else {
      setRun(finishedRun(step, run.key + 1));
    }
  }

  // Scenario switched by a chip: replay this chapter (or just show it finished when not live).
  if (replaySignal !== prevSignal) {
    setPrevSignal(replaySignal);
    if (!poster) setRun(live ? playRun(step, run.key + 1) : finishedRun(step, run.key + 1));
  }

  const index = useCueClock(run, live);
  const segmentDone = index >= run.to;
  const playing = run.play && live && !segmentDone;

  // Unpinned and in motion: hold on the finished chapter, then advance (once through the story).
  React.useEffect(() => {
    if (pinned || calm || !live || !run.play || !segmentDone || autoDone) return;
    const t = window.setTimeout(() => {
      if (step < CHAPTERS - 1) setStep(step + 1);
      else setAutoDone(true);
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [pinned, calm, live, run.play, segmentDone, autoDone, step, setStep]);

  const replay = React.useCallback(() => {
    setAutoDone(false);
    setPoster(false);
    if (step === 0) {
      setRun((r) => playRun(0, r.key + 1));
      return;
    }
    // Play chapter one when the scene gets there (pinned: after the scroll; unpinned: next render).
    setPendingPlay(0);
    setStep(0);
  }, [step, setStep]);

  return {
    index,
    poster,
    playing,
    segmentDone,
    /** The chapter the rail and captions show (the poster is the end of the story). */
    shownStep: poster ? CHAPTERS - 1 : step,
    runKey: run.key,
    replay,
  };
}
