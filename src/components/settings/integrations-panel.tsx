"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, Plug, Search, Trash2, X } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { shakeElement } from "@/lib/client/motion";
import { INTEGRATION_CATEGORIES, connectableIntegrations, getIntegration, type IntegrationDefinition } from "@/config/integrations";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert, Skeleton, StatusDot } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { BrandMark, hasBrandMark } from "@/components/brand/brand-mark";
import { SettingsCard, tableRow } from "./section";
import { absoluteTime, relativeTime } from "./usage-model";

type Connection = { id: string; provider: string; name: string; status: string; lastTestedAt: string | null; lastError: string | null; createdAt: string; config?: Record<string, unknown> };
type State = { kind: "loading" } | { kind: "unavailable"; message: string } | { kind: "ready"; connections: Connection[] } | { kind: "error"; message: string };
type TestPhase = "testing" | "ok" | "fail";

const UNAVAILABLE = "Workspace connections are not available on this deployment yet. The integrations API has not been enabled.";

function BrandTile({ id, className }: { id: string; className?: string }) {
  // Brands without a licensed mark get a plain initial, not BrandMark's bordered monogram (a box inside the tile read as a placeholder).
  const initial = (getIntegration(id)?.name ?? id).replace(/[^A-Za-z0-9]/g, "").slice(0, 1).toUpperCase() || "?";
  return (
    <span aria-hidden="true" className={cn("brand-tile icon-tile flex size-10 shrink-0 items-center justify-center rounded-[11px] text-foreground", className)}>
      {hasBrandMark(id) ? <BrandMark id={id} className="size-[18px]" /> : <span className="font-display text-[17px] font-semibold leading-none tracking-[-0.03em]">{initial}</span>}
    </span>
  );
}

/** Test: label → spinner → drawn check (passed) or × with a shake (failed), then back to idle. */
function TestButton({ phase, onClick, name }: { phase: TestPhase | undefined; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; name: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={phase === "testing"}
      aria-label={`Test ${name}`}
      data-phase={phase}
      className={cn("relative min-w-[4.25rem] overflow-hidden", phase === "ok" && "border-success/40 text-success", phase === "fail" && "border-danger/40 text-danger")}
    >
      <span className={cn("transition-[opacity,transform] duration-200", phase ? "-translate-y-1 opacity-0" : "opacity-100")}>Test</span>
      <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
        {phase === "testing" ? (
          <svg viewBox="0 0 16 16" className="size-4 animate-spin">
            <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.75" />
            <path d="M8 1.75a6.25 6.25 0 0 1 6.25 6.25" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        ) : phase === "ok" ? (
          <svg viewBox="0 0 16 16" className="check-draw size-4">
            <path d="M3.5 8.5 6.6 11.5 12.5 5" pathLength={1} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : phase === "fail" ? (
          <X className="size-4" />
        ) : null}
      </span>
    </Button>
  );
}

/**
 * Workspace integration connections (GET/POST /api/v1/workspaces/:id/integrations, POST …/:cid/test,
 * DELETE …/:cid). Brand marks are nominative only. When the API is not deployed (404/501) the panel
 * says so, and every Connect button explains why it is disabled. Secrets are never shown.
 */
export function IntegrationsPanel({ workspaceId, canManage, canTest }: { workspaceId: string; canManage: boolean; canTest?: boolean }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [adding, setAdding] = useState<IntegrationDefinition | null>(null);
  const [removing, setRemoving] = useState<Connection | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [tests, setTests] = useState<Record<string, TestPhase>>({});
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set());
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const base = `/api/v1/workspaces/${workspaceId}/integrations`;
  const tester = canTest ?? canManage;

  const fetchState = useCallback(async (): Promise<State> => {
    try {
      const r = await api<{ connections?: Connection[] }>(base);
      return { kind: "ready", connections: r.connections ?? [] };
    } catch (err) {
      if (err instanceof ClientApiError && (err.status === 404 || err.status === 501)) return { kind: "unavailable", message: UNAVAILABLE };
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

  const replace = (c: Connection) => setState((s) => (s.kind === "ready" ? { ...s, connections: s.connections.map((x) => (x.id === c.id ? { ...x, ...c } : x)) } : s));

  async function test(c: Connection, el: HTMLElement | null) {
    setTests((t) => ({ ...t, [c.id]: "testing" }));
    let phase: TestPhase = "fail";
    try {
      const r = await api<{ connection?: Connection; ok?: boolean; error?: string | null }>(`${base}/${c.id}/test`, { method: "POST" });
      if (r.connection) replace(r.connection);
      const failed = r.ok === false || r.connection?.status === "error";
      phase = failed ? "fail" : "ok";
      if (failed) toast.error(`${c.name}: test failed`, r.error ?? r.connection?.lastError ?? undefined);
      else toast.success(`${c.name}: connection works`);
    } catch (err) {
      toast.error(`${c.name}: test failed`, err instanceof ClientApiError ? err.message : "Connection test failed.");
    }
    setTests((t) => ({ ...t, [c.id]: phase }));
    if (phase === "fail") shakeElement(el, 4);
    window.setTimeout(() => setTests((t) => {
      const n = { ...t };
      delete n[c.id];
      return n;
    }), 1800);
  }

  async function confirmRemove() {
    const c = removing;
    if (!c) return;
    setRemoveBusy(true);
    try {
      await api(`${base}/${c.id}`, { method: "DELETE" });
      setRemoving(null);
      setLeaving((s) => new Set(s).add(c.id));
      window.setTimeout(() => {
        setState((s) => (s.kind === "ready" ? { ...s, connections: s.connections.filter((x) => x.id !== c.id) } : s));
        setLeaving((s) => {
          const n = new Set(s);
          n.delete(c.id);
          return n;
        });
      }, 260);
      toast.success(`${c.name} removed`);
    } catch (err) {
      toast.error("Could not remove the connection", err instanceof ClientApiError ? err.message : undefined);
    } finally {
      setRemoveBusy(false);
    }
  }

  const available = useMemo(() => connectableIntegrations(), []);
  const categories = useMemo(() => INTEGRATION_CATEGORIES.map((cat) => ({ ...cat, count: available.filter((i) => i.category === cat.id).length })).filter((c) => c.count > 0), [available]);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = available.filter((i) => (category === "all" || i.category === category) && words.every((w) => `${i.name} ${i.description} ${i.category} ${(i.tags ?? []).join(" ")}`.toLowerCase().includes(w)));
  const disabledReason = !canManage ? "Only owners and admins can add connections." : state.kind === "loading" ? "Loading connections…" : state.kind === "unavailable" ? "Workspace connections are not available on this deployment." : state.kind === "error" ? "Connections could not be loaded. Retry above." : null;
  const connections = state.kind === "ready" ? state.connections : [];

  return (
    <div className="settings-sub space-y-6">
      <SettingsCard
        id="connections"
        icon={<Plug />}
        title={
          <>
            Connected services {state.kind === "ready" ? <span className="font-normal text-muted-foreground">{connections.length}</span> : null}
          </>
        }
        description="Services that projects in this workspace can use. Run a test to check a connection's credentials."
        flush={state.kind === "ready" && connections.length > 0}
      >
        {state.kind === "loading" ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading connections">
            <Skeleton className="h-14 w-full rounded-md" />
            <Skeleton className="h-14 w-full rounded-md" />
          </div>
        ) : state.kind === "unavailable" ? (
          <Alert variant="warning" title="Not available">
            {state.message} You can still add project-level environment variables from each project&apos;s settings.
          </Alert>
        ) : state.kind === "error" ? (
          <Alert
            variant="danger"
            title="Could not load connections"
            action={
              <Button variant="outline" size="sm" onClick={() => load()}>
                Retry
              </Button>
            }
          >
            {state.message}
          </Alert>
        ) : connections.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-md border border-dashed border-border-strong p-5 sm:flex-row sm:items-center">
            <div className="flex gap-1.5" aria-hidden="true">
              {["postgres", "anthropic", "stripe"].map((id) => (
                <BrandTile key={id} id={id} className="size-9 opacity-80" />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">No connections yet</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">Connect a database, AI provider, payment or email service to use it from projects in this workspace.</p>
            </div>
          </div>
        ) : (
          <ul>
            {connections.map((c) => {
              const def = getIntegration(c.provider);
              const phase = tests[c.id];
              const status = c.status === "connected" ? { dot: "ok" as const, label: "Connected" } : c.status === "error" ? { dot: "error" as const, label: "Failing" } : { dot: "idle" as const, label: "Not tested" };
              return (
                <li key={c.id} className={cn("diff-row", fresh.has(c.id) && "materialize")} data-collapsed={leaving.has(c.id) ? "" : undefined}>
                  <div className={cn(tableRow, "flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm sm:px-6", fresh.has(c.id) && "row-sweep")}>
                    <div className="flex min-w-0 items-center gap-3">
                      <BrandTile id={c.provider} />
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium">
                          <span className="truncate">{c.name}</span>
                          <span className="text-xs font-normal text-muted-foreground">{def?.name ?? c.provider}</span>
                        </p>
                        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                          <StatusDot status={status.dot} />
                          <span className={cn(c.status === "error" && "text-danger")}>{status.label}</span>
                          <span aria-hidden="true">·</span>
                          {c.lastTestedAt ? (
                            <Tooltip content={absoluteTime(c.lastTestedAt)}>
                              <span tabIndex={0} className="rounded underline decoration-dotted decoration-border-strong underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-ring" suppressHydrationWarning>
                                last tested {relativeTime(c.lastTestedAt)}
                              </span>
                            </Tooltip>
                          ) : (
                            <span>never tested</span>
                          )}
                        </p>
                        {c.lastError ? <p className="mt-0.5 line-clamp-2 text-xs text-danger [overflow-wrap:anywhere]">{c.lastError}</p> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {tester ? <TestButton name={c.name} phase={phase} onClick={(e) => void test(c, e.currentTarget)} /> : null}
                      {canManage ? (
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => setRemoving(c)} disabled={phase === "testing"} aria-label={`Remove ${c.name}`}>
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SettingsCard>

      <section id="available" aria-labelledby="available-heading" className="scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="available-heading" className="text-[15px] font-semibold tracking-[-0.01em]">
              Available integrations
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{!canManage ? "Only owners and admins can add connections." : `${available.length} services you can connect to this workspace.`}</p>
          </div>
          <div className="relative w-full sm:w-60">
            <label htmlFor="integration-search" className="sr-only">
              Search integrations
            </label>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground-dim" aria-hidden="true" />
            <Input id="integration-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search integrations" className="h-9 pl-8 text-[13px]" autoComplete="off" />
          </div>
        </div>
        <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          <Segmented
            aria-label="Category"
            size="sm"
            value={category}
            onValueChange={setCategory}
            options={[{ value: "all", label: "All", count: available.length }, ...categories.map((c) => ({ value: c.id, label: c.name, count: c.count }))]}
          />
        </div>
        <p className="sr-only" aria-live="polite">
          {shown.length ? `${shown.length} integration${shown.length === 1 ? "" : "s"} shown` : "No integration matches"}
        </p>
        {shown.length ? (
          <ul key={`${category}:${query}`} className="tile-flow grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((i) => {
              const cat = INTEGRATION_CATEGORIES.find((c) => c.id === i.category)?.name ?? i.category;
              const secret = i.configFields.some((f) => f.type === "password");
              const reasonId = `connect-${i.id}-reason`;
              const button = (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-55"
                  aria-disabled={disabledReason ? true : undefined}
                  aria-describedby={disabledReason ? reasonId : undefined}
                  data-no-ripple={disabledReason ? "" : undefined}
                  onClick={() => {
                    if (!disabledReason) setAdding(i);
                  }}
                  aria-label={`Connect ${i.name}`}
                >
                  {disabledReason ? <Lock className="size-3" aria-hidden="true" /> : null}
                  Connect
                </Button>
              );
              return (
                <li key={i.id} className="int-tile glow-card flex flex-col rounded-md border border-border p-4">
                  <div className="relative z-[2] flex items-start gap-3">
                    <BrandTile id={i.id} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{i.name}</p>
                      <p className="text-xs text-foreground-dim">{cat}</p>
                    </div>
                  </div>
                  <p className="relative z-[2] mt-3 line-clamp-3 flex-1 text-pretty text-[13px] leading-relaxed text-muted-foreground" title={i.description}>
                    {i.description}
                  </p>
                  <div className="relative z-[2] mt-4 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-mono text-[11px] text-foreground-dim" title={secret ? "Secret values are encrypted at rest" : undefined}>
                      {i.configFields.length} field{i.configFields.length === 1 ? "" : "s"}
                      {secret ? " · encrypted" : ""}
                    </span>
                    {disabledReason ? <Tooltip content={disabledReason}>{button}</Tooltip> : button}
                    {disabledReason ? (
                      <span id={reasonId} className="sr-only">
                        {disabledReason}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-border-strong px-4 py-8 text-center text-[13px] text-muted-foreground">
            No integration matches “{query}”{category !== "all" ? " in this category" : ""}.{" "}
            <button
              type="button"
              className="rounded font-medium text-foreground underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
            >
              Clear filters
            </button>
          </p>
        )}
        <p className="text-xs text-foreground-dim">Trademarks belong to their owners; no partnership implied.</p>
      </section>

      <Dialog open={adding !== null} onOpenChange={(o) => (!o ? setAdding(null) : null)}>
        {adding ? (
          <ConnectDialog
            def={adding}
            base={base}
            onDone={(connection, msg) => {
              setAdding(null);
              toast.success(msg);
              if (connection) {
                setState((s) => (s.kind === "ready" ? { ...s, connections: [connection, ...s.connections.filter((x) => x.id !== connection.id)] } : s));
                setFresh((s) => new Set(s).add(connection.id));
              } else void load();
              document.getElementById("connections")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        ) : null}
      </Dialog>

      <Dialog open={removing !== null} onOpenChange={(o) => (!o ? setRemoving(null) : null)}>
        {removing ? (
          <DialogContent title={`Remove ${removing.name}?`} description="The stored credentials are deleted. Projects using this connection will lose access.">
            <div className="flex items-center gap-3 rounded-md border border-border bg-surface/60 p-3">
              <BrandTile id={removing.provider} className="size-9" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{removing.name}</p>
                <p className="text-xs text-muted-foreground">{getIntegration(removing.provider)?.name ?? removing.provider}</p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Keep connection</Button>
              </DialogClose>
              <Button variant="danger" loading={removeBusy} onClick={confirmRemove}>
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function ConnectDialog({ def, base, onDone }: { def: IntegrationDefinition; base: string; onDone: (connection: Connection | null, message: string) => void }) {
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
      const r = await api<{ connection?: Connection }>(base, { method: "POST", json: { provider: def.id, name, config, secret: Object.keys(secret).length === 1 ? Object.values(secret)[0] : secret } });
      onDone(r.connection ?? null, `${name} connected. Run a test to verify the credentials.`);
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
          <Field key={f.key} label={f.label} htmlFor={`conn-${f.key}`} optional={!f.required} hint={f.type === "password" ? "Encrypted at rest and never shown again." : undefined}>
            <Input
              id={`conn-${f.key}`}
              type={f.type === "password" ? "password" : f.type === "url" ? "url" : "text"}
              autoComplete="off"
              spellCheck={false}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
              required={f.required}
              placeholder={f.placeholder}
              className={f.type !== "text" ? "font-mono text-[13px]" : undefined}
            />
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
