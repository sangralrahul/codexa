import { cn } from "@/lib/utils";

export const OB_STEPS = ["Idea", "Start", "Launch"] as const;

/**
 * Labelled segmented progress "Idea · Start · Launch" (PLAN §5.5). The current step carries
 * aria-current="step"; finished steps get a check. Segments fill with a 600ms transform.
 */
export function OnboardingProgress({ current, className }: { current: number; className?: string }) {
  return (
    <ol aria-label="Setup progress" className={cn("flex w-full items-start gap-2", className)}>
      {OB_STEPS.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "next";
        return (
          <li key={label} data-state={state} aria-current={state === "current" ? "step" : undefined} className="ob-seg flex min-w-0 flex-1 flex-col gap-2">
            <span className={cn("flex items-center gap-1.5 text-[12px] font-medium transition-colors duration-200", state === "next" ? "text-muted-foreground" : "text-foreground")}>
              {state === "done" ? (
                <svg viewBox="0 0 16 16" aria-hidden="true" className="ob-seg__check size-3.5 shrink-0 text-success">
                  <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.16" />
                  <path d="M5 8.25 7.1 10.3 11 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-3.5 shrink-0 items-center justify-center rounded-full text-[9px] tabular-nums leading-none",
                    state === "current" ? "bg-signal text-background" : "shadow-[inset_0_0_0_1px_var(--border-strong)] text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
              )}
              {label}
              <span className="sr-only">{state === "done" ? " (done)" : state === "current" ? " (current step)" : ""}</span>
            </span>
            <span aria-hidden="true" className="relative h-1 overflow-hidden rounded-full bg-foreground/10">
              <span className={cn("ob-seg__fill absolute inset-0 rounded-full", state === "done" ? "bg-foreground/70" : "bg-signal")} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
