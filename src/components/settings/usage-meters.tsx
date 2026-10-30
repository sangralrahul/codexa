import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS, isUnlimited } from "@/config/plans";
import type { getWorkspaceEntitlements } from "@/lib/services/usage";
import { Meter as UiMeter } from "@/components/ui/meter";
import { buttonClasses } from "@/components/ui/button";
import { UsageGauge } from "./usage-gauge";
import { USAGE_DANGER_AT, USAGE_WARN_AT, nextPlan, toneOf, usageMetrics, type UsageMetricKey } from "./usage-model";

export type Entitlements = Awaited<ReturnType<typeof getWorkspaceEntitlements>>;

/** Capacity (what the workspace holds) is grouped apart from what was metered this period. */
const CAPACITY: UsageMetricKey[] = ["storage_bytes", "projects", "seats"];
const COLS: Record<number, string> = { 1: "xl:grid-cols-1", 2: "xl:grid-cols-2", 3: "xl:grid-cols-3", 4: "xl:grid-cols-2" };

/** Bar meter (kept for existing callers): role=progressbar with value attributes, dashboard thresholds. */
export function Meter({ label, used, limit, format, hint, neutral }: { label: string; used: number; limit: number; format?: (n: number) => string; hint?: string; neutral?: boolean }) {
  return (
    <UiMeter
      label={label}
      value={used}
      max={Math.max(0, limit)}
      unlimited={isUnlimited(limit)}
      format={format}
      hint={hint}
      neutral={neutral}
      warnAt={USAGE_WARN_AT}
      dangerAt={USAGE_DANGER_AT}
    />
  );
}

/**
 * Usage gauges for one workspace (server-safe): metered limits as signal rings with odometer
 * numerals, capacity (projects, seats incl. pending invitations) in neutral. `only` picks a subset.
 * With `showUpgrade`, a quiet nudge names what the next plan adds (from PLANS) and turns
 * primary when a metered limit passes the warning threshold.
 */
export function UsageMeters({
  entitlements,
  counts,
  showUpgrade = true,
  only,
  className,
}: {
  entitlements: Entitlements;
  counts: { projects: number; members: number; pending?: number };
  showUpgrade?: boolean;
  only?: UsageMetricKey[];
  className?: string;
}) {
  const e = entitlements;
  const all = usageMetrics(e, counts);
  const metrics = only ? all.filter((m) => only.includes(m.key)) : all;
  const near = all.some((m) => !m.capacity && (toneOf(m) === "warn" || toneOf(m) === "danger"));
  const up = nextPlan(e.plan);
  const upDef = up ? PLANS[up] : null;
  return (
    <div className={cn("space-y-4", className)}>
      {[metrics.filter((m) => !CAPACITY.includes(m.key)), metrics.filter((m) => CAPACITY.includes(m.key))]
        .filter((g) => g.length)
        .map((group, gi) => (
          <div key={gi}>
            <p className="mb-2 text-xs font-medium text-foreground-dim">{gi === 0 ? "Metered this period" : "Capacity"}</p>
            <ul className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border", COLS[Math.min(group.length, 4)])}>
              {group.map((m) => (
                <li key={m.key} className={cn("min-w-0 bg-card/95 p-3.5 sm:p-4", group.length % 2 === 1 && "last:col-span-2 xl:last:col-span-1", group.length === 1 && "col-span-2")}>
                  {/* Two tiles a row on phones: the ring sits above the numbers until there is room beside them. */}
                  <UsageGauge metric={m} className="flex-col items-start gap-2.5 min-[30rem]:flex-row min-[30rem]:items-center min-[30rem]:gap-4" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      {showUpgrade && e.plan !== "enterprise" ? (
        <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3", near ? "border-warning/40 bg-warning/[0.06]" : "border-border bg-surface/60")}>
          <p className="min-w-0 flex-1 text-[13px] text-muted-foreground">
            {near ? <span className="font-medium text-foreground">You are close to a limit. </span> : null}
            {upDef
              ? `${upDef.name} raises AI requests to ${upDef.limits.aiRequestsPerMonth.toLocaleString("en-US")} a month, preview runtime to ${Math.round(upDef.limits.runtimeMinutesPerMonth / 60).toLocaleString("en-US")} hours and projects to ${upDef.limits.projects}.`
              : "Need more? Enterprise plans have custom limits."}
          </p>
          <Link href={up ? "/settings/billing#plans" : "/contact-sales"} className={buttonClasses(near ? "primary" : "outline", "sm")}>
            {up ? "View plans" : "Contact sales"} <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
