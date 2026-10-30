import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Usage meter: label, "used / max" and a bar (role=progressbar with value attributes).
 * Warning tone from `warnAt` (default 0.7), danger from `dangerAt` (default 0.9) of max.
 * `unlimited` shows "Unlimited" with no bar fill. `neutral` keeps capacity (seats, projects)
 * from ever turning red. The fill grows with a transform (no layout animation).
 */
export function Meter({
  value,
  max,
  label,
  unlimited = false,
  warnAt = 0.7,
  dangerAt = 0.9,
  neutral = false,
  size = "md",
  format = (n: number) => n.toLocaleString("en-US"),
  hint,
  className,
}: {
  value: number;
  max: number;
  label: React.ReactNode;
  unlimited?: boolean;
  warnAt?: number;
  dangerAt?: number;
  neutral?: boolean;
  size?: "sm" | "md";
  format?: (n: number) => string;
  /** Muted line under the bar (e.g. "Resets Nov 1"). */
  hint?: React.ReactNode;
  className?: string;
}) {
  const ratio = unlimited || max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  // The fill is the brand gradient (thin gradient progress bars everywhere); warning and danger keep their colour.
  const tone = ratio >= dangerAt && !neutral ? "bg-danger" : ratio >= warnAt && !neutral ? "bg-warning" : "bg-primary";
  const labelText = typeof label === "string" ? label : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className={cn("flex items-baseline justify-between gap-3", size === "sm" ? "text-xs" : "text-[13px]")}>
        <span className="min-w-0 truncate font-medium text-foreground">{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {unlimited ? (
            <>
              {format(value)} <span className="text-foreground/70">· Unlimited</span>
            </>
          ) : (
            <>
              <span className={cn(!neutral && ratio >= dangerAt ? "text-danger" : !neutral && ratio >= warnAt ? "text-warning" : "text-foreground")}>{format(value)}</span> / {format(max)}
            </>
          )}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={labelText}
        aria-valuemin={0}
        aria-valuemax={unlimited ? undefined : max}
        aria-valuenow={unlimited ? undefined : Math.min(value, max)}
        aria-valuetext={unlimited ? `${format(value)} used, unlimited` : `${format(value)} of ${format(max)}`}
        className={cn("relative overflow-hidden rounded-full bg-foreground/[0.06]", size === "sm" ? "h-1.5" : "h-2")}
      >
        <span
          className={cn("absolute inset-y-0 left-0 w-full origin-left rounded-full transition-transform duration-[600ms] ease-out calm:transition-none", tone, unlimited && "opacity-25")}
          style={{ transform: `scaleX(${unlimited ? 1 : ratio})` }}
        />
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
