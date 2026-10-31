"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CircleAlert, Globe, History, Loader2, Rocket, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/client/api";
import { toast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { absoluteTime, relativeTime } from "./format";
import { PanelCard } from "./panel-card";

/** One deployment row (the newest five across the workspace), built on the server from DB rows. Serializable. */
export type DeploymentRow = {
  id: string;
  projectId: string;
  projectName: string;
  provider: string;
  status: "queued" | "building" | "deploying" | "live" | "failed" | "rolled_back" | string;
  /** When it finished, else when it was queued. */
  at: string;
  url: string | null;
  host: string | null;
  error: string | null;
  /** Owners and admins can restore a rolled-back version (the API enforces it too). */
  canRollback: boolean;
};

const STATE: Record<string, { label: string; icon: typeof Globe; tone: string }> = {
  live: { label: "Live", icon: Globe, tone: "text-success" },
  failed: { label: "Failed", icon: CircleAlert, tone: "text-danger" },
  building: { label: "Building", icon: Loader2, tone: "text-info" },
  deploying: { label: "Uploading", icon: Loader2, tone: "text-info" },
  queued: { label: "Queued", icon: Loader2, tone: "text-info" },
  rolled_back: { label: "Previous", icon: History, tone: "text-muted-foreground" },
};
const PROVIDER: Record<string, string> = { codexa: "Codexa hosting", vercel: "Vercel" };

/**
 * "Deployments": the five newest deployments in the workspace (status, host, when) with the real
 * actions: open the site, or roll back to a previous live version (POST …/rollback). Rows come from
 * the deployments table via getRecentDeployments; nothing is inferred.
 */
export function DeploymentsCard({ rows, className }: { rows: DeploymentRow[]; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const live = rows.filter((r) => r.status === "live").length;

  const rollback = async (d: DeploymentRow) => {
    setBusy(d.id);
    try {
      await api(`/api/v1/projects/${encodeURIComponent(d.projectId)}/deployments/${encodeURIComponent(d.id)}/rollback`, { method: "POST" });
      toast.success("Rolled back", `${d.projectName} now serves the version from ${relativeTime(d.at)}.`);
      router.refresh();
    } catch (e) {
      toast.error("Could not roll back", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  };

  return (
    <PanelCard
      title="Deployments"
      icon={Rocket}
      aside={
        <>
          {live ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="live-dot" aria-hidden="true" /> {live} live
            </span>
          ) : null}
          <Link href="/projects" className="link-draw text-muted-foreground hover:text-foreground">
            Projects
          </Link>
        </>
      }
      className={className}
    >
      {rows.length === 0 ? (
        <div className="px-4 py-5 text-[13px] text-muted-foreground">
          <p className="font-medium text-foreground">No deployments yet</p>
          <p className="mt-0.5">Publish from the editor to get a shareable address. Each publish is listed here with its status and host.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((d) => {
            const s = STATE[d.status] ?? { label: d.status, icon: Rocket, tone: "text-muted-foreground" };
            const Icon = s.icon;
            const spin = d.status === "building" || d.status === "queued" || d.status === "deploying";
            const restorable = d.status === "rolled_back" && Boolean(d.url) && d.canRollback;
            return (
              <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-surface shadow-[inset_0_0_0_1px_var(--border)]", s.tone)} aria-hidden="true">
                  <Icon className={cn("size-3.5", spin && "animate-spin calm:animate-none")} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-1.5">
                    <Link href={`/projects/${d.projectId}`} className="link-draw truncate font-medium text-foreground">
                      {d.projectName}
                    </Link>
                    <span className={cn("shrink-0 text-[12px]", s.tone)}>{s.label}</span>
                  </p>
                  <p className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-muted-foreground">
                    {d.host ? (
                      <span className="truncate font-mono">{d.host}</span>
                    ) : d.error ? (
                      <span className="truncate" title={d.error}>
                        {d.error}
                      </span>
                    ) : (
                      <span className="truncate">{PROVIDER[d.provider] ?? d.provider}</span>
                    )}
                    <span aria-hidden="true" className="text-border-strong">
                      ·
                    </span>
                    <time dateTime={d.at} title={absoluteTime(d.at)} className="shrink-0 tabular-nums text-foreground-dim">
                      {relativeTime(d.at)}
                    </time>
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1">
                  {restorable ? (
                    <Tooltip content="Serve this version again">
                      <button
                        type="button"
                        onClick={() => void rollback(d)}
                        disabled={busy !== null}
                        className="inline-flex h-7 items-center gap-1 rounded-[8px] px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
                      >
                        {busy === d.id ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Undo2 className="size-3.5" aria-hidden="true" />}
                        Roll back
                      </button>
                    </Tooltip>
                  ) : null}
                  {d.url && d.status === "live" ? (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-7 items-center gap-1 rounded-[8px] px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      Open <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      <span className="sr-only"> {d.host} (opens in a new tab)</span>
                    </a>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
}
