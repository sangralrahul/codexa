import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Meter } from "@/components/ui/meter";
import { cn } from "@/lib/utils";

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
 * "This month": the current workspace's usage as horizontal bars (data from
 * getWorkspaceEntitlements). Bars turn warning at 70% and danger at 90%; unlimited
 * limits read "Unlimited" as text. Server-safe.
 */
export function UsageCard({ workspaceName, entitlements, projectCount, className }: { workspaceName: string; entitlements: Entitlements; projectCount: number; className?: string }) {
  const e = entitlements;
  const resets = resetDate(e.periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const rows = [
    { label: "Projects", used: projectCount, limit: e.limits.projects },
    { label: "AI requests", used: e.used.ai_request, limit: e.limits.aiRequestsPerMonth },
    { label: "Preview minutes", used: e.used.runtime_minutes, limit: e.limits.runtimeMinutesPerMonth },
    { label: "Deployments", used: e.used.deployment, limit: e.limits.deploymentsPerMonth },
  ];
  return (
    <section aria-labelledby="usage-title" className={cn("e1 flex min-w-0 flex-col rounded-[18px] p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="usage-title" className="text-[15px] font-semibold tracking-[-0.01em]">
            This month
          </h2>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            <span className="capitalize">{e.plan}</span> plan · {workspaceName}
          </p>
        </div>
        <Link href="/settings/usage" className="link-draw inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          Details <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-5 space-y-4">
        {rows.map((r) => (
          <Meter key={r.label} label={r.label} value={r.used} max={Math.max(0, r.limit)} unlimited={r.limit < 0} format={n} size="sm" warnAt={0.7} dangerAt={0.9} />
        ))}
      </div>
      <p className="mt-auto pt-5 text-xs text-muted-foreground">
        <span className="block border-t border-border pt-3">
          Resets <time dateTime={resetDate(e.periodStart).toISOString()}>{resets}</time>. Limits are enforced on the server.
        </span>
      </p>
    </section>
  );
}
