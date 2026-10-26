import { cn } from "@/lib/utils";

const LABEL = { operational: "Operational", degraded: "Degraded", down: "Outage", unknown: "Status unknown", checking: "Checking status" } as const;

/** The status pill's look (shared by the streamed pill and its Suspense fallback). */
export function HomeStatusPill({ overall, notConfigured = 0 }: { overall: keyof typeof LABEL; notConfigured?: number }) {
  const dot = overall === "operational" ? "live-dot" : overall === "degraded" ? "bg-warning" : overall === "down" ? "bg-danger" : "bg-muted-foreground/50";
  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-card/70 px-3 text-[13px] text-foreground/85 shadow-[inset_0_1px_0_var(--hairline)] transition-colors hover:border-border-strong">
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", dot)} />
      <span className="font-medium text-foreground">{LABEL[overall]}</span>
      {notConfigured > 0 ? (
        <span className="text-muted-foreground">
          · {notConfigured} {notConfigured === 1 ? "service" : "services"} not configured
        </span>
      ) : null}
    </span>
  );
}
