"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  state: "idle" | "loading" | "success";
  successLabel?: string;
  loadingLabel?: string;
  successDuration?: number;
};

/**
 * M13 tier 3 commit button (rendered by <Button state>). The idle label stays in flow,
 * so the width is locked to it; spinner and success layers cross-fade over it.
 * The accessible name is always the idle label; a sibling polite live region
 * announces "loading" and "success" text.
 */
export const StatefulButton = React.forwardRef<HTMLButtonElement, Props>(function StatefulButton(
  { state, successLabel = "Done", loadingLabel, successDuration, disabled, className, children, onClick, ...props },
  ref,
) {
  const [expired, setExpired] = React.useState(false);
  const [prevState, setPrevState] = React.useState(state);
  // A new state starts a fresh success hold (derived-state pattern, no effect needed).
  if (prevState !== state) {
    setPrevState(state);
    setExpired(false);
  }

  React.useEffect(() => {
    if (state !== "success" || !successDuration) return;
    const id = window.setTimeout(() => setExpired(true), successDuration);
    return () => clearTimeout(id);
  }, [state, successDuration]);

  const shown = state === "success" && expired ? "idle" : state;
  const busy = shown !== "idle";
  const label = typeof children === "string" ? children : undefined;
  const message = shown === "loading" ? loadingLabel ?? (label ? `${label}…` : "Working…") : shown === "success" ? successLabel : "";

  return (
    <>
      <button
        ref={ref}
        data-state={shown}
        aria-busy={shown === "loading" || undefined}
        disabled={disabled || shown === "loading"}
        onClick={(e) => {
          if (busy) {
            e.preventDefault();
            return;
          }
          onClick?.(e);
        }}
        className={cn(className, "overflow-hidden")}
        {...props}
      >
        <span className={cn("inline-flex items-center justify-center gap-[inherit] transition-[opacity,transform] duration-200 ease-out", busy && "-translate-y-1 opacity-0")}>{children}</span>
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center gap-2 px-3 transition-[opacity,transform] duration-200 ease-out",
            shown === "loading" ? "opacity-100" : "translate-y-1 opacity-0",
          )}
        >
          <svg viewBox="0 0 16 16" className="size-4 shrink-0 animate-spin">
            <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.75" />
            <path d="M8 1.75a6.25 6.25 0 0 1 6.25 6.25" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          {loadingLabel ? <span className="truncate">{loadingLabel}</span> : null}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center gap-2 px-3 transition-[opacity,transform] duration-200 ease-out",
            shown === "success" ? "opacity-100" : "translate-y-1 opacity-0",
          )}
        >
          {shown === "success" ? (
            <svg viewBox="0 0 16 16" className="check-draw size-4 shrink-0">
              <path d="M3.5 8.5 6.6 11.5 12.5 5" pathLength={1} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
          <span className="truncate">{successLabel}</span>
        </span>
      </button>
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </>
  );
});
