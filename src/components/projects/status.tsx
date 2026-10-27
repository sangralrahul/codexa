import { CircleAlert, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A project's live state for cards and rows, built on the server from database rows only
 * (see src/lib/services/dashboard.ts): a running preview sandbox, the deployment currently
 * live, and the newest deployment when it failed or is still building. Serializable.
 */
export type ProjectStatusDto = {
  preview: boolean;
  live: { url: string; host: string } | null;
  deploy: "failed" | "building" | null;
};

type ServiceStatus = {
  preview: unknown | null;
  live: { url: string; host: string } | null;
  lastDeploy: { status: string } | null;
};

/** Server-side: the service status → the small DTO the client components render. */
export function toStatusDto(s: ServiceStatus | null | undefined): ProjectStatusDto | null {
  if (!s) return null;
  const d = s.lastDeploy?.status;
  const deploy = d === "failed" ? "failed" : d === "queued" || d === "building" || d === "deploying" ? "building" : null;
  if (!s.preview && !s.live && !deploy) return null;
  return { preview: Boolean(s.preview), live: s.live ? { url: s.live.url, host: s.live.host } : null, deploy };
}

const pill = "relative z-[2] inline-flex h-6 max-w-full items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium leading-none";

/**
 * Status pills: "● Preview running", "Live · host" (opens the deployment), "Deploy failed",
 * "Deploying". Renders nothing without status. The Live link sits above stretched card links.
 */
export function StatusPills({ status, className, compact = false }: { status: ProjectStatusDto | null | undefined; className?: string; compact?: boolean }) {
  if (!status) return null;
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-1.5", className)}>
      {status.preview ? (
        <span className={cn(pill, "bg-success/10 text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--success)_28%,transparent)]")}>
          <span className="live-dot" aria-hidden="true" />
          {compact ? "Preview" : "Preview running"}
        </span>
      ) : null}
      {status.live ? (
        <a
          href={status.live.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`Open ${status.live.url} in a new tab`}
          className={cn(pill, "min-w-0 bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border-strong)] transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring")}
        >
          <Globe className="size-3 shrink-0 text-success" aria-hidden="true" />
          <span className="truncate">
            Live<span className="text-muted-foreground"> · {status.live.host}</span>
          </span>
        </a>
      ) : null}
      {status.deploy === "failed" ? (
        <span className={cn(pill, "bg-danger/10 text-danger shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--danger)_30%,transparent)]")}>
          <CircleAlert className="size-3" aria-hidden="true" />
          Deploy failed
        </span>
      ) : status.deploy === "building" ? (
        <span className={cn(pill, "bg-info/10 text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--info)_28%,transparent)]")}>
          <Loader2 className="size-3 animate-spin text-info calm:animate-none" aria-hidden="true" />
          Deploying
        </span>
      ) : null}
    </div>
  );
}
