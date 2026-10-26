import * as React from "react";
import { cn } from "@/lib/utils";

export type StepState = "pending" | "active" | "done" | "error";

/** Status glyph for a step: hollow ring, spinner, drawn check or cross. Decorative (aria-hidden). */
export function StepIcon({ state, className }: { state: StepState; className?: string }) {
  if (state === "active") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" className={cn("step-row__spin size-4 shrink-0 text-signal", className)}>
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.5" />
        <path d="M8 1.75a6.25 6.25 0 0 1 6.25 6.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (state === "done") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" className={cn("check-draw size-4 shrink-0 text-success", className)}>
        <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.14" />
        <path d="M5 8.25 7.1 10.3 11 6" pathLength={1} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (state === "error") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" className={cn("size-4 shrink-0 text-danger", className)}>
        <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.14" />
        <path d="M5.75 5.75l4.5 4.5M10.25 5.75l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={cn("size-4 shrink-0 text-border-strong", className)}>
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.5 2.5" />
    </svg>
  );
}

/**
 * M8 agent tick row. Enters with a 6px rise; the spinner becomes a drawn check;
 * errors tint danger and shake twice. `connector` draws the rail to the next row.
 * Presentational (server-safe). Wrap a list of rows in <ol>/<ul>.
 */
export function StepRow({
  state,
  label,
  detail,
  connector = false,
  as: Tag = "li",
  mono = false,
  className,
}: {
  state: StepState;
  label: React.ReactNode;
  detail?: React.ReactNode;
  /** Draws a rail from this row's icon to the next row. */
  connector?: boolean;
  as?: "li" | "div";
  /** Set the label in Geist Mono (tool calls, paths). */
  mono?: boolean;
  className?: string;
}) {
  return (
    <Tag data-state={state} className={cn("step-row flex items-start gap-2.5 py-1 text-[13px] leading-5", className)}>
      <span className="relative mt-0.5 flex shrink-0 flex-col items-center self-stretch">
        <StepIcon state={state} />
        {connector ? (
          <span
            aria-hidden="true"
            className={cn("step-row__connector absolute left-1/2 top-[18px] -bottom-1.5 w-px -translate-x-1/2", state === "done" ? "bg-success/35" : "bg-border")}
          />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate",
            mono && "font-mono text-[12px]",
            state === "pending" && "text-muted-foreground",
            state === "active" && "text-foreground",
            state === "done" && "text-foreground/80",
            state === "error" && "text-danger",
          )}
        >
          {label}
        </span>
        {detail ? <span className={cn("mt-0.5 block font-mono text-[11.5px] leading-4", state === "error" ? "text-danger/85" : "text-muted-foreground")}>{detail}</span> : null}
      </span>
    </Tag>
  );
}
