import Link from "next/link";
import { ArrowUpRight, FolderKanban, Rocket, Sparkles, Timer, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline, weekDelta } from "./sparkline";

export type KpiEntitlements = {
  plan: string;
  periodStart: Date;
  limits: { projects: number; aiRequestsPerMonth: number; runtimeMinutesPerMonth: number; deploymentsPerMonth: number };
  used: { ai_request: number; runtime_minutes: number; deployment: number };
};

/** Fourteen daily values per metric, oldest first (from getDailySeries). */
export type KpiSeries = { projects: number[]; ai: number[]; minutes: number[]; deploys: number[]; from: string; to: string };

/** The first day of the next calendar month (UTC), when usage counters reset. */
function resetDate(periodStart: Date) {
  return new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1));
}

const n = (v: number) => v.toLocaleString("en-US");
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

type Stat = { key: string; label: string; icon: LucideIcon; used: number; limit: number; hint: string; href: string; series: number[]; unit: string };

/**
 * KPI row: four stat cards (projects, AI requests, preview minutes, deployments). Every number is
 * the workspace's real usage from getWorkspaceEntitlements and a project count; the 14-day bars
 * and the "+N this week" line are counted from the same usage_events (projects: created per day).
 * A limit below zero reads "Unlimited" with no bar. Bars turn warning at 70% and danger at 90%.
 * Server-safe.
 */
export function KpiRow({ entitlements, projectCount, series, className }: { entitlements: KpiEntitlements; projectCount: number; series: KpiSeries | null; className?: string }) {
  const e = entitlements;
  const resetsAt = resetDate(e.periodStart);
  const resets = resetsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const empty: number[] = [];
  const stats: Stat[] = [
    { key: "projects", label: "Projects", icon: FolderKanban, used: projectCount, limit: e.limits.projects, hint: "In this workspace", href: "/projects", series: series?.projects ?? empty, unit: "created" },
    { key: "ai", label: "AI requests", icon: Sparkles, used: e.used.ai_request, limit: e.limits.aiRequestsPerMonth, hint: `This month · resets ${resets}`, href: "/settings/usage", series: series?.ai ?? empty, unit: "requests" },
    { key: "runtime", label: "Preview minutes", icon: Timer, used: e.used.runtime_minutes, limit: e.limits.runtimeMinutesPerMonth, hint: `This month · resets ${resets}`, href: "/settings/usage", series: series?.minutes ?? empty, unit: "minutes" },
    { key: "deploys", label: "Deployments", icon: Rocket, used: e.used.deployment, limit: e.limits.deploymentsPerMonth, hint: `This month · resets ${resets}`, href: "/settings/usage", series: series?.deploys ?? empty, unit: "deploys" },
  ];
  const range = series ? `${day(series.from)} – ${day(series.to)}` : null;
  return (
    <section aria-label="Usage this month" className={cn("grid grid-cols-2 gap-4 xl:grid-cols-4", className)}>
      {stats.map((s) => {
        const unlimited = s.limit < 0;
        const ratio = unlimited || s.limit === 0 ? 0 : Math.min(1, s.used / s.limit);
        const tone = ratio >= 0.9 ? "danger" : ratio >= 0.7 ? "warning" : undefined;
        const Icon = s.icon;
        const wk = s.series.length ? weekDelta(s.series) : null;
        const pct = unlimited ? null : Math.round(ratio * 100);
        return (
          <Link
            key={s.key}
            href={s.href}
            className="card-premium card-premium--hover group/kpi relative flex flex-col gap-3 p-4 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-5"
            aria-label={`${s.label}: ${unlimited ? `${n(s.used)} used, unlimited` : `${n(s.used)} of ${n(s.limit)}`}${wk ? `, ${n(wk.thisWeek)} ${s.unit} this week, ${n(wk.lastWeek)} last week` : ""}`}
          >
            <div className="flex items-center gap-3">
              <span className="icon-tile size-9 rounded-[10px]" aria-hidden="true">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-muted-foreground">{s.label}</span>
              {pct !== null ? <span className={cn("text-meta tabular-nums", tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-foreground-dim")}>{pct}%</span> : null}
              <ArrowUpRight className="size-4 shrink-0 text-foreground-dim opacity-0 transition-[opacity,transform] duration-(--dur-2) group-hover/kpi:translate-x-0.5 group-hover/kpi:-translate-y-0.5 group-hover/kpi:opacity-100 calm:transition-none" aria-hidden="true" />
            </div>
            <div className="flex items-end justify-between gap-3">
              <p className="flex items-baseline gap-1.5 tabular-nums">
                <span className={cn("text-[26px] font-bold leading-none tracking-[-0.03em]", tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-foreground")}>{n(s.used)}</span>
                <span className="text-[13px] text-muted-foreground">{unlimited ? "· Unlimited" : `/ ${n(s.limit)}`}</span>
              </p>
              {s.series.length ? (
                <span className="w-[96px] shrink-0 sm:w-[112px]" title={range ? `Per day, ${range}` : undefined}>
                  <Sparkline values={s.series} height={28} />
                </span>
              ) : null}
            </div>
            <div
              className="brand-bar brand-bar--thin"
              data-tone={tone}
              role="progressbar"
              aria-hidden={unlimited || undefined}
              aria-valuemin={0}
              aria-valuemax={unlimited ? undefined : s.limit}
              aria-valuenow={unlimited ? undefined : Math.min(s.used, s.limit)}
            >
              <span style={{ width: `${Math.round((unlimited ? 1 : ratio) * 100)}%`, opacity: unlimited ? 0.25 : 1 }} />
            </div>
            <p className="flex items-center justify-between gap-2 text-[12px] text-foreground-dim">
              <span className="truncate">{s.hint}</span>
              {wk ? (
                <span className={cn("shrink-0 tabular-nums", wk.thisWeek > 0 ? "font-medium text-foreground" : "")} title={`${n(wk.lastWeek)} ${s.unit} the week before`}>
                  +{n(wk.thisWeek)} this week
                </span>
              ) : null}
            </p>
          </Link>
        );
      })}
    </section>
  );
}
