import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Entitlements = {
  plan: string;
  periodStart: Date;
  limits: { projects: number; aiRequestsPerMonth: number; runtimeMinutesPerMonth: number; deploymentsPerMonth: number };
  used: { ai_request: number; runtime_minutes: number; deployment: number };
};

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit < 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {used.toLocaleString()} / {unlimited ? "∞" : limit.toLocaleString()}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className={cn("h-full rounded-full", pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-warning" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Server-rendered usage summary for the current workspace (data from getWorkspaceEntitlements). */
export function UsageCard({ workspaceName, entitlements, projectCount }: { workspaceName: string; entitlements: Entitlements; projectCount: number }) {
  const e = entitlements;
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-sm">Usage this month</CardTitle>
          <CardDescription className="text-xs">
            {workspaceName} · since {e.periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </CardDescription>
        </div>
        <Badge variant="primary" className="capitalize">
          {e.plan}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <Meter label="Projects" used={projectCount} limit={e.limits.projects} />
        <Meter label="AI requests" used={e.used.ai_request} limit={e.limits.aiRequestsPerMonth} />
        <Meter label="Runtime minutes" used={e.used.runtime_minutes} limit={e.limits.runtimeMinutesPerMonth} />
        <Meter label="Deployments" used={e.used.deployment} limit={e.limits.deploymentsPerMonth} />
        <Link href="/settings/billing" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Usage & billing <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
