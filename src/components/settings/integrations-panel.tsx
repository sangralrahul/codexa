"use client";

import { useCallback, useEffect, useState } from "react";
import { Plug, Trash2 } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { INTEGRATION_CATEGORIES, connectableIntegrations, type IntegrationDefinition } from "@/config/integrations";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert, EmptyState, Skeleton } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { SettingsCard, tableRow } from "./section";

type Connection = { id: string; provider: string; name: string; status: string; lastTestedAt: string | null; lastError: string | null; createdAt: string; config?: Record<string, unknown> };
type State = { kind: "loading" } | { kind: "unavailable"; message: string } | { kind: "ready"; connections: Connection[] } | { kind: "error"; message: string };

/**
 * Workspace integration connections. Talks to the integrations owner's endpoints
 * (GET/POST /api/v1/workspaces/:id/integrations, POST .../:cid/test, DELETE .../:cid).
 * When those endpoints are not deployed yet the panel shows a clear "not available" state.
 */
export function IntegrationsPanel({ workspaceId, canManage }: { workspaceId: string; canManage: boolean }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [flash, setFlash] = useState<{ kind: "ok" | "error"; message: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState<IntegrationDefinition | null>(null);
  const base = `/api/v1/workspaces/${workspaceId}/integrations`;

  const fetchState = useCallback(async (): Promise<State> => {
    try {
      const r = await api<{ connections?: Connection[] }>(base);
      return { kind: "ready", connections: r.connections ?? [] };
    } catch (err) {
      if (err instanceof ClientApiError && (err.status === 404 || err.status === 501)) {
        return { kind: "unavailable", message: "Workspace connections are not available on this deployment yet. The integrations API has not been enabled." };
      }
      return { kind: "error", message: err instanceof Error ? err.message : "Could not load connections." };
    }
  }, [base]);
  const load = useCallback(() => fetchState().then(setState), [fetchState]);

  useEffect(() => {
    let cancelled = false;
    fetchState().then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchState]);

  async function test(c: Connection) {
    setBusy(c.id);
    try {
      const r = await api<{ connection?: Connection; ok?: boolean; error?: string }>(`${base}/${c.id}/test`, { method: "POST" });
      setFlash(r.ok === false || r.connection?.status === "error" ? { kind: "error", message: r.error ?? r.connection?.lastError ?? `${c.name}: connection test failed.` } : { kind: "ok", message: `${c.name}: connection test passed.` });
      await load();
    } catch (err) {
      setFlash({ kind: "error", message: err instanceof ClientApiError ? err.message : "Connection test failed." });
    } finally {
      setBusy(null);
    }
  }
  async function remove(c: Connection) {
    if (!window.confirm(`Remove the ${c.name} connection? Projects using it will lose access.`)) return;
    setBusy(c.id);
    try {
      await api(`${base}/${c.id}`, { method: "DELETE" });
      setFlash({ kind: "ok", message: `${c.name} removed.` });
      await load();
    } catch (err) {
      setFlash({ kind: "error", message: err instanceof ClientApiError ? err.message : "Could not remove the connection." });
    } finally {
      setBusy(null);
    }
  }

  const available = connectableIntegrations();
  const byCategory = INTEGRATION_CATEGORIES.map((cat) => ({ cat, items: available.filter((i) => i.category === cat.id) })).filter((g) => g.items.length);

  return (
    <div className="space-y-6">
      {flash ? <Alert variant={flash.kind === "ok" ? "success" : "danger"}>{flash.message}</Alert> : null}
      <SettingsCard
        id="connections"
        title="Connected services"
        description="Credentials are encrypted before storage and never returned to the browser."
        bodyClassName={state.kind === "ready" && state.connections.length > 0 ? "p-0 pt-4" : undefined}
      >
        {state.kind === "loading" ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading connections">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : state.kind === "unavailable" ? (
          <Alert variant="warning" title="Not available">
            {state.message} You can still add project-level environment variables from each project&apos;s settings.
          </Alert>
        ) : state.kind === "error" ? (
          <Alert variant="danger" title="Could not load connections">
            {state.message}{" "}
            <button type="button" className="underline" onClick={() => load()}>
              Retry
            </button>
          </Alert>
        ) : state.connections.length === 0 ? (
          <EmptyState icon={<Plug className="size-5" />} title="No connections yet" description="Connect a database, AI provider, payment or email service to use it from projects in this workspace." className="border-dashed p-6" />
        ) : (
          <ul>
            {state.connections.map((c) => (
              <li key={c.id} className={`${tableRow} flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm`}>
                <div className="flex min-w-0 items-center gap-3">
                  <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-xs font-semibold uppercase">
                    {c.provider.slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      <span className="truncate">{c.name}</span>
                      <Badge variant="outline" className="capitalize">
                        {c.provider}
                      </Badge>
                      <Badge variant={c.status === "connected" ? "success" : c.status === "error" ? "danger" : "warning"} className="capitalize">
                        {c.status}
                      </Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">{c.lastError ? c.lastError : c.lastTestedAt ? `Last tested ${new Date(c.lastTestedAt).toLocaleString()}` : "Not tested yet"}</p>
                  </div>
                </div>
                {canManage ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => test(c)} loading={busy === c.id}>
                      Test
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => remove(c)} disabled={busy === c.id} aria-label={`Remove ${c.name}`}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>

      <section aria-labelledby="available-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="available-heading" className="text-base font-semibold tracking-tight">
            Available integrations
          </h2>
          {!canManage ? <p className="text-xs text-muted-foreground">Only owners and admins can add connections.</p> : null}
        </div>
        {byCategory.map(({ cat, items }) => (
          <div key={cat.id}>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{cat.name}</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-border-strong">
                  <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-sm font-semibold">
                    {i.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{i.name}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{i.description}</p>
                  </div>
                  <Button variant="outline" size="sm" disabled={!canManage || state.kind !== "ready"} onClick={() => setAdding(i)} aria-label={`Connect ${i.name}`}>
                    Connect
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <Dialog open={adding !== null} onOpenChange={(o) => (!o ? setAdding(null) : null)}>
        {adding ? (
          <ConnectDialog
            def={adding}
            base={base}
            onDone={(msg) => {
              setAdding(null);
              setFlash({ kind: "ok", message: msg });
              void load();
            }}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function ConnectDialog({ def, base, onDone }: { def: IntegrationDefinition; base: string; onDone: (message: string) => void }) {
  const [name, setName] = useState(def.name);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const config: Record<string, string> = {};
    const secret: Record<string, string> = {};
    for (const f of def.configFields) {
      const v = values[f.key] ?? "";
      if (f.type === "password") secret[f.key] = v;
      else config[f.key] = v;
    }
    try {
      await api(base, { method: "POST", json: { provider: def.id, name, config, secret: Object.keys(secret).length === 1 ? Object.values(secret)[0] : secret } });
      onDone(`${name} connected. Run a test to verify the credentials.`);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not save the connection.");
      setBusy(false);
    }
  }
  return (
    <DialogContent title={`Connect ${def.name}`} description={def.description}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Connection name" htmlFor="conn-name">
          <Input id="conn-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
        </Field>
        {def.configFields.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`conn-${f.key}`} hint={f.type === "password" ? "Encrypted at rest and never shown again." : undefined}>
            {f.type === "password" ? (
              <Input id={`conn-${f.key}`} type="password" autoComplete="off" value={values[f.key] ?? ""} onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))} required={f.required} placeholder={f.placeholder} />
            ) : f.type === "url" ? (
              <Input id={`conn-${f.key}`} type="url" value={values[f.key] ?? ""} onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))} required={f.required} placeholder={f.placeholder} />
            ) : (
              <Input id={`conn-${f.key}`} value={values[f.key] ?? ""} onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))} required={f.required} placeholder={f.placeholder} />
            )}
          </Field>
        ))}
        {def.configFields.length === 0 ? <p className="text-sm text-muted-foreground">This integration needs no configuration values.</p> : null}
        {error ? <Alert variant="danger">{error}</Alert> : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" loading={busy}>
            Save connection
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
