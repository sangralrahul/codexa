"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { isCalm } from "@/lib/client/motion";

// Sample rows (labelled "Sample data" on screen).
const ROWS = [
  { name: "Kite Studio", plan: "Pro", mrr: "₹1,499", status: "Active", trend: [3, 4, 4, 6, 7, 9] },
  { name: "Banyan Foods", plan: "Team", mrr: "₹3,999", status: "Active", trend: [6, 5, 7, 7, 8, 8] },
  { name: "Chai & Code", plan: "Free", mrr: "₹0", status: "Trial", trend: [1, 2, 2, 3, 3, 4] },
  { name: "Lotus Labs", plan: "Pro", mrr: "₹1,499", status: "Paused", trend: [5, 4, 4, 3, 2, 2] },
];

function Spark({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 44},${14 - (v / max) * 12}`).join(" ");
  return (
    <svg viewBox="0 0 44 16" className="h-4 w-11 text-signal" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STATUS = { Active: "bg-success/15 text-success", Trial: "bg-info/15 text-info", Paused: "bg-warning/15 text-warning" } as const;

/** Before: the plain table the starter had. After: what the AI run added. Both are sample DOM states. */
function Table({ after }: { after: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-card text-[11.5px]">
      <div className={cn("grid items-center gap-2 border-b border-border bg-surface px-3 py-2 font-mono text-[10.5px] text-muted-foreground", after ? "grid-cols-[1.5rem_minmax(0,1fr)_3rem_3.5rem_2.75rem]" : "grid-cols-[minmax(0,1fr)_3rem_3.5rem]")}>
        {after ? <span /> : null}
        <span>customer</span>
        <span>plan</span>
        <span className="text-right">mrr</span>
        {after ? <span className="text-right">trend</span> : null}
      </div>
      {ROWS.map((r) => (
        <div key={r.name} className={cn("grid items-center gap-2 border-b border-border px-3 py-[7px] last:border-b-0", after ? "grid-cols-[1.5rem_minmax(0,1fr)_3rem_3.5rem_2.75rem]" : "grid-cols-[minmax(0,1fr)_3rem_3.5rem]")}>
          {after ? (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-signal/70 to-signal-2/70 text-[9px] font-semibold text-[var(--ember-ink)]">
              {r.name.charAt(0)}
            </span>
          ) : null}
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-foreground">{r.name}</span>
            {after ? <span className={cn("shrink-0 rounded-full px-1.5 py-px text-[9.5px] font-medium", STATUS[r.status as keyof typeof STATUS])}>{r.status}</span> : null}
          </span>
          <span className="text-muted-foreground">{r.plan}</span>
          <span className="text-right tabular-nums text-foreground/85">{r.mrr}</span>
          {after ? (
            <span className="flex justify-end">
              <Spark data={r.trend} />
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * "Reversible" (PLAN §5.2 H4): a time-travel slider that wipes between the snapshot taken
 * before an AI run and the result. Keyboard operable (it is a native range input);
 * "Restore snapshot" springs back to the snapshot. Sample data, nothing is stored.
 */
export function TimeTravel() {
  const [v, setV] = React.useState(72);
  const raf = React.useRef(0);

  React.useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const springTo = (target: number) => {
    cancelAnimationFrame(raf.current);
    if (isCalm()) {
      setV(target);
      return;
    }
    let x = v;
    let vel = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const force = -170 * (x - target) - 17 * vel;
      vel += force * dt;
      x += vel * dt;
      if (Math.abs(x - target) < 0.3 && Math.abs(vel) < 2) {
        setV(target);
        return;
      }
      setV(Math.max(-3, Math.min(103, x)));
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const pct = Math.max(0, Math.min(100, v));
  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden="true" className="-mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-signal" /> After the AI run
        </span>
        <span>Snapshot</span>
      </div>
      <div aria-hidden="true" className="relative h-[174px] overflow-hidden rounded-xl border border-border shadow-sm">
        <Table after={false} />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
          <Table after />
        </div>
        <span className="absolute inset-y-0 z-[1] w-px bg-signal shadow-[0_0_12px_var(--signal)]" style={{ left: `${pct}%` }}>
          <span className="absolute left-1/2 top-1/2 inline-flex h-7 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-signal/60 bg-card shadow-md">
            <span className="h-3 w-px bg-signal" />
          </span>
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(pct)}
        onChange={(e) => {
          cancelAnimationFrame(raf.current);
          setV(Number(e.target.value));
        }}
        aria-label="Compare before and after the AI run"
        aria-valuetext={`${Math.round(pct)}% of the AI run's result shown`}
        className="h-1.5 w-full cursor-pointer accent-signal"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => springTo(0)}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border-strong bg-background/70 px-3 text-xs font-medium text-foreground shadow-[inset_0_1px_0_var(--hairline)] transition-colors hover:border-foreground/30 hover:bg-muted"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" /> Restore snapshot
        </button>
        <button type="button" onClick={() => springTo(100)} className="inline-flex h-8 items-center rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          Show result
        </button>
        <span className="ml-auto text-[11px] text-muted-foreground">Sample data</span>
      </div>
    </div>
  );
}
