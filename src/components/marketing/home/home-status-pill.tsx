import { cn } from "@/lib/utils";

type Overall = "operational" | "degraded" | "down" | "unknown" | "checking";

const LABEL: Record<Overall, string> = { operational: "Operational", degraded: "Degraded", down: "Partial outage", unknown: "Status unknown", checking: "Checking status" };

/**
 * The headline for the overall state. It names the failing component when there is exactly one
 * ("Runner unreachable", "Database degraded"), so the pill says what is wrong rather than a bare
 * "Outage"; with more than one it falls back to "Partial outage" (the web app itself rendered the page).
 */
export function statusHeadline(overall: Overall, affected: string[] = []) {
  if (overall === "down" && affected.length === 1) return `${affected[0]} unreachable`;
  if (overall === "degraded" && affected.length === 1) return `${affected[0]} degraded`;
  return LABEL[overall];
}

/**
 * The status pill's look (shared by the streamed pill and its Suspense fallback). The not-configured
 * count is a separate fact (nothing is failing there), so it sits after a divider, not in the headline.
 */
export function HomeStatusPill({ overall, affected = [], notConfigured = 0 }: { overall: Overall; affected?: string[]; notConfigured?: number }) {
  const dot = overall === "operational" ? "live-dot" : overall === "degraded" ? "bg-warning" : overall === "down" ? "bg-danger" : "bg-muted-foreground/50";
  return (
    <span className="inline-flex h-8 max-w-full items-center gap-2 rounded-full border border-border bg-card/70 px-3 text-[13px] text-foreground/85 shadow-[inset_0_1px_0_var(--hairline)] transition-colors hover:border-border-strong">
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", dot)} />
      <span className="truncate font-medium text-foreground">{statusHeadline(overall, affected)}</span>
      {notConfigured > 0 ? (
        <>
          <span aria-hidden="true" className="h-3.5 w-px shrink-0 bg-border-strong" />
          <span className="shrink-0 text-muted-foreground">{notConfigured} not configured</span>
        </>
      ) : null}
    </span>
  );
}
