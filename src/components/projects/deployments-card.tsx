import Link from "next/link";
import { ArrowUpRight, CircleAlert, Globe, History, Loader2, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { absoluteTime, relativeTime } from "./format";
import { PanelCard } from "./panel-card";

/** The newest deployment of a project (one row per project), built on the server from DB rows. Serializable. */
export type DeploymentRow = {
  projectId: string;
  projectName: string;
  status: "queued" | "building" | "live" | "failed" | "rolled_back" | string;
  at: string;
  /** Set only while this deployment is the one serving traffic. */
  url: string | null;
  host: string | null;
  error: string | null;
};

const STATE: Record<string, { label: string; icon: typeof Globe; tone: string }> = {
  live: { label: "Live", icon: Globe, tone: "text-success" },
  failed: { label: "Failed", icon: CircleAlert, tone: "text-danger" },
  building: { label: "Building", icon: Loader2, tone: "text-info" },
  queued: { label: "Queued", icon: Loader2, tone: "text-info" },
  rolled_back: { label: "Rolled back", icon: History, tone: "text-muted-foreground" },
};

/**
 * "Deployments": the newest deployment of each project in the workspace (status, host, when).
 * Rows come from the deployments table via getProjectStatuses; nothing is inferred. Server-safe.
 */
export function DeploymentsCard({ rows, className }: { rows: DeploymentRow[]; className?: string }) {
  return (
    <PanelCard title="Deployments" icon={Rocket} aside={<Link href="/projects" className="link-draw text-xs text-muted-foreground hover:text-foreground">Projects</Link>} className={className}>
      {rows.length === 0 ? (
        <p className="px-3 py-3 text-xs text-muted-foreground">No deployments yet. Publish from the editor to get a shareable URL.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((d) => {
            const s = STATE[d.status] ?? { label: d.status, icon: Rocket, tone: "text-muted-foreground" };
            const Icon = s.icon;
            const spin = d.status === "building" || d.status === "queued";
            return (
              <li key={d.projectId} className="flex items-center gap-2.5 px-3 py-2 text-[12.5px]">
                <Icon className={cn("size-3.5 shrink-0", s.tone, spin && "animate-spin calm:animate-none")} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate">
                    <Link href={`/projects/${d.projectId}`} className="link-draw font-medium text-foreground">
                      {d.projectName}
                    </Link>
                    <span className={cn("ml-1.5", s.tone)}>{s.label}</span>
                  </p>
                  {d.url && d.host ? (
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-0.5 truncate font-mono text-[11.5px] text-muted-foreground hover:text-foreground">
                      <span className="truncate">{d.host}</span>
                      <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : d.error ? (
                    <p className="truncate text-[11.5px] text-muted-foreground" title={d.error}>
                      {d.error}
                    </p>
                  ) : null}
                </div>
                <time dateTime={d.at} title={absoluteTime(d.at)} className="text-meta shrink-0 text-foreground-dim">
                  {relativeTime(d.at)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
}
