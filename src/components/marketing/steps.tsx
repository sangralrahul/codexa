import type { Step } from "@/content/marketing/types";
import { Inline } from "./inline";
import { cn } from "@/lib/utils";

/** Reveal-once hook: MotionEffects adds `.is-visible` the first time this is in view, without hiding it first. */
const ONCE = { "data-split": "", "data-play": "view" } as const;

/**
 * Steps as a film strip: numbered frames on one rail; when the strip first comes into view the
 * frames rise in order and a single light sweeps across it once. `vertical` stacks the frames.
 * Each title keeps a screen-reader "Step N:" prefix.
 */
export function Steps({ steps, className, orientation = "horizontal" }: { steps: Step[]; className?: string; orientation?: "horizontal" | "vertical" }) {
  const horizontal = orientation === "horizontal";
  const cols = steps.length >= 5 ? "lg:grid-cols-5" : steps.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return (
    <div {...ONCE} className={cn("mk-strip relative", className)}>
      <ol className={cn("relative grid gap-3", horizontal ? cn("sm:grid-cols-2", cols) : "max-w-2xl grid-cols-1")}>
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="mk-frame group relative flex flex-col overflow-hidden rounded-[16px] border border-border bg-card/80 p-5 shadow-[inset_0_1px_0_var(--hairline)] transition-[border-color,box-shadow] duration-300 hover:border-border-strong hover:shadow-[inset_0_1px_0_var(--hairline),var(--shadow-md)] focus-within:border-border-strong"
            style={{ "--i": i } as React.CSSProperties}
          >
            {/* Sprocket rail: the frame's place on the strip. */}
            <span aria-hidden="true" className="mb-6 flex items-center gap-2">
              <span className="font-mono text-[11px] font-medium tabular-nums text-signal-ink">{String(i + 1).padStart(2, "0")}</span>
              <span className="h-px flex-1 bg-gradient-to-r from-border-strong to-transparent" />
              <span className="flex gap-1">
                <span className="size-1 rounded-full bg-border-strong" />
                <span className="size-1 rounded-full bg-border-strong" />
              </span>
            </span>
            <h3 className="text-[17px] font-semibold leading-snug tracking-[-0.015em]">
              <span className="sr-only">Step {i + 1}: </span>
              {s.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              <Inline text={s.description} />
            </p>
          </li>
        ))}
      </ol>
      <span aria-hidden="true" className="mk-strip__sweep" />
    </div>
  );
}
