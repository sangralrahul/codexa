"use client";

import * as React from "react";
import { api, ClientApiError } from "@/lib/client/api";
import type { DeploymentDto } from "@/lib/runtime/types";
import type { WorkspaceRole } from "./types";

/**
 * Deployments for the workspace: the list, the providers (with their real "not configured"
 * reasons), and one tracked deployment that is polled while it builds. The header's live dot,
 * the Publish popover's stepper and the Publishing pane all read this one source,
 * so "Live" appears exactly when the server says so.
 */
export type ProviderInfo = { id: "codexa" | "vercel"; name: string; available: boolean; reason: string | null };
export type DeploymentList = {
  deployments: DeploymentDto[];
  providers: ProviderInfo[];
  deployHost: string;
  previewProtocol: "http" | "https";
  domain: { host: string; cname: string; verificationSupported: boolean; note: string };
};
export const IN_PROGRESS: DeploymentDto["status"][] = ["queued", "building", "deploying"];

type DeployContextValue = {
  data: DeploymentList | null;
  loadError: string | null;
  load: () => Promise<void>;
  /** Latest live deployment (any provider). */
  live: DeploymentDto | null;
  /** The deployment being followed (just published, or picked in the sheet), with its build log. */
  tracked: DeploymentDto | null;
  track: (id: string | null) => void;
  publish: (provider: ProviderInfo["id"]) => Promise<DeploymentDto | null>;
  publishing: boolean;
  publishError: string | null;
  rollback: (id: string) => Promise<void>;
  rollingBack: string | null;
  /** Incremented each time a tracked deployment reaches "live" while we watched it. */
  wentLive: number;
  canDeploy: boolean;
  canRollback: boolean;
};

const DeployContext = React.createContext<DeployContextValue | null>(null);

export function useDeployments() {
  const ctx = React.useContext(DeployContext);
  if (!ctx) throw new Error("useDeployments must be used inside <DeploymentsProvider>");
  return ctx;
}

/** Null outside a provider (for panels that also render standalone). */
export function useOptionalDeployments() {
  return React.useContext(DeployContext);
}

const base = (id: string) => `/api/v1/projects/${encodeURIComponent(id)}/deployments`;

export function DeploymentsProvider({ projectId, role, children }: { projectId: string; role: WorkspaceRole; children: React.ReactNode }) {
  const [data, setData] = React.useState<DeploymentList | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [trackedId, setTrackedId] = React.useState<string | null>(null);
  const [tracked, setTracked] = React.useState<DeploymentDto | null>(null);
  const [publishing, setPublishing] = React.useState(false);
  const [publishError, setPublishError] = React.useState<string | null>(null);
  const [rollingBack, setRollingBack] = React.useState<string | null>(null);
  const [wentLive, setWentLive] = React.useState(0);
  const watching = React.useRef<Set<string>>(new Set());

  const load = React.useCallback(async () => {
    try {
      setData(await api<DeploymentList>(base(projectId)));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load deployments");
    }
  }, [projectId]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch; state is set after the request resolves
    void load();
  }, [load]);

  // Follow the tracked deployment every 2s while it is in progress.
  React.useEffect(() => {
    if (!trackedId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      try {
        const res = await api<{ deployment: DeploymentDto }>(`${base(projectId)}/${encodeURIComponent(trackedId)}`);
        if (cancelled) return;
        const d = res.deployment;
        setTracked(d);
        if (IN_PROGRESS.includes(d.status)) {
          timer = setTimeout(tick, 2000);
        } else {
          if (d.status === "live" && watching.current.has(d.id)) {
            watching.current.delete(d.id);
            setWentLive((n) => n + 1);
          }
          void load();
        }
      } catch (err) {
        if (!cancelled) setPublishError(err instanceof Error ? err.message : "Could not load the deployment");
      }
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [trackedId, projectId, load]);

  const publish = React.useCallback(
    async (provider: ProviderInfo["id"]) => {
      setPublishing(true);
      setPublishError(null);
      try {
        const res = await api<{ deployment: DeploymentDto }>(base(projectId), { method: "POST", json: { provider } });
        watching.current.add(res.deployment.id);
        setTracked(res.deployment);
        setTrackedId(res.deployment.id);
        void load();
        return res.deployment;
      } catch (err) {
        setPublishError(err instanceof ClientApiError ? err.message : err instanceof Error ? err.message : "Publishing failed to start");
        return null;
      } finally {
        setPublishing(false);
      }
    },
    [projectId, load],
  );

  const rollback = React.useCallback(
    async (id: string) => {
      setRollingBack(id);
      setPublishError(null);
      try {
        await api(`${base(projectId)}/${encodeURIComponent(id)}/rollback`, { method: "POST" });
        setTrackedId(id);
        await load();
      } catch (err) {
        setPublishError(err instanceof Error ? err.message : "Rollback failed");
      } finally {
        setRollingBack(null);
      }
    },
    [projectId, load],
  );

  const live = React.useMemo(() => data?.deployments.find((d) => d.status === "live") ?? null, [data]);

  const value = React.useMemo<DeployContextValue>(
    () => ({
      data,
      loadError,
      load,
      live,
      tracked,
      track: (id) => {
        setTrackedId(id);
        if (!id) setTracked(null);
      },
      publish,
      publishing,
      publishError,
      rollback,
      rollingBack,
      wentLive,
      canDeploy: role !== "viewer",
      canRollback: role === "owner" || role === "admin",
    }),
    [data, loadError, load, live, tracked, publish, publishing, publishError, rollback, rollingBack, wentLive, role],
  );

  return <DeployContext.Provider value={value}>{children}</DeployContext.Provider>;
}
