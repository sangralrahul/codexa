"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useScript } from "./use-script";

export type TerminalLine = { text: string; tone?: "cmd" | "ok" | "muted" | "error" | "plain" };

// No timings: nothing here claims a speed (PLAN §1).
const DEFAULT_LINES: TerminalLine[] = [
  { text: "$ npm run dev", tone: "cmd" },
  { text: "> vite --host 0.0.0.0", tone: "muted" },
  { text: "VITE ready", tone: "ok" },
  { text: "➜  Preview: your-app.preview.example.com", tone: "plain" },
  { text: "GET / 200", tone: "ok" },
  { text: "GET /src/main.tsx 200", tone: "muted" },
];

const TONE: Record<NonNullable<TerminalLine["tone"]>, string> = {
  cmd: "text-code-fg",
  // Code surfaces are dark in both themes: use the syntax tokens, not the theme status colours.
  ok: "text-syn-string",
  muted: "text-code-muted",
  error: "text-syn-tag",
  plain: "text-code-fg/80",
};

/**
 * Sandbox terminal: lines stream in one by one (dark code surface in both themes).
 * Final frame on the server and when calm. Sample output, no timings.
 */
export function TerminalStream({ playing, className, lines = DEFAULT_LINES, title = "Terminal" }: { playing?: boolean; className?: string; lines?: TerminalLine[]; title?: string }) {
  const schedule = React.useMemo(() => lines.map((_, i) => 250 + i * 520), [lines]);
  const { ref, index, done, started, calm } = useScript(schedule, 250 + lines.length * 520 + 300, playing);
  return (
    <div ref={ref} aria-hidden="true" className={cn("w-full min-w-0 overflow-hidden rounded-xl border border-code-border bg-code-bg shadow-sm [contain:inline-size]", className)}>
      <div className="flex items-center gap-2 border-b border-code-border px-3 py-2 text-[11px] text-code-muted">
        <span className="font-medium text-code-fg/80">{title}</span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", done ? "bg-syn-string" : "bg-signal")} />
          {done ? "running" : "starting"}
        </span>
      </div>
      <div className="min-h-[9.5rem] space-y-0.5 px-3 py-2.5 font-mono text-[12px] leading-[1.7]">
        {lines.map((l, i) =>
          index >= i ? (
            <p key={i} className={cn("whitespace-pre-wrap break-all", started && !calm && "code-line-in", TONE[l.tone ?? "plain"])}>
              {l.text}
              {i === index && !done && started ? <span className="caret" /> : null}
            </p>
          ) : null,
        )}
      </div>
    </div>
  );
}
