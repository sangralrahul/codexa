"use client";

import { useCallback, useEffect, useState } from "react";
import { Plug, Plus, Trash2 } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, EmptyState, Skeleton, StatusDot } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/client/api";
import { ConnectionForm, type ConnectionInfo, type ProviderInfo, type TestResult } from "./connection-form";

export function statusBadge(c: Pick<ConnectionInfo, "status">) {
  if (c.status === "connected") return <Badge variant="success">connected</Badge>;
  if (c.status === "error") return <Badge variant="danger">error</Badge>;
  return <Badge variant="outline">untested</Badge>;
}

/**
 * Workspace integrations: list, add, test and remove connections (secrets are never displayed).
 * Intended for the workspace settings page; `canManage` = admin/owner.
 */
export function ConnectionsManager({ workspaceId, canManage, providerFilter }: { workspaceId: string; canManage: boolean; providerFilter?: (p: ProviderInfo) => boolean }) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [removing, setRemoving] = useState<ConnectionInfo | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api<{ providers: ProviderInfo[]; connections: ConnectionInfo[] }>(`/api/v1/integrations?workspaceId=${encodeURIComponent(workspaceId)}`);
      setProviders(providerFilter ? d.providers.filter(providerFilter) : d.providers);
      setConnections(d.connections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load integrations");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, providerFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const test = async (c: ConnectionInfo) => {
    setTesting(c.id);
    try {
      const r = await api<{ connection: ConnectionInfo; result: TestResult }>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/integrations/${encodeURIComponent(c.id)}/test`, { method: "POST" });
      setResults((x) => ({ ...x, [c.id]: r.result }));
      setConnections((list) => list.map((x) => (x.id === c.id ? r.connection : x)));
    } catch (err) {
      setResults((x) => ({ ...x, [c.id]: { ok: false, message: err instanceof Error ? err.message : "Test failed" } }));
    } finally {
      setTesting(null);
    }
  };

  const remove = async () => {
    if (!removing) return;
    try {
      await api(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/integrations/${encodeURIComponent(removing.id)}`, { method: "DELETE" });
      setConnections((list) => list.filter((x) => x.id !== removing.id));
      setRemoving(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the connection");
      setRemoving(null);
    }
  };

  const providerName = (id: string) => providers.find((p) => p.id === id)?.name ?? id;
  const visible = providerFilter ? connections.filter((c) => providers.some((p) => p.id === c.provider)) : connections;

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Connections</h3>
        {canManage ? (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden="true" /> Add connection
          </Button>
        ) : null}
      </div>
      {loading ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : visible.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card shadow-[inset_0_1px_0_var(--hairline)]">
          {visible.map((c) => {
            const r = results[c.id];
            return (
              <li key={c.id} className="settings-row space-y-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <span aria-hidden="true" className="icon-tile mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md">
                      <BrandMark id={c.provider} className="size-4" />
                    </span>
                    <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <StatusDot status={c.status === "connected" ? "ok" : c.status === "error" ? "error" : "idle"} />
                      <span className="truncate">{c.name}</span>
                      <Badge>{providerName(c.provider)}</Badge>
                      {statusBadge(c)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {Object.entries(c.config)
                        .filter(([k]) => !c.secretKeys.includes(k))
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ") || "No public settings"}
                      {c.secretKeys.length ? ` · secrets: ${c.secretKeys.join(", ")}` : ""}
                    </p>
                    {c.lastTestedAt ? (
                      <p className="text-[11px] text-muted-foreground">
                        Last tested {new Date(c.lastTestedAt).toLocaleString()}
                        {c.lastError ? ` — ${c.lastError}` : ""}
                      </p>
                    ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" onClick={() => test(c)} loading={testing === c.id}>
                      Test
                    </Button>
                    {canManage ? (
                      <Button size="sm" variant="ghost" onClick={() => setRemoving(c)} aria-label={`Delete ${c.name}`}>
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                {r ? (
                  <Alert variant={r.ok ? "success" : "danger"} title={r.ok ? "Connection works" : "Connection failed"}>
                    {r.message}
                  </Alert>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<Plug className="size-8" aria-hidden="true" />} title="No connections yet" description={canManage ? "Add a database or provider connection for this workspace." : "Ask a workspace admin to add a connection."} />
      )}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent title="Add connection" description="Secrets are encrypted at rest and never shown again.">
          <ConnectionForm
            workspaceId={workspaceId}
            providers={providers}
            onCancel={() => setAdding(false)}
            onCreated={(c, t) => {
              setConnections((list) => [c, ...list]);
              if (t) setResults((x) => ({ ...x, [c.id]: t }));
              setAdding(false);
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(removing)} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent title={`Delete ${removing?.name ?? "connection"}?`} description="The stored credentials are deleted. Projects using this connection will lose access.">
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
