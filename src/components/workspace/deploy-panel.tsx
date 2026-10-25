"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Globe, History, Rocket, RotateCcw } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, EmptyState, Skeleton, Spinner } from "@/components/ui/misc";
import { Field, Select } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { DeploymentDto } from "@/lib/runtime/types";

type ProviderInfo = { id: "codexa" | "vercel"; name: string; available: boolean; reason: string | null };
type ListResponse = {
  deployments: DeploymentDto[];
  providers: ProviderInfo[];
  deployHost: string;
  previewProtocol: "http" | "https";
  domain: { host: string; cname: string; verificationSupported: boolean; note: string };
};
type Role = "owner" | "admin" | "editor" | "viewer";

const base = (id: string) => `/api/v1/projects/${encodeURIComponent(id)}/deployments`;
const STATUS_BADGE: Record<DeploymentDto["status"], { label: string; variant: "default" | "primary" | "success" | "warning" | "danger" | "outline" }> = {
  queued: { label: "Queued", variant: "default" },
  building: { label: "Building", variant: "primary" },
  deploying: { label: "Deploying", variant: "primary" },
  live: { label: "Live", variant: "success" },
  failed: { label: "Failed", variant: "danger" },
  rolled_back: { label: "Superseded", variant: "outline" },
};

export function DeployPanel({ projectId }: { projectId: string; conversationId?: string }) {
  const [data, setData] = useState<ListResponse | null>(null);
  const [role, setRole] = useState<Role>("viewer");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [provider, setProvider] = useState<"codexa" | "vercel">("codexa");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<DeploymentDto | null>(null);
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, proj] = await Promise.all([api<ListResponse>(base(projectId)), api<{ role: Role }>(`/api/v1/projects/${encodeURIComponent(projectId)}`)]);
      setData(list);
      setRole(proj.role);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load deployments");
    }
  }, [projectId]);
  useEffect(() => {
    void load();
  }, [load]);

  // Poll the selected deployment while it is in progress, and fetch its build log.
  const fetchSelected = useCallback(
    async (id: string): Promise<DeploymentDto | null> => {
      try {
        const res = await api<{ deployment: DeploymentDto }>(`${base(projectId)}/${id}`);
        setSelected(res.deployment);
        return res.deployment;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Could not load deployment");
        return null;
      }
    },
    [projectId],
  );
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = () =>
      void fetchSelected(selectedId).then((d) => {
        if (cancelled || !d) return;
        if (d.status === "queued" || d.status === "building" || d.status === "deploying") timer = setTimeout(tick, 2000);
        else void load();
      });
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [selectedId, fetchSelected, load]);

  const canDeploy = role !== "viewer";
  const canRollback = role === "owner" || role === "admin";
  const providers = data?.providers ?? [];
  const chosen = providers.find((p) => p.id === provider);
  const current = useMemo(() => data?.deployments.find((d) => d.status === "live" && d.provider === provider) ?? null, [data, provider]);
  const inProgress = data?.deployments.some((d) => d.status === "queued" || d.status === "building" || d.status === "deploying") ?? false;

  const deploy = async () => {
    setConfirmOpen(false);
    setDeploying(true);
    setActionError(null);
    try {
      const res = await api<{ deployment: DeploymentDto }>(base(projectId), { method: "POST", json: { provider } });
      setSelectedId(res.deployment.id);
      await load();
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : err instanceof Error ? err.message : "Deployment failed to start");
    } finally {
      setDeploying(false);
    }
  };

  const rollback = async (id: string) => {
    setRollingBack(id);
    setActionError(null);
    try {
      await api(`${base(projectId)}/${id}/rollback`, { method: "POST" });
      setSelectedId(id);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Rollback failed");
    } finally {
      setRollingBack(null);
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-auto bg-background" aria-label="Deploy">
      <div className="space-y-5 p-4">
        {loadError && !data ? <Alert variant="danger" title="Could not load deployments">{loadError}</Alert> : null}
        {actionError ? <Alert variant="danger" title="Something went wrong">{actionError}</Alert> : null}

        {/* Publish */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Rocket className="size-4" aria-hidden="true" /> Publish
          </h3>
          {!data ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-9 w-32" />
            </div>
          ) : (
            <>
              <Field label="Provider" htmlFor="deploy-provider" className="mt-3" hint={chosen && !chosen.available ? chosen.reason ?? undefined : undefined}>
                <Select id="deploy-provider" value={provider} onChange={(e) => setProvider(e.target.value as "codexa" | "vercel")}>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id} disabled={!p.available}>
                      {p.name}
                      {p.available ? "" : " (not configured)"}
                    </option>
                  ))}
                </Select>
              </Field>
              {current?.url ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Currently live:{" "}
                  <a href={current.url} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
                    {current.url}
                  </a>
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">Nothing is published yet. Publishing makes the current files available at a public URL.</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button onClick={() => setConfirmOpen(true)} disabled={!canDeploy || !chosen?.available || deploying || inProgress} loading={deploying}>
                  <Rocket className="size-4" aria-hidden="true" /> {current ? "Publish new version" : "Publish"}
                </Button>
                {!canDeploy ? <span className="text-xs text-muted-foreground">Viewers cannot publish.</span> : inProgress ? <span className="text-xs text-muted-foreground">A deployment is in progress.</span> : null}
              </div>
            </>
          )}
        </div>

        {/* Selected deployment status + log */}
        {selected ? (
          <div className="rounded-xl border border-border bg-card p-4" aria-live="polite">
            <div className="flex flex-wrap items-center gap-2">
              {selected.status === "queued" || selected.status === "building" || selected.status === "deploying" ? <Spinner className="text-primary" /> : null}
              <Badge variant={STATUS_BADGE[selected.status].variant}>{STATUS_BADGE[selected.status].label}</Badge>
              <span className="text-xs text-muted-foreground">Deployment {selected.id.slice(0, 8)} · {new Date(selected.createdAt).toLocaleString()}</span>
              {selected.url && selected.status === "live" ? (
                <a href={selected.url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Open <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              ) : null}
            </div>
            {selected.error ? <Alert variant="danger" className="mt-3">{selected.error}</Alert> : null}
            <pre className="mt-3 max-h-64 overflow-auto rounded-md border border-border bg-muted/50 p-2 font-mono text-[11px] leading-5 text-muted-foreground" aria-label="Build log">
              {selected.buildLog || "Waiting for build output…"}
            </pre>
          </div>
        ) : null}

        {/* History */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <History className="size-4" aria-hidden="true" /> History
          </h3>
          {!data ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : data.deployments.length === 0 ? (
            <EmptyState className="mt-3 p-6" title="No deployments yet" description="Your deployment history, URLs and build logs will appear here." />
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
              {data.deployments.map((d) => (
                <li key={d.id} className={cn("flex flex-wrap items-center gap-2 p-3 text-sm", selectedId === d.id && "bg-muted/40")}>
                  <Badge variant={STATUS_BADGE[d.status].variant}>{STATUS_BADGE[d.status].label}</Badge>
                  <button type="button" onClick={() => setSelectedId(d.id)} className="min-w-0 flex-1 truncate text-left hover:underline focus-visible:outline-2 focus-visible:outline-ring" aria-label={`Show details for deployment ${d.id.slice(0, 8)}`}>
                    <span className="font-mono text-xs">{d.id.slice(0, 8)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {d.provider} · {new Date(d.createdAt).toLocaleString()}
                    </span>
                  </button>
                  {d.url && (d.status === "live" || d.status === "rolled_back") ? (
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline" aria-label={`Open ${d.url}`}>
                      URL <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  ) : null}
                  {d.status === "rolled_back" && d.url ? (
                    <Button size="sm" variant="outline" onClick={() => void rollback(d.id)} loading={rollingBack === d.id} disabled={!canRollback || rollingBack !== null} title={canRollback ? "Make this version live again" : "Only workspace admins can roll back"}>
                      <RotateCcw className="size-3.5" aria-hidden="true" /> Restore
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Custom domain */}
        {data ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Globe className="size-4" aria-hidden="true" /> Custom domain
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">Your site is served at <code className="rounded bg-muted px-1">{data.domain.host}</code>. To use your own domain, create a CNAME record:</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
              <dt className="text-muted-foreground">Type</dt>
              <dd>CNAME</dd>
              <dt className="text-muted-foreground">Name</dt>
              <dd>www (or your subdomain)</dd>
              <dt className="text-muted-foreground">Target</dt>
              <dd className="break-all">{data.domain.cname}</dd>
            </dl>
            <Alert variant="info" className="mt-3">{data.domain.note}</Alert>
          </div>
        ) : null}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent title="Publish this project?" description="Publishing creates a snapshot of the current files, builds it and makes the result publicly reachable at its URL. Anyone with the link can open it.">
          <p className="text-sm text-muted-foreground">
            Provider: <strong className="text-foreground">{chosen?.name ?? provider}</strong>
            {provider === "codexa" ? <> · URL: <code className="rounded bg-muted px-1 text-xs">{data?.domain.host}</code></> : null}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => void deploy()}>
              <Rocket className="size-4" aria-hidden="true" /> Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
