"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Segmented } from "@/components/ui/segmented";
import { buttonClasses } from "@/components/ui/button";
import type { UsageDay } from "@/lib/services/usage-history";

type MetricKey = "ai" | "minutes" | "deploys";
const METRICS: { key: MetricKey; label: string; noun: string; unit: (n: number) => string; empty: string; cta?: { href: string; label: string } }[] = [
  { key: "ai", label: "AI requests", noun: "AI requests", unit: (n) => `${n.toLocaleString("en-US")} AI request${n === 1 ? "" : "s"}`, empty: "No AI requests yet this period", cta: { href: "/new-project", label: "Start a project" } },
  { key: "minutes", label: "Preview minutes", noun: "preview minutes", unit: (n) => `${n.toLocaleString("en-US")} preview minute${n === 1 ? "" : "s"}`, empty: "No preview runtime yet this period", cta: { href: "/projects", label: "Open a project" } },
  { key: "deploys", label: "Deployments", noun: "deployments", unit: (n) => `${n.toLocaleString("en-US")} deployment${n === 1 ? "" : "s"}`, empty: "No deployments yet this period", cta: { href: "/projects", label: "Open a project" } },
];

const dayLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** A rounded "nice" maximum for the y axis (1, 2, 5 × 10^n). */
function niceMax(n: number) {
  if (n <= 4) return Math.max(1, n);
  const p = 10 ** Math.floor(Math.log10(n));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= n) return m * p;
  return n;
}

/**
 * Daily histogram of real usage_events for this billing period (UTC days). Days after today are
 * drawn as empty slots so the period's length is visible; a metric with no events shows an explicit
 * empty state, never a curve. Keyboard: focus the chart and use ←/→ to read each day (announced).
 */
export function UsageHistogram({ days, periodDays, totals }: { days: UsageDay[]; periodDays: number; totals: Record<MetricKey | "tokens", number> }) {
  const [metric, setMetric] = useState<MetricKey>("ai");
  const [active, setActive] = useState<number | null>(null);
  const uid = useId();
  const def = METRICS.find((m) => m.key === metric)!;
  const values = useMemo(() => days.map((d) => d[metric]), [days, metric]);
  const max = niceMax(Math.max(0, ...values));
  const total = totals[metric];
  const peak = values.reduce((best, v, i) => (v > values[best] ? i : best), 0);
  const slots = Math.max(periodDays, days.length);
  const shown = active ?? null;
  const summary = total
    ? `${def.label} per day this period: ${total.toLocaleString("en-US")} in total, busiest ${dayLabel(days[peak].day)} with ${values[peak].toLocaleString("en-US")}.`
    : `${def.empty}.`;

  const onKey = (e: React.KeyboardEvent) => {
    if (!days.length) return;
    const last = days.length - 1;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const cur = active ?? last;
      const next = e.key === "Home" ? 0 : e.key === "End" ? last : Math.min(last, Math.max(0, cur + (e.key === "ArrowRight" ? 1 : -1)));
      setActive(next);
    } else if (e.key === "Escape") setActive(null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-1 max-w-full overflow-x-auto px-1 py-0.5 [scrollbar-width:none]">
        <Segmented<MetricKey>
          aria-label="Metric"
          size="sm"
          value={metric}
          onValueChange={(v) => {
            setMetric(v);
            setActive(null);
          }}
          options={METRICS.map((m) => ({ value: m.key, label: m.label, count: totals[m.key] }))}
        />
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono tabular-nums text-foreground">{total.toLocaleString("en-US")}</span> this period
          {total ? (
            <>
              {" · busiest "}
              <span className="font-mono">{dayLabel(days[peak].day)}</span>
            </>
          ) : null}
        </p>
      </div>

      <div key={metric} className="usage-swap relative mt-5">
        <div
          data-reveal=""
          role="group"
          aria-roledescription="chart"
          tabIndex={days.length ? 0 : -1}
          aria-label={`${summary} Use the left and right arrow keys to read each day.`}
          aria-describedby={`${uid}-live`}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
          className="usage-chart relative h-[176px] rounded-[12px] outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          {/* Grid: max, half, zero. Only drawn when there is data, so no line runs behind the empty state. */}
          {total ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-6">
              {[max, max / 2, 0].map((v, i) => (
                <div key={i} className="relative border-t border-dashed border-border/80 first:border-solid first:border-transparent">
                  <span className="absolute -top-2 right-0 bg-card px-1 font-mono text-[10px] tabular-nums text-foreground-dim">{Number.isInteger(v) ? v.toLocaleString("en-US") : v.toFixed(1)}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div aria-hidden="true" className="absolute inset-x-0 bottom-6 top-0 flex items-end gap-[3px] pr-9 sm:gap-1">
            {Array.from({ length: slots }).map((_, i) => {
              const d = days[i];
              if (!d) return <span key={i} className="h-full flex-1 rounded-[3px] border border-dashed border-border/70 opacity-40" style={{ maxHeight: 6 }} />;
              const v = d[metric];
              const h = v === 0 ? 0 : Math.max(3, (v / max) * 100);
              const isToday = i === days.length - 1;
              const on = shown === i;
              return (
                <span key={d.day} className="usage-bar-col relative flex h-full flex-1 items-end" onPointerEnter={() => setActive(i)} onClick={() => setActive(i)}>
                  <span
                    className={cn(
                      "usage-bar block w-full rounded-t-[4px] rounded-b-[2px]",
                      v === 0 ? "h-[2px] bg-border" : isToday ? "bg-[image:var(--ember)]" : "bg-foreground/75 dark:bg-foreground/80",
                      on && v > 0 && "outline outline-2 outline-offset-1 outline-signal",
                    )}
                    style={{ height: v === 0 ? undefined : `${h}%`, "--i": i } as React.CSSProperties}
                  />
                  {on ? (
                    <span className="usage-tip pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-10 whitespace-nowrap rounded-md border border-border-strong bg-card px-2 py-1 text-[11px] font-medium text-card-foreground shadow-lg" style={{ opacity: 1, transform: "translate(-50%, 0)" }}>
                      <span className="font-mono text-foreground-dim">{dayLabel(d.day)}</span> · {def.unit(v)}
                    </span>
                  ) : null}
                </span>
              );
            })}
          </div>
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 flex justify-between pr-9 font-mono text-[10.5px] text-foreground-dim">
            <span>{days[0] ? dayLabel(days[0].day) : ""}</span>
            <span>{days.length > 2 ? `Today · ${dayLabel(days[days.length - 1].day)}` : ""}</span>
          </div>
          {!total ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center pb-6 text-center">
              <span className="icon-tile flex size-9 items-center justify-center rounded-[10px]">
                <Activity className="size-4" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-medium">{def.empty}</p>
              <p className="mt-0.5 max-w-xs text-xs text-muted-foreground">Bars appear as {def.noun} are recorded. Nothing is estimated.</p>
            </div>
          ) : null}
        </div>
        {!total && def.cta ? (
          <div className="mt-3 flex justify-center">
            <Link href={def.cta.href} className={buttonClasses("outline", "sm")}>
              <Plus className="size-3.5" aria-hidden="true" /> {def.cta.label}
            </Link>
          </div>
        ) : null}
        {total ? (
          <table className="sr-only">
            <caption>{def.label} by day (UTC), days with activity</caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">{def.label}</th>
              </tr>
            </thead>
            <tbody>
              {days
                .filter((d) => d[metric] > 0)
                .map((d) => (
                  <tr key={d.day}>
                    <th scope="row">{dayLabel(d.day)}</th>
                    <td>{d[metric].toLocaleString("en-US")}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : null}
        <p id={`${uid}-live`} className="sr-only" aria-live="polite">
          {shown !== null && days[shown] ? `${dayLabel(days[shown].day)}: ${def.unit(days[shown][metric])}` : ""}
        </p>
      </div>
    </div>
  );
}
