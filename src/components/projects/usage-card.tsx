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
  return (
    <div className="bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums tracking-tight">{used.toLocaleString()}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          / {unlimited ? "unlimited" : limit.toLocaleString()}
          {unit ? ` ${unit}` : ""}
        </span>
      </p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className={cn("h-full rounded-full transition-[width] duration-700", pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-warning" : "bg-foreground")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Server-rendered usage summary for the current workspace (data from getWorkspaceEntitlements). */
export function UsageCard({ workspaceName, entitlements, projectCount }: { workspaceName: string; entitlements: Entitlements; projectCount: number }) {
  const e = entitlements;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
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
