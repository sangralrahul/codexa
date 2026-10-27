"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { isCalm } from "@/lib/client/motion";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * M16 odometer. The server renders the final value (no layout shift, correct
 * without JS) plus an sr-only copy; each digit is a column that rolls 600ms,
 * staggered 40ms from the right.
 * - trigger="view" (marketing): rolls up from 0 the first time it scrolls into view.
 * - trigger="change" (app, prices): rolls whenever `value` changes.
 * Calm: shows the value directly. Set the type size on `className` (the
 * columns inherit it) and use tabular figures (built in).
 */
export function Odometer({
  value,
  format,
  locale = "en-US",
  trigger = "view",
  className,
}: {
  value: number;
  format?: Intl.NumberFormatOptions;
  locale?: string;
  trigger?: "view" | "change";
  className?: string;
}) {
  const formatted = React.useMemo(() => {
    try {
      return new Intl.NumberFormat(locale, format).format(value);
    } catch {
      return String(value);
    }
  }, [value, locale, format]);

  const ref = React.useRef<HTMLSpanElement>(null);
  // "zero" = parked at 0 before the first reveal; "rolling" = transitions on.
  const [phase, setPhase] = React.useState<"idle" | "zero" | "rolling">("idle");

  React.useEffect(() => {
    const el = ref.current;
    if (!el || trigger !== "view" || isCalm()) return;
    let raf = 0;
    let raf2 = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        // Park at zero for one frame, then roll to the value.
        setPhase("zero");
        raf = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => setPhase("rolling"));
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(raf2);
    };
  }, [trigger]);

  React.useEffect(() => {
    if (trigger !== "change" || isCalm()) return;
    const id = requestAnimationFrame(() => setPhase("rolling"));
    return () => cancelAnimationFrame(id);
  }, [trigger]);

  const chars = Array.from(formatted);
  const digitCount = chars.filter((c) => c >= "0" && c <= "9").length;
  let seen = 0;

  return (
    <span ref={ref} className={cn("odometer", className)} data-rolling={phase === "rolling" ? "" : undefined}>
      <span className="sr-only">{formatted}</span>
      <span aria-hidden="true" className="inline-flex items-baseline">
        {chars.map((c, i) => {
          if (c < "0" || c > "9") return <span key={`s${chars.length - i}`}>{c}</span>;
          const fromRight = digitCount - 1 - seen++;
          const d = phase === "zero" ? 0 : Number(c);
          return (
            // Keyed from the right so columns keep their identity when the length changes.
            <span key={`d${fromRight}`} className="odometer__col" style={{ "--d": d, "--o": fromRight } as React.CSSProperties}>
              <span className="odometer__ghost">{c}</span>
              <span className="odometer__strip">
                {DIGITS.map((x) => (
                  <span key={x}>{x}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
