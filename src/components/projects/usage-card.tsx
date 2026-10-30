import Link from "next/link";
import { Gauge } from "lucide-react";
import { Meter } from "@/components/ui/meter";
import { PanelCard } from "./panel-card";

type Entitlements = {
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

/**
 * "Usage this month": the current workspace's meters (data from getWorkspaceEntitlements).
 * Bars turn warning at 70% and danger at 90%; unlimited limits read "Unlimited" as text. Server-safe.
 */
export function UsageCard({ entitlements, projectCount, className }: { entitlements: Entitlements; projectCount: number; className?: string }) {
  const e = entitlements;
  const resetsAt = resetDate(e.periodStart);
  const resets = resetsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const rows = [
    { label: "Projects", used: projectCount, limit: e.limits.projects },
    { label: "AI requests", used: e.used.ai_request, limit: e.limits.aiRequestsPerMonth },
    { label: "Preview minutes", used: e.used.runtime_minutes, limit: e.limits.runtimeMinutesPerMonth },
    { label: "Deployments", used: e.used.deployment, limit: e.limits.deploymentsPerMonth },
  ];
  return (
    <PanelCard
      title="Usage this month"
      icon={Gauge}
      aside={
        <>
          <span className="capitalize text-muted-foreground">{e.plan} plan</span>
          <Link href="/settings/usage" className="link-draw text-muted-foreground hover:text-foreground">
            Details
          </Link>
        </>
      }
      className={className}
    >
      <div className="space-y-3 px-3 py-3">
        {rows.map((r) => (
          <Meter key={r.label} label={r.label} value={r.used} max={Math.max(0, r.limit)} unlimited={r.limit < 0} format={n} size="sm" warnAt={0.7} dangerAt={0.9} />
        ))}
      </div>
      <p className="border-t border-border px-3 py-2 text-[11.5px] text-muted-foreground">
        Resets <time dateTime={resetsAt.toISOString()}>{resets}</time> · limits are enforced on the server
      </p>
    </PanelCard>
  );
}
