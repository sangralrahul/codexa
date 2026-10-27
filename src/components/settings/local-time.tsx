"use client";

import { useEffect, useState } from "react";
import { timeIn } from "./time";

/**
 * The current time in `tz`, refreshed on each minute boundary (a real clock, not an animation).
 * Rendered on the server for the same zone, so the first paint is already right.
 */
export function LocalTime({ tz, className, seconds = false }: { tz: string; className?: string; seconds?: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const d = new Date();
      setNow(d);
      timer = window.setTimeout(tick, seconds ? 1000 - d.getMilliseconds() : 60_000 - (d.getTime() % 60_000) + 20);
    };
    timer = window.setTimeout(tick, seconds ? 1000 : 60_000 - (Date.now() % 60_000) + 20);
    return () => clearTimeout(timer);
  }, [seconds]);
  return (
    <time dateTime={now.toISOString()} className={className} suppressHydrationWarning>
      {timeIn(tz, now, seconds)}
    </time>
  );
}
