import Link from "next/link";
import { ArrowUpRight, HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/misc";
import { getPlatformStatus, type ComponentState } from "@/lib/services/platform-status";
import { PanelCard } from "./panel-card";

const DOT: Record<ComponentState, { dot: string; label: string }> = {
  operational: { dot: "bg-success", label: "Operational" },
  degraded: { dot: "bg-warning", label: "Degraded" },
  down: { dot: "bg-danger", label: "Down" },
  unknown: { dot: "bg-primary/70", label: "Configured" },
  not_configured: { dot: "bg-muted-foreground/40", label: "Not configured" },
};

/**
 * "System status": the same facts as GET /api/v1/status (database and runner probed, AI / email /
 * hosting reported as configured or not), one dot per component. Async server component: wrap it
 * in <Suspense fallback={<SystemStatusSkeleton />}> so the probes never hold the page.
 */
export async function SystemStatusCard({ className }: { className?: string }) {
  const status = await getPlatformStatus();
  const checked = new Date(status.checkedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const overall = DOT[status.overall];
  return (
    <PanelCard
      title="System status"
      icon={HeartPulse}
      aside={
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className={cn("size-2 rounded-full", overall.dot)} aria-hidden="true" />
          {overall.label}
        </span>
      }
      className={className}
    >
      <ul className="divide-y divide-border">
        {status.components.map((c) => {
          const d = DOT[c.state];
          return (
            <li key={c.id} className="flex items-center gap-3 px-4 py-2 text-[13px]" title={c.detail}>
              <span className={cn("size-2 shrink-0 rounded-full", d.dot)} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              {typeof c.latencyMs === "number" && c.state !== "down" ? <span className="text-meta shrink-0 tabular-nums text-foreground-dim">{c.latencyMs} ms</span> : null}
              <span className={cn("shrink-0 text-[12px]", c.state === "operational" ? "text-success" : c.state === "down" ? "text-danger" : c.state === "degraded" ? "text-warning" : "text-muted-foreground")}>{d.label}</span>
            </li>
          );
        })}
      </ul>
      <p className="flex items-center justify-between gap-2 border-t border-border bg-surface/60 px-4 py-2 text-[11.5px] text-foreground-dim">
        <span className="tabular-nums">Checked at {checked}</span>
        <Link href="/status" className="link-draw inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground">
          Status page <ArrowUpRight className="size-3" aria-hidden="true" />
        </Link>
      </p>
    </PanelCard>
  );
}

export function SystemStatusSkeleton({ className }: { className?: string }) {
  return (
    <PanelCard title="System status" icon={HeartPulse} aside={<Skeleton className="h-3 w-16" />} className={className}>
      <ul className="divide-y divide-border" aria-busy="true" aria-label="Checking platform status">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-2.5">
            <Skeleton className="size-2 rounded-full" />
            <Skeleton className="h-3 flex-1" style={{ maxWidth: `${52 - i * 6}%` }} />
            <Skeleton className="ml-auto h-3 w-14" />
          </li>
        ))}
      </ul>
      <div className="border-t border-border bg-surface/60 px-4 py-2.5">
        <Skeleton className="h-3 w-24" />
      </div>
    </PanelCard>
  );
}
