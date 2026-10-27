"use client";

import * as React from "react";
import { AlertTriangle, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { tokenize } from "./tokenize";
import { useScript } from "./use-script";

// Short enough to fit the narrowest bento tile next to the Run button.
const DEFAULT_QUERY = "select name, plan from customers;";
const ROWS: [string, string][] = [
  ["Kite Studio", "pro"],
  ["Banyan Foods", "team"],
  ["Chai & Code", "free"],
];
const DESTRUCTIVE = /\b(drop|delete|truncate|alter|update)\b/i;
const COLOR: Record<string, string> = { keyword: "text-syn-keyword", fn: "text-syn-fn", string: "text-syn-string", number: "text-syn-number", comment: "text-syn-comment", punct: "text-code-fg/60", attr: "text-syn-attr" };

/**
 * Database panel: a highlighted SQL line you can edit, ▶ Run, and result rows that stagger in.
 * Typing a destructive statement (drop, delete, truncate, alter, update) shows the confirm chip
 * instead of running — like the real panel. Nothing is executed. Sample data.
 */
export function SqlRunner({ playing, className, query: initial = DEFAULT_QUERY }: { playing?: boolean; className?: string; query?: string }) {
  const { ref, index, started, calm } = useScript([0, 600], 1400, playing);
  const [query, setQuery] = React.useState(initial);
  const [runs, setRuns] = React.useState(0);
  const [confirming, setConfirming] = React.useState(false);
  const id = React.useId();
  const overlay = React.useRef<HTMLDivElement>(null);
  const destructive = DESTRUCTIVE.test(query);
  const tokens = React.useMemo(() => tokenize(query, "sql")[0] ?? [], [query]);
  const showRows = runs > 0 || !started || index >= 1;

  const run = () => {
    if (destructive) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setRuns((n) => n + 1);
  };

  return (
    <div ref={ref} className={cn("flex w-full min-w-0 flex-col gap-2.5 text-[13px] [contain:inline-size]", className)}>
      <div className="overflow-hidden rounded-xl border border-code-border bg-code-bg shadow-sm">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <label htmlFor={id} className="sr-only">
            Sample SQL query (illustration, nothing is executed)
          </label>
          <div className="relative min-w-0 flex-1 font-mono text-[12.5px] leading-7">
            {/* Highlighted copy under a transparent input. */}
            {/* The right edge fades, so a longer (typed) query reads as continuing, not cut off. */}
            <div
              ref={overlay}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre px-1.5 text-code-fg [mask-image:linear-gradient(to_right,black_calc(100%-1.25rem),transparent)]"
            >
              {tokens.map((t, i) => (
                <span key={i} className={COLOR[t.k]}>
                  {t.v}
                </span>
              ))}
            </div>
            <input
              id={id}
              value={query}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => {
                setQuery(e.target.value);
                setConfirming(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") run();
              }}
              onScroll={(e) => {
                if (overlay.current) overlay.current.scrollLeft = e.currentTarget.scrollLeft;
              }}
              className="relative w-full bg-transparent px-1.5 text-transparent caret-signal outline-none selection:bg-signal/30"
            />
          </div>
          <button
            type="button"
            onClick={run}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-code-fg/10 px-2.5 text-[11.5px] font-medium text-code-fg transition-colors hover:bg-code-fg/15"
          >
            <Play className="size-3" fill="currentColor" strokeWidth={0} aria-hidden="true" /> Run
          </button>
        </div>
      </div>
      {destructive ? (
        <div role="status" className="pop-in flex items-start gap-2 rounded-[10px] border border-warning/35 bg-warning/[0.08] px-3 py-2 text-[12px]">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
          <span className="text-foreground/90">
            Destructive statement. Codexa asks you to confirm before running it.
            {confirming ? <span className="text-muted-foreground"> (Not run: this is an illustration.)</span> : null}
          </span>
        </div>
      ) : (
        <div aria-hidden="true" key={runs} className="overflow-hidden rounded-[10px] border border-border bg-card">
          <div className="flex justify-between border-b border-border bg-surface px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
            <span>name</span>
            <span>plan</span>
          </div>
          {ROWS.map(([n, p], i) => (
            <div
              key={n}
              className={cn(
                "flex justify-between border-b border-border px-3 py-1.5 last:border-b-0",
                showRows ? (started && !calm ? "pop-in" : "") : "opacity-0",
              )}
              style={showRows && started ? { animationDelay: `${i * 70}ms` } : undefined}
            >
              <span>{n}</span>
              <span className="text-muted-foreground">{p}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">Sample data · try typing “drop”</p>
    </div>
  );
}
