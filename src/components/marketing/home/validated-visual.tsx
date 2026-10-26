"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { StepRow, type StepState } from "@/components/vignettes/step-row";
import { useScript } from "@/components/vignettes/use-script";

const STEPS = [
  { label: "typecheck", detail: "0 errors" },
  { label: "build", detail: "built" },
  { label: "preview", detail: "dev server ready" },
];
const R = 30;
const C = 2 * Math.PI * R;

/**
 * "Validated" (PLAN §5.2 H4): a check ring fills to green while the checks tick through
 * typecheck → build → preview. Plays once in view; final frame on the server and when calm.
 */
export function ValidatedVisual({ repairWord }: { repairWord: string }) {
  // Cue i (i < 3): check i is running and the earlier ones are done; cue 3: all done.
  const { ref, index, started } = useScript([0, 550, 1150, 1750], 2200);
  const doneCount = started ? Math.max(0, Math.min(STEPS.length, index)) : STEPS.length;
  const state = (i: number): StepState => (i < doneCount ? "done" : i === doneCount && started && index >= 0 ? "active" : "pending");
  const progress = doneCount / STEPS.length;
  return (
    <div ref={ref} aria-hidden="true" className="flex items-center gap-5">
      <div className="relative size-[84px] shrink-0">
        <svg viewBox="0 0 72 72" className="size-full -rotate-90">
          <circle cx="36" cy="36" r={R} fill="none" stroke="var(--border)" strokeWidth="5" />
          <circle
            cx="36"
            cy="36"
            r={R}
            fill="none"
            stroke={progress === 1 ? "var(--success)" : "var(--signal)"}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            className="ring-fill transition-[stroke] duration-(--dur-4)"
          />
        </svg>
        <span className={cn("absolute inset-0 flex flex-col items-center justify-center text-center leading-none transition-colors", progress === 1 ? "text-success" : "text-foreground")}>
          <span className="font-display text-[22px] font-semibold tabular-nums">
            {doneCount}/{STEPS.length}
          </span>
          <span className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">checks</span>
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <ol>
          {STEPS.map((s, i) => (
            <StepRow key={s.label} state={state(i)} mono connector={i < STEPS.length - 1} label={s.label} detail={state(i) === "done" ? s.detail : undefined} />
          ))}
        </ol>
        <p className="mt-1.5 text-[11px] text-muted-foreground">Repairs, if needed: at most {repairWord}</p>
      </div>
    </div>
  );
}
