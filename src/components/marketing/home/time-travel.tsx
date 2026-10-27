"use client";

import * as React from "react";
import { ChevronsLeftRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { isCalm } from "@/lib/client/motion";

// Sample rows (labelled "Sample data" on screen). `raw` is how the starter's plain table printed the value.
const ROWS = [
  { name: "Kite Studio", raw: "1499", mrr: "₹1,499", status: "Active", trend: [3, 4, 4, 6, 7, 9] },
  { name: "Banyan Foods", raw: "3999", mrr: "₹3,999", status: "Active", trend: [6, 5, 7, 7, 8, 8] },
  { name: "Chai & Code", raw: "0", mrr: "₹0", status: "Trial", trend: [1, 2, 2, 3, 3, 4] },
  { name: "Lotus Labs", raw: "1499", mrr: "₹1,499", status: "Paused", trend: [5, 4, 4, 3, 2, 2] },
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

/**
 * One column grid for both states, so every cell sits at the same place before and after and the
 * wipe only changes what the run changed. Four columns at every card width (avatar, customer, MRR,
 * trend): the trend sparkline, the clearest difference, is never dropped.
 */
const GRID = "grid grid-cols-[1.25rem_minmax(0,1fr)_3.25rem_2.75rem] items-center gap-1.5 px-2.5 @xs:gap-2 @xs:px-3";
const ROW_H = "h-[34px]";
/** Where the divider rests: half snapshot, half result, so both states read without touching it. */
const REST = 50;

/** The snapshot: the starter's plain table. Grey, raw numbers, no avatars, status or trend. */
function Before() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-muted text-[11.5px]">
      <div className={cn(GRID, "h-8 border-b border-border font-mono text-[10.5px] text-muted-foreground/80")}>
        <span />
        <span>name</span>
        <span className="text-right">mrr</span>
        <span />
      </div>
      {ROWS.map((r) => (
        <div key={r.name} className={cn(GRID, ROW_H, "border-b border-border last:border-b-0")}>
          <span />
          <span className="truncate text-muted-foreground">{r.name}</span>
          <span className="text-right font-mono text-[11px] text-muted-foreground">{r.raw}</span>
          <span />
        </div>
      ))}
    </div>
  );
}

/** After the AI run: avatars, status pills, formatted MRR and a trend sparkline per customer. */
function After() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-card text-[11.5px]">
      <div className={cn(GRID, "h-8 border-b border-border bg-surface text-[10.5px] font-medium text-muted-foreground")}>
        <span />
        <span>Customer</span>
        <span className="text-right">MRR</span>
        <span className="text-right">Trend</span>
      </div>
      {ROWS.map((r) => (
        <div key={r.name} className={cn(GRID, ROW_H, "border-b border-border last:border-b-0")}>
          <span className="flex justify-center">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-signal/70 to-signal-2/70 text-[9px] font-semibold text-[var(--ember-ink)]">
              {r.name.charAt(0)}
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-medium text-foreground">{r.name}</span>
            <span className={cn("shrink-0 rounded-full px-1.5 text-[9.5px] font-medium leading-4", STATUS[r.status as keyof typeof STATUS])}>{r.status}</span>
          </span>
          <span className="text-right font-medium tabular-nums text-foreground">{r.mrr}</span>
          <span className="flex justify-end">
            <Spark data={r.trend} />
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * "Reversible" (PLAN §5.2 H4): a before/after wipe between the result of an AI run (left, signal)
 * and the snapshot taken before it (right, grey). It rests at 50% so both states read untouched,
 * nudges once when it comes into view (not when calm) to show it moves, and the grip sits in the
 * header row so it never covers a number. The native range input is the control (keyboard and
 * touch); a mouse can also drag across the table. "Restore snapshot" springs back to the snapshot.
 * Sample data, nothing is stored.
 */
export function TimeTravel() {
  const [v, setV] = React.useState(REST);
  const raf = React.useRef(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const dragging = React.useRef(false);
  /** Set once the visitor moves it: the in-view nudge never fights a real hand. */
  const touched = React.useRef(false);

  React.useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // One small damped nudge around the rest point when the card first scrolls into view.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let timer = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        if (isCalm() || touched.current) return;
        timer = window.setTimeout(() => {
          if (touched.current) return;
          const t0 = performance.now();
          const step = (now: number) => {
            const t = (now - t0) / 1000;
            if (touched.current) return;
            if (t >= 1.4) {
              setV(REST);
              return;
            }
            setV(REST + 11 * Math.sin((2 * Math.PI * t) / 0.75) * Math.exp(-3 * t));
            raf.current = requestAnimationFrame(step);
          };
          raf.current = requestAnimationFrame(step);
        }, 350);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  const take = () => {
    touched.current = true;
    cancelAnimationFrame(raf.current);
  };

  const springTo = (target: number) => {
    take();
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

  const fromPointer = (clientX: number) => {
    const box = boxRef.current;
    if (!box) return;
    const r = box.getBoundingClientRect();
    setV(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };

  const pct = Math.max(0, Math.min(100, v));
  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <div aria-hidden="true" className="-mb-1 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-signal" /> After the AI run
        </span>
        <span className="inline-flex items-center gap-1.5">
          Snapshot <span className="size-1.5 rounded-full bg-muted-foreground/50" />
        </span>
      </div>
      {/* 32px header + 4 × 34px rows + the 1px border on each side. Mouse and pen can drag across it; touch
          keeps scrolling the card row and uses the slider below. */}
      <div
        ref={boxRef}
        aria-hidden="true"
        onPointerDown={(e) => {
          if (e.pointerType === "touch" || e.button !== 0) return;
          take();
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) fromPointer(e.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        className="@container relative h-[170px] select-none overflow-hidden rounded-xl border border-border shadow-sm [@media(pointer:fine)]:cursor-ew-resize"
      >
        <Before />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
          <After />
        </div>
        <span className="pointer-events-none absolute inset-y-0 z-[1] w-px -translate-x-1/2 bg-signal shadow-[0_0_12px_var(--signal)]" style={{ left: `${pct}%` }} />
        {/* The grip rides in the header row (centred on its 32px), clamped so it never leaves the card. */}
        <span
          className="pointer-events-none absolute top-4 z-[2] inline-flex h-5 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-signal/60 bg-card text-signal shadow-md"
          style={{ left: `clamp(16px, ${pct}%, calc(100% - 16px))` }}
        >
          <ChevronsLeftRight className="size-3" />
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(pct)}
        onChange={(e) => {
          take();
          setV(Number(e.target.value));
        }}
        aria-label="Compare the AI run's result with the snapshot taken before it"
        aria-valuetext={`${Math.round(pct)}% of the AI run's result shown, the rest is the snapshot`}
        className="h-1.5 w-full cursor-pointer accent-signal"
      />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
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
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <ChevronsLeftRight className="size-3" aria-hidden="true" />
          Drag to compare · Sample data
        </span>
      </div>
    </div>
  );
}
