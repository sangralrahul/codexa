"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PauseButton, useAutoplay } from "@/components/motion/autoplay";

export type TickerEntry = { title: string; date: string; href: string };

const EVERY_MS = 5000;

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * The latest changelog entries, one at a time (advances every 5s while in view). Hover or focus
 * pauses it; the Pause button stops it for good. Every entry is a real link in the DOM; the
 * focused one is brought into view. Calm: no advancing (the first entry shows).
 */
export function ChangelogTicker({ entries }: { entries: TickerEntry[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const auto = useAutoplay(ref, { threshold: 0.5 });
  const [index, setIndex] = React.useState(0);
  const [hold, setHold] = React.useState(false);
  const running = auto.playing && !hold && entries.length > 1;

  React.useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % entries.length), EVERY_MS);
    return () => clearInterval(t);
  }, [running, entries.length]);

  if (entries.length === 0) return null;
  return (
    <div ref={ref} className="flex min-w-0 items-center gap-3">
      <span className="text-label shrink-0 text-signal-ink">Changelog</span>
      <div
        className="relative h-9 min-w-0 flex-1 overflow-hidden rounded-full border border-border bg-card/70 shadow-[inset_0_1px_0_var(--hairline)] sm:w-[30rem] sm:flex-none"
        onPointerEnter={() => setHold(true)}
        onPointerLeave={() => setHold(false)}
        onFocus={() => setHold(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false);
        }}
      >
        <ul aria-label="Latest changelog entries" className="absolute inset-x-0 top-0 transition-transform duration-(--dur-5) ease-out calm:transition-none" style={{ transform: `translateY(${index * -36}px)` }}>
          {entries.map((e, i) => (
            <li key={e.href} className="h-9">
              <Link
                href={e.href}
                onFocus={() => setIndex(i)}
                className={cn("group/t flex h-9 items-center gap-3 px-4 text-[13px] transition-opacity duration-(--dur-4)", i === index ? "opacity-100" : "opacity-0")}
              >
                <time dateTime={e.date} className="shrink-0 font-mono text-[11.5px] tabular-nums text-muted-foreground">
                  {formatDate(e.date)}
                </time>
                <span className="min-w-0 truncate font-medium text-foreground">{e.title}</span>
                <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform group-hover/t:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {entries.length > 1 ? <PauseButton paused={auto.paused} onToggle={() => auto.setPaused((p) => !p)} label="Pause the changelog ticker" /> : null}
    </div>
  );
}
