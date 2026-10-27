"use client";

import * as React from "react";
import { useAutoplay } from "@/components/motion/autoplay";
import { useTimeline } from "@/components/motion/timeline";

/**
 * Shared playback for vignettes. Renders the FINAL frame on the server and until the
 * vignette first plays (so it is never blank in screenshots or without JS), then plays the
 * script once from the start. `playing` from the parent wins; otherwise the vignette
 * autoplays while in view. Calm pins the final frame.
 *
 * A script that leaves the viewport before it ends snaps to its final frame instead of
 * pausing, so a visitor who scrolls fast (or comes back up) never finds a half-typed,
 * half-empty tile. It does not replay on its own after that; `restart()` ("Run again") does.
 */
export function useScript(scheduleMs: number[], totalMs: number, playingProp?: boolean, { loop = false }: { loop?: boolean } = {}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const auto = useAutoplay(ref, { threshold: 0.35 });
  const calm = auto.calm;
  const playing = (playingProp === undefined ? auto.playing : playingProp) && !calm;
  const [started, setStarted] = React.useState(false);
  // Latched when a started script leaves the viewport: show the final frame from then on.
  const [finished, setFinished] = React.useState(false);
  const inView = auto.inView;

  React.useEffect(() => {
    if (!playing || started) return;
    const id = requestAnimationFrame(() => setStarted(true));
    return () => cancelAnimationFrame(id);
  }, [playing, started]);

  const timeline = useTimeline(scheduleMs, { playing: playing && started && !finished, totalMs, loop, final: calm || !started || finished });
  const { index } = timeline;
  const last = scheduleMs.length - 1;

  React.useEffect(() => {
    if (!started || finished || inView || loop || index >= last) return;
    const id = requestAnimationFrame(() => setFinished(true));
    return () => cancelAnimationFrame(id);
  }, [started, finished, inView, loop, index, last]);

  const { restart: restartTimeline, seek: seekTimeline } = timeline;
  /** Replay from the first cue ("Run again"). */
  const restart = React.useCallback(() => {
    setFinished(false);
    restartTimeline();
  }, [restartTimeline]);
  const seek = React.useCallback(
    (i: number) => {
      setFinished(false);
      seekTimeline(i);
    },
    [seekTimeline],
  );
  return {
    ref,
    /** Current cue (−1 before the first cue). */
    index,
    /** Cue reached? (use for "this row is visible"). */
    at: (cue: number) => index >= cue,
    done: index >= last,
    playing,
    calm,
    started,
    restart,
    seek,
  };
}
