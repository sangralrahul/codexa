"use client";

import { ExternalLink, Globe, History, Loader2, RotateCcw, Rocket } from "lucide-react";
import { useDeployments, IN_PROGRESS } from "@/lib/client/workspace/deployments";
import type { DeploymentDto } from "@/lib/runtime/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, EmptyState, LiveDot, Skeleton } from "@/components/ui/misc";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { relativeTime } from "@/components/projects/format";
import { cn } from "@/lib/utils";
import { SheetHeading } from "./drawer";

const STATUS_BADGE: Record<DeploymentDto["status"], { label: string; variant: "default" | "primary" | "success" | "warning" | "danger" | "outline" }> = {
  queued: { label: "Queued", variant: "default" },
  building: { label: "Building", variant: "primary" },
  deploying: { label: "Deploying", variant: "primary" },
  live: { label: "Live", variant: "success" },
  failed: { label: "Failed", variant: "danger" },
  rolled_back: { label: "Superseded", variant: "outline" },
};

/**
 * "Manage deployments": the history (with each build log), rollback for owners and admins,
 * and the custom domain instructions. Publishing itself happens in the header popover.
 */
export function DeploymentsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const d = useDeployments();
  const selected = d.tracked;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="[--btn-radius:10px]" title={<SheetHeading icon={<Rocket className="size-4" aria-hidden="true" />} title="Deployments" />} description="Every published version, its build log, rollback and your domain." width={560}>
        <div className="space-y-6">
          {d.loadError && !d.data ? <Alert variant="danger" title="Could not load deployments">{d.loadError}</Alert> : null}
          {d.publishError ? <Alert variant="danger" title="Something went wrong">{d.publishError}</Alert> : null}

          <section aria-labelledby="dep-history">
            <h3 id="dep-history" className="flex items-center gap-2 text-[13px] font-semibold">
              <History className="size-4 text-muted-foreground" aria-hidden="true" /> History
            </h3>
            {!d.data ? (
              <div className="mt-3 space-y-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : d.data.deployments.length === 0 ? (
              <EmptyState className="mt-3 py-8" icon={<Rocket />} title="No deployments yet" description="Publish from the header. Each version, its URL and build log will appear here." />
            ) : (
              <ul className="mt-3 overflow-hidden rounded-xl border border-border">
                {d.data.deployments.map((dep) => {
                  const badge = STATUS_BADGE[dep.status];
                  const active = selected?.id === dep.id;
                  return (
                    <li key={dep.id} className={cn("border-b border-border last:border-b-0", active && "bg-muted/50")}>
                      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm">
                        <Badge variant={badge.variant} className={cn("gap-1", dep.status === "live" && "ws-drop")}>
                          {dep.status === "live" ? <LiveDot /> : IN_PROGRESS.includes(dep.status) ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : null}
                          {badge.label}
                        </Badge>
                        <button type="button" onClick={() => d.track(active ? null : dep.id)} className="min-w-0 flex-1 truncate text-left focus-visible:outline-2 focus-visible:outline-ring" aria-expanded={active} aria-label={`Build log for deployment ${dep.id.slice(0, 8)}`}>
                          <span className="font-mono text-xs">{dep.id.slice(0, 8)}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {dep.provider} · {relativeTime(dep.createdAt)}
                          </span>
                        </button>
                        {dep.url && (dep.status === "live" || dep.status === "rolled_back") ? (
                          <a href={dep.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline" aria-label={`Open ${dep.url}`}>
                            Open <ExternalLink className="size-3" aria-hidden="true" />
                          </a>
                        ) : null}
                        {dep.status === "rolled_back" && dep.url ? (
                          <Button
                            size="sm"
                            variant="outline"
                            appearance="app"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => void d.rollback(dep.id)}
                            loading={d.rollingBack === dep.id}
                            disabled={!d.canRollback || d.rollingBack !== null}
                            title={d.canRollback ? "Make this version live again" : "Only workspace owners and admins can roll back"}
                          >
                            <RotateCcw className="size-3.5" aria-hidden="true" /> Roll back to this
                          </Button>
                        ) : null}
                      </div>
                      {active && selected ? (
                        <div className="border-t border-border px-3 py-2.5">
                          {selected.error ? <p className="mb-2 whitespace-pre-wrap text-xs text-danger">{selected.error}</p> : null}
                          <pre className="max-h-64 overflow-auto rounded-lg border border-code-border bg-code-bg p-2.5 font-mono text-[11px] leading-5 text-code-fg" aria-label="Build log">
                            {selected.buildLog || "Waiting for build output…"}
                          </pre>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            {!d.canRollback && d.data?.deployments.some((x) => x.status === "rolled_back") ? <p className="mt-2 text-[12px] text-muted-foreground">Only workspace owners and admins can roll back.</p> : null}
          </section>

          {d.data ? (
            <section aria-labelledby="dep-domain" className="rounded-xl border border-border bg-card p-4 shadow-[inset_0_1px_0_var(--hairline)]">
              <h3 id="dep-domain" className="flex items-center gap-2 text-[13px] font-semibold">
                <Globe className="size-4 text-muted-foreground" aria-hidden="true" /> Custom domain
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Your site is served at <code className="rounded bg-muted px-1 font-mono">{d.data.domain.host}</code>. To use your own domain, create a CNAME record:
              </p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
                <dt className="text-muted-foreground">Type</dt>
                <dd>CNAME</dd>
                <dt className="text-muted-foreground">Name</dt>
                <dd>www (or your subdomain)</dd>
                <dt className="text-muted-foreground">Target</dt>
                <dd className="break-all">{d.data.domain.cname}</dd>
              </dl>
              <Alert variant="info" className="mt-3" live={false}>
                {d.data.domain.note}
              </Alert>
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
