import Link from "next/link";
import { ArrowUpRight, FolderKanban, Rocket, Sparkles, Timer, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiEntitlements = {
  plan: string;
  periodStart: Date;
  limits: { projects: number; aiRequestsPerMonth: number; runtimeMinutesPerMonth: number; deploymentsPerMonth: number };
  used: { ai_request: number; runtime_minutes: number; deployment: number };
};

/** The first day of the next calendar month (UTC), when usage counters reset. */
function resetDate(periodStart: Date) {
  return new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1));
}

const n = (v: number) => v.toLocaleString("en-US");

type Stat = { key: string; label: string; icon: LucideIcon; used: number; limit: number; hint: string; href: string };

/**
 * KPI row: four stat cards (projects, AI requests, preview minutes, deployments) with gradient icon
 * tiles and thin gradient progress bars. Every number is the workspace's real usage from
 * getWorkspaceEntitlements and a project count; a limit below zero reads "Unlimited" with no bar.
 * Bars turn warning at 70% and danger at 90%. Server-safe.
 */
export function KpiRow({ entitlements, projectCount, className }: { entitlements: KpiEntitlements; projectCount: number; className?: string }) {
  const e = entitlements;
  const resetsAt = resetDate(e.periodStart);
  const resets = resetsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const stats: Stat[] = [
    { key: "projects", label: "Projects", icon: FolderKanban, used: projectCount, limit: e.limits.projects, hint: "In this workspace", href: "/projects" },
    { key: "ai", label: "AI requests", icon: Sparkles, used: e.used.ai_request, limit: e.limits.aiRequestsPerMonth, hint: `This month · resets ${resets}`, href: "/settings/usage" },
    { key: "runtime", label: "Preview minutes", icon: Timer, used: e.used.runtime_minutes, limit: e.limits.runtimeMinutesPerMonth, hint: `This month · resets ${resets}`, href: "/settings/usage" },
    { key: "deploys", label: "Deployments", icon: Rocket, used: e.used.deployment, limit: e.limits.deploymentsPerMonth, hint: `This month · resets ${resets}`, href: "/settings/usage" },
  ];
  return (
    <section aria-label="Usage this month" className={cn("grid grid-cols-2 gap-4 xl:grid-cols-4", className)}>
      {stats.map((s) => {
        const unlimited = s.limit < 0;
        const ratio = unlimited || s.limit === 0 ? 0 : Math.min(1, s.used / s.limit);
        const tone = ratio >= 0.9 ? "danger" : ratio >= 0.7 ? "warning" : undefined;
        const Icon = s.icon;
        return (
          <Link
            key={s.key}
            href={s.href}
            className="card-premium card-premium--hover group/kpi relative flex flex-col gap-3 p-4 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-5"
            aria-label={`${s.label}: ${unlimited ? `${n(s.used)} used, unlimited` : `${n(s.used)} of ${n(s.limit)}`}`}
          >
            <div className="flex items-center gap-3">
              <span className="icon-tile" aria-hidden="true">
                <Icon className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-muted-foreground">{s.label}</span>
              <ArrowUpRight className="size-4 shrink-0 text-foreground-dim opacity-0 transition-[opacity,transform] duration-(--dur-2) group-hover/kpi:opacity-100 group-hover/kpi:translate-x-0.5 group-hover/kpi:-translate-y-0.5 calm:transition-none" aria-hidden="true" />
            </div>
            <p className="flex items-baseline gap-1.5 tabular-nums">
              <span className={cn("text-[26px] font-bold leading-none tracking-[-0.03em]", tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-foreground")}>{n(s.used)}</span>
              <span className="text-[13px] text-muted-foreground">{unlimited ? "· Unlimited" : `/ ${n(s.limit)}`}</span>
            </p>
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
            <p className="text-[12px] text-foreground-dim">{s.hint}</p>
          </Link>
        );
      })}
    </section>
  );
}
