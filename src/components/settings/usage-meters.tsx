import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { PLANS, isUnlimited } from "@/config/plans";
import type { getWorkspaceEntitlements } from "@/lib/services/usage";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";

export type Entitlements = Awaited<ReturnType<typeof getWorkspaceEntitlements>>;

export function Meter({ label, used, limit, format, hint }: { label: string; used: number; limit: number; format?: (n: number) => string; hint?: string }) {
  const unlimited = isUnlimited(limit);
  const fmt = format ?? ((n: number) => n.toLocaleString("en-US"));
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const tone = pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-primary";
  return (
    <div className="bg-card p-4 sm:[&:last-child:nth-child(odd)]:col-span-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-muted-foreground">{label}</span>
        {!unlimited ? <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span> : null}
      </div>
      <p className="mt-1 text-sm tabular-nums">
        <span className="text-lg font-semibold tracking-tight">{fmt(used)}</span>
        <span className="text-muted-foreground"> / {unlimited ? "Unlimited" : fmt(limit)}</span>
      </p>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={unlimited ? `${fmt(used)} used, unlimited` : `${fmt(used)} of ${fmt(limit)}`}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-700", unlimited ? "bg-success/60" : tone)} style={{ width: unlimited ? "100%" : `${pct}%` }} />
      </div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const minutes = (n: number) => (n >= 120 ? `${Math.round(n / 60).toLocaleString("en-US")} h` : `${n.toLocaleString("en-US")} min`);
const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

/** Server-safe usage meters for one workspace, with the monthly period and an upgrade CTA when limits are close. */
export function UsageMeters({ entitlements, counts, showUpgrade = true }: { entitlements: Entitlements; counts: { projects: number; members: number }; showUpgrade?: boolean }) {
  const e = entitlements;
  const l = e.limits;
  const def = PLANS[e.plan];
  const period = e.periodStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const nearLimit = [
    [e.used.ai_request, l.aiRequestsPerMonth],
    [e.used.runtime_minutes, l.runtimeMinutesPerMonth],
    [e.used.deployment, l.deploymentsPerMonth],
    [counts.projects, l.projects],
  ].some(([u, lim]) => !isUnlimited(lim) && u / Math.max(1, lim) >= 0.8);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Period: <span className="font-medium text-foreground">{period}</span> (resets on the 1st, UTC)
        </p>
        <Badge variant="primary">{def.name} plan</Badge>
      </div>
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
        <Meter label="AI requests" used={e.used.ai_request} limit={l.aiRequestsPerMonth} />
        <Meter label="AI tokens" used={e.used.ai_tokens} limit={l.aiTokensPerMonth} format={compact} />
        <Meter label="Preview runtime" used={e.used.runtime_minutes} limit={l.runtimeMinutesPerMonth} format={minutes} />
        <Meter label="Deployments" used={e.used.deployment} limit={l.deploymentsPerMonth} />
        <Meter label="Storage" used={e.used.storage_bytes} limit={isUnlimited(l.storageMb) ? -1 : l.storageMb * 1024 * 1024} format={(n) => formatBytes(n)} hint="Project files stored in this workspace." />
        <Meter label="Projects" used={counts.projects} limit={l.projects} hint="Active projects (deleted projects do not count)." />
        <Meter label="Members" used={counts.members} limit={l.members} />
      </div>
      {showUpgrade && e.plan !== "enterprise" ? (
        <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4", nearLimit ? "border-warning/40 bg-warning/5" : "border-border bg-surface")}>
          <p className="text-sm">
            {nearLimit ? "You are close to a limit. " : ""}
            {e.plan === "free" ? "Upgrade to Pro for 1,000 AI requests, 100 hours of runtime and custom domains." : e.plan === "pro" ? "Move to Team for 10 seats, 5,000 AI requests and priority support." : "Need more? Enterprise plans have custom limits."}
          </p>
          <Link href={e.plan === "team" ? "/contact-sales" : "/settings/billing"} className={buttonClasses(nearLimit ? "primary" : "outline", "sm")}>
            {e.plan === "team" ? "Contact sales" : "View plans"} <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
