"use client";

import * as React from "react";
import { useAutoplay } from "@/components/motion/autoplay";
import { useTimeline } from "@/components/motion/timeline";

/**
 * Shared playback for vignettes. Renders the FINAL frame on the server and until the
 * vignette first plays (so it is never blank in screenshots or without JS), then plays the
 * script once from the start. `playing` from the parent wins; otherwise the vignette
 * autoplays while in view. Calm pins the final frame.
 */
export function useScript(scheduleMs: number[], totalMs: number, playingProp?: boolean, { loop = false }: { loop?: boolean } = {}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const auto = useAutoplay(ref, { threshold: 0.35 });
  const calm = auto.calm;
  const playing = (playingProp === undefined ? auto.playing : playingProp) && !calm;
  const [started, setStarted] = React.useState(false);

  React.useEffect(() => {
    if (!playing || started) return;
    const id = requestAnimationFrame(() => setStarted(true));
    return () => cancelAnimationFrame(id);
  }, [playing, started]);

  const { index, restart, seek } = useTimeline(scheduleMs, { playing: playing && started, totalMs, loop, final: calm || !started });
  const last = scheduleMs.length - 1;
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
