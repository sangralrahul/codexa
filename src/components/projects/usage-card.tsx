import { cn } from "@/lib/utils";

type Entitlements = {
  plan: string;
  periodStart: Date;
  limits: { projects: number; aiRequestsPerMonth: number; runtimeMinutesPerMonth: number; deploymentsPerMonth: number };
  used: { ai_request: number; runtime_minutes: number; deployment: number };
};

function Meter({ label, used, limit, unit }: { label: string; used: number; limit: number; unit?: string }) {
  const unlimited = limit < 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4 bg-card p-5">
      <svg viewBox="0 0 56 56" className="size-14 shrink-0 -rotate-90" role="img" aria-label={`${label}: ${pct}% used`}>
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" className="stroke-muted" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(pct, used > 0 ? 3 : 0) / 100)}
          className={cn("ring-fill", pct >= 90 ? "stroke-danger" : pct >= 70 ? "stroke-warning" : "stroke-signal")}
        />
      </svg>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl font-semibold tabular-nums tracking-tight">{used.toLocaleString()}</span>
          <span className="truncate text-xs tabular-nums text-muted-foreground">
            / {unlimited ? "unlimited" : limit.toLocaleString()}
            {unit ? ` ${unit}` : ""}
          </span>
        </p>
      </div>
    </div>
  );
}

/** Server-rendered usage summary for the current workspace (data from getWorkspaceEntitlements). */
export function UsageCard({ workspaceName, entitlements, projectCount }: { workspaceName: string; entitlements: Entitlements; projectCount: number }) {
  const e = entitlements;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid gap-px bg-border sm:grid-cols-2">
        <Meter label="Projects" used={projectCount} limit={e.limits.projects} />
        <Meter label="AI requests" used={e.used.ai_request} limit={e.limits.aiRequestsPerMonth} />
        <Meter label="Preview runtime" used={e.used.runtime_minutes} limit={e.limits.runtimeMinutesPerMonth} unit="min" />
        <Meter label="Deployments" used={e.used.deployment} limit={e.limits.deploymentsPerMonth} />
      </div>
      <p className="border-t border-border bg-surface/60 px-5 py-2.5 text-xs text-muted-foreground">
        <span className="capitalize">{e.plan}</span> plan · {workspaceName} · period started {e.periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </p>
    </div>
  );
}
