"use client";

import * as React from "react";
import { BarChart3, Check, CheckCircle2, Clock, Copy, ExternalLink, Globe, History, Loader2, Plus, Power, RefreshCw, Rocket, RotateCcw, Settings2, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { IN_PROGRESS, useDeployments } from "@/lib/client/workspace/deployments";
import { stripAnsi } from "@/lib/client/workspace/problems";
import type { DeploymentDto } from "@/lib/runtime/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, EmptyState, LiveDot, Skeleton } from "@/components/ui/misc";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { relativeTime } from "@/components/projects/format";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./confirm-dialog";
import { SheetHeading } from "./drawer";

type Publishing = {
  siteName: string;
  customName: boolean;
  host: string | null;
  hostingConfigured: boolean;
  live: { id: string; url: string | null; publishedAt: string } | null;
  offline: boolean;
};
type DomainRecord = { type: "CNAME" | "TXT"; name: string; value: string; purpose: string };
type Domain = { id: string; domain: string; verified: boolean; verifiedAt: string | null; createdAt: string; records: DomainRecord[] };
type Analytics = { days: number; series: { day: string; views: number }[]; total: number; last7: number; prev7: number };
type PublishingData = { publishing: Publishing; domains: Domain[]; analytics: Analytics; canManage: boolean };

const STATUS_BADGE: Record<DeploymentDto["status"], { label: string; variant: "default" | "primary" | "success" | "warning" | "danger" | "outline" }> = {
  queued: { label: "Queued", variant: "default" },
  building: { label: "Building", variant: "primary" },
  deploying: { label: "Deploying", variant: "primary" },
  live: { label: "Live", variant: "success" },
  failed: { label: "Failed", variant: "danger" },
  rolled_back: { label: "Previous", variant: "outline" },
};

const message = (err: unknown) => (err instanceof ClientApiError || err instanceof Error ? err.message : "Something went wrong");
const fmt = (n: number) => n.toLocaleString("en-US");
const shortUrl = (u: string) => u.replace(/^https?:\/\//, "").replace(/\/$/, "");

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = React.useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      {done ? <Check className="size-3.5 text-success" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
    </button>
  );
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-[14px] border border-border bg-card p-4 shadow-[inset_0_1px_0_var(--hairline)]", className)}>{children}</section>;
}

function CardTitle({ icon, children, aside }: { icon: React.ReactNode; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold [&_svg]:size-4 [&_svg]:text-muted-foreground">
        {icon}
        {children}
      </h3>
      {aside}
    </div>
  );
}

/** Thirty-day page views as simple bars (CSS only, no chart library). */
function ViewsChart({ analytics }: { analytics: Analytics }) {
  const max = Math.max(1, ...analytics.series.map((s) => s.views));
  return (
    <figure>
      <div className="flex h-36 items-end gap-[3px]" role="img" aria-label={`Page views per day for the last ${analytics.days} days. Total ${analytics.total}.`}>
        {analytics.series.map((s) => (
          <div key={s.day} className="group/bar relative flex h-full flex-1 items-end">
            <div className={cn("w-full rounded-t-[3px] transition-colors", s.views ? "bg-foreground/70 group-hover/bar:bg-foreground" : "bg-border")} style={{ height: `${Math.max(s.views ? 4 : 2, (s.views / max) * 100)}%` }} />
            <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-1.5 py-0.5 text-[10.5px] text-background group-hover/bar:block">
              {new Date(`${s.day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} · {fmt(s.views)}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{new Date(`${analytics.series[0].day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span>
        <span>Today</span>
      </figcaption>
    </figure>
  );
}

/**
 * Publishing, as one pane with tabs (Overview, Domains, Analytics, History, Settings): the live
 * address and a republish button, custom domains with the DNS records to create and a real
 * ownership check, page views counted by the Worker that serves the site, every published
 * version with its build log and rollback, and the site's name and "take offline". Publishing a
 * version still happens through the shared deployments state, so the header pill stays in sync.
 */
export function PublishingSheet({ projectId, open, onOpenChange, initialTab = "overview" }: { projectId: string; open: boolean; onOpenChange: (o: boolean) => void; initialTab?: string }) {
  const d = useDeployments();
  const [tab, setTab] = React.useState(initialTab);
  const [data, setData] = React.useState<PublishingData | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const base = `/api/v1/projects/${encodeURIComponent(projectId)}`;

  const load = React.useCallback(async () => {
    try {
      setData(await api<PublishingData>(`${base}/publishing`));
      setLoadError(null);
    } catch (err) {
      setLoadError(message(err));
    }
  }, [base]);

  // Each time the pane opens: back to the requested tab, and fresh data.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTab(initialTab);
  }
  React.useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- fetches on open; state is set after the request resolves */
    void load();
    if (!d.data) void d.load();
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when the pane opens
  }, [open]);

  // Reload publishing state after a deployment goes live or a rollback lands.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the request resolves
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the live deployment id
  }, [d.live?.id]);

  const pub = data?.publishing;
  const canManage = data?.canManage ?? false;
  const tracked = d.tracked;
  const inProgress = tracked ? IN_PROGRESS.includes(tracked.status) : false;
  const codexa = d.data?.providers.find((p) => p.id === "codexa");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="[--btn-radius:10px]"
        title={<SheetHeading icon={<Rocket className="size-4" aria-hidden="true" />} title="Publishing" />}
        description="Your live site, domains, traffic and every published version."
        width={720}
      >
        {loadError && !data ? (
          <Alert variant="danger" title="Could not load publishing">
            {loadError}
          </Alert>
        ) : null}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="underline" aria-label="Publishing sections" className="mb-5 w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="domains">
              Domains{data?.domains.length ? <span className="ml-1 tabular-nums text-muted-foreground">{data.domains.length}</span> : null}
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* ---------------- Overview ---------------- */}
          <TabsContent value="overview" className="space-y-4">
            {!pub ? (
              <Skeleton className="h-40 w-full rounded-[14px]" />
            ) : (
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {pub.live ? (
                        <Badge variant="success" className="gap-1">
                          <LiveDot /> Live
                        </Badge>
                      ) : pub.offline ? (
                        <Badge variant="outline">Offline</Badge>
                      ) : (
                        <Badge variant="default">Not published</Badge>
                      )}
                      {inProgress ? (
                        <Badge variant="primary" className="gap-1">
                          <Loader2 className="size-3 animate-spin" aria-hidden="true" /> {STATUS_BADGE[tracked!.status].label}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-3 text-[12px] text-muted-foreground">Address</p>
                    <div className="mt-1 flex min-w-0 items-center gap-1.5">
                      <Globe className={cn("size-4 shrink-0", pub.live ? "text-success" : "text-muted-foreground")} aria-hidden="true" />
                      {pub.live?.url ? (
                        <>
                          <a href={pub.live.url} target="_blank" rel="noopener noreferrer" className="truncate font-mono text-[13.5px] font-medium hover:underline">
                            {shortUrl(pub.live.url)}
                          </a>
                          <CopyButton value={pub.live.url} label="Copy site address" />
                        </>
                      ) : (
                        <span className="truncate font-mono text-[13.5px] text-muted-foreground">{pub.host ?? "Hosting is not configured on this server"}</span>
                      )}
                    </div>
                    {pub.live ? <p className="mt-2 text-[12px] text-muted-foreground">Published {relativeTime(pub.live.publishedAt)}</p> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {pub.live?.url ? (
                      <Button asChild size="sm" variant="outline" appearance="app">
                        <a href={pub.live.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3.5" aria-hidden="true" /> Visit
                        </a>
                      </Button>
                    ) : null}
                    <Button size="sm" appearance="app" onClick={() => void d.publish("codexa")} loading={d.publishing || inProgress} disabled={!d.canDeploy || !codexa?.available || inProgress}>
                      <RefreshCw className="size-3.5" aria-hidden="true" /> {pub.live ? "Republish" : "Publish"}
                    </Button>
                  </div>
                </div>
                {!codexa?.available && codexa?.reason ? <p className="mt-3 text-[12px] text-muted-foreground">{codexa.reason}</p> : null}
                {!d.canDeploy ? <p className="mt-3 text-[12px] text-muted-foreground">Only editors, admins and owners can publish.</p> : null}
                {d.publishError ? (
                  <Alert variant="danger" className="mt-3" title="Publishing failed">
                    {d.publishError}
                  </Alert>
                ) : null}
                {tracked && (inProgress || tracked.status === "failed") ? (
                  <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-code-border bg-code-bg p-2.5 font-mono text-[11px] leading-5 text-code-fg" aria-label="Build log">
                    {stripAnsi(tracked.buildLog || "Waiting for build output…").split("\n").slice(-12).join("\n")}
                  </pre>
                ) : null}
              </Card>
            )}

            {pub ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="p-3.5">
                  <p className="text-[12px] text-muted-foreground">Deployment type</p>
                  <p className="mt-1 text-[14px] font-medium">Static site</p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">Built once, served from Cloudflare&apos;s global network</p>
                </Card>
                <button type="button" onClick={() => setTab("analytics")} className="text-left focus-visible:outline-2 focus-visible:outline-ring">
                  <Card className="h-full p-3.5 transition-colors hover:border-border-strong">
                    <p className="text-[12px] text-muted-foreground">Page views · 7 days</p>
                    <p className="mt-1 text-[22px] font-semibold leading-none tabular-nums">{fmt(data!.analytics.last7)}</p>
                    <p className="mt-1 text-[11.5px] text-muted-foreground">{fmt(data!.analytics.prev7)} the week before</p>
                  </Card>
                </button>
                <button type="button" onClick={() => setTab("domains")} className="text-left focus-visible:outline-2 focus-visible:outline-ring">
                  <Card className="h-full p-3.5 transition-colors hover:border-border-strong">
                    <p className="text-[12px] text-muted-foreground">Custom domains</p>
                    <p className="mt-1 text-[22px] font-semibold leading-none tabular-nums">{data!.domains.length}</p>
                    <p className="mt-1 text-[11.5px] text-muted-foreground">{data!.domains.filter((x) => x.verified).length} verified</p>
                  </Card>
                </button>
              </div>
            ) : null}
          </TabsContent>

          {/* ---------------- Domains ---------------- */}
          <TabsContent value="domains">
            <DomainsTab base={base} data={data} canManage={canManage} onChange={load} />
          </TabsContent>

          {/* ---------------- Analytics ---------------- */}
          <TabsContent value="analytics" className="space-y-4">
            {!data ? (
              <Skeleton className="h-52 w-full rounded-[14px]" />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Last 7 days", value: data.analytics.last7 },
                    { label: "Previous 7 days", value: data.analytics.prev7 },
                    { label: `Last ${data.analytics.days} days`, value: data.analytics.total },
                  ].map((s) => (
                    <Card key={s.label} className="p-3.5">
                      <p className="text-[12px] text-muted-foreground">{s.label}</p>
                      <p className="mt-1 text-[22px] font-semibold leading-none tabular-nums">{fmt(s.value)}</p>
                    </Card>
                  ))}
                </div>
                <Card>
                  <CardTitle icon={<BarChart3 />}>Page views</CardTitle>
                  <div className="mt-4">{data.analytics.total ? <ViewsChart analytics={data.analytics} /> : <EmptyState className="py-8" icon={<BarChart3 />} title="No visits yet" description="Views appear here as people open your published site." />}</div>
                </Card>
                <p className="text-[11.5px] text-muted-foreground">Counts page loads of your site&apos;s HTML pages, per UTC day. Requests from known bots and crawlers are left out. These are page views, not unique visitors, and no cookies are set on your site.</p>
              </>
            )}
          </TabsContent>

          {/* ---------------- History ---------------- */}
          <TabsContent value="history">
            <HistoryTab />
          </TabsContent>

          {/* ---------------- Settings ---------------- */}
          <TabsContent value="settings">
            <SettingsTab base={base} data={data} canManage={canManage} onChange={load} reloadDeployments={d.load} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function DomainsTab({ base, data, canManage, onChange }: { base: string; data: PublishingData | null; canManage: boolean; onChange: () => Promise<void> }) {
  const [value, setValue] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState<Record<string, { ok: boolean; text: string }>>({});
  const [removing, setRemoving] = React.useState<Domain | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await api(`${base}/domains`, { method: "POST", json: { domain: value } });
      setValue("");
      await onChange();
    } catch (err) {
      setError(message(err));
    } finally {
      setAdding(false);
    }
  };

  const verify = async (dom: Domain) => {
    setBusy(dom.id);
    try {
      await api(`${base}/domains/${dom.id}/verify`, { method: "POST" });
      setNotes((n) => ({ ...n, [dom.id]: { ok: true, text: "Verified. Your domain is connected." } }));
      await onChange();
    } catch (err) {
      setNotes((n) => ({ ...n, [dom.id]: { ok: false, text: message(err) } }));
    } finally {
      setBusy(null);
    }
  };

  if (!data) return <Skeleton className="h-40 w-full rounded-[14px]" />;
  return (
    <div className="space-y-4">
      {canManage ? (
        <Card>
          <CardTitle icon={<Plus />}>Connect a domain</CardTitle>
          <p className="mt-1 text-[12.5px] text-muted-foreground">Use a domain you own, like shop.example.com. Codexa shows the DNS records to create, then checks them.</p>
          <form onSubmit={add} className="mt-3 flex gap-2">
            <label htmlFor="domain-input" className="sr-only">
              Domain
            </label>
            <Input id="domain-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="app.example.com" autoComplete="off" spellCheck={false} className="h-9 font-mono text-[13px]" />
            <Button type="submit" size="sm" appearance="app" loading={adding} disabled={!value.trim()} className="h-9">
              Add domain
            </Button>
          </form>
          {error ? (
            <p className="mt-2 text-[12.5px] text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </Card>
      ) : (
        <p className="text-[12.5px] text-muted-foreground">Only workspace owners and admins can connect domains.</p>
      )}

      {data.domains.length === 0 ? (
        <EmptyState className="py-8" icon={<Globe />} title="No custom domains" description={`Your site is served at ${data.publishing.host ?? "its Codexa address"}. Connect your own domain to use it instead.`} />
      ) : (
        data.domains.map((dom) => (
          <Card key={dom.id}>
            <CardTitle
              icon={dom.verified ? <ShieldCheck /> : <Clock />}
              aside={
                <div className="flex items-center gap-2">
                  {dom.verified ? <Badge variant="success">Verified</Badge> : <Badge variant="warning">Pending DNS</Badge>}
                  {canManage ? (
                    <button type="button" onClick={() => setRemoving(dom)} aria-label={`Remove ${dom.domain}`} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-ring">
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              }
            >
              <span className="font-mono">{dom.domain}</span>
            </CardTitle>
            <p className="mt-2 text-[12.5px] text-muted-foreground">{dom.verified ? `Verified ${relativeTime(dom.verifiedAt!)}. Keep these records in place.` : "Add these records at your DNS provider, then check them."}</p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[520px] text-left text-[12px]">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {dom.records.map((r) => (
                    <tr key={r.type + r.name} className="border-t border-border align-top">
                      <td className="px-3 py-2 font-mono">{r.type}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1 font-mono break-all">
                          {r.name} <CopyButton value={r.name} label={`Copy ${r.type} name`} />
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1 font-mono break-all">
                          {r.value} <CopyButton value={r.value} label={`Copy ${r.type} value`} />
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">{r.purpose}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {notes[dom.id] ? (
              <p className={cn("mt-2 flex items-start gap-1.5 text-[12.5px]", notes[dom.id].ok ? "text-success" : "text-danger")} role="status">
                {notes[dom.id].ok ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> : <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />}
                {notes[dom.id].text}
              </p>
            ) : null}
            {!dom.verified && canManage ? (
              <Button size="sm" variant="outline" appearance="app" className="mt-3" onClick={() => void verify(dom)} loading={busy === dom.id}>
                <RefreshCw className="size-3.5" aria-hidden="true" /> Check DNS
              </Button>
            ) : null}
          </Card>
        ))
      )}
      <p className="text-[11.5px] text-muted-foreground">
        The TXT record proves the domain is yours; the CNAME sends visitors to your site. For a root domain (example.com), use your DNS provider&apos;s CNAME flattening or ALIAS record. HTTPS certificates are issued automatically once traffic reaches Codexa.
      </p>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.domain ?? "domain"}?`}
        description="Visitors to this domain will no longer reach your site. You can add it again later."
        confirmLabel="Remove domain"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          await api(`${base}/domains/${removing.id}`, { method: "DELETE" });
          setRemoving(null);
          await onChange();
        }}
      />
    </div>
  );
}

function HistoryTab() {
  const d = useDeployments();
  const selected = d.tracked;
  if (!d.data) return <Skeleton className="h-40 w-full rounded-[14px]" />;
  if (d.data.deployments.length === 0) return <EmptyState className="py-10" icon={<History />} title="Nothing published yet" description="Each version you publish appears here with its build log, so you can roll back at any time." />;
  return (
    <div className="space-y-2">
      <ol className="overflow-hidden rounded-[14px] border border-border">
        {d.data.deployments.map((dep, i) => {
          const badge = STATUS_BADGE[dep.status];
          const active = selected?.id === dep.id;
          return (
            <li key={dep.id} className={cn("border-b border-border last:border-b-0", active && "bg-muted/50")}>
              <div className="flex flex-wrap items-center gap-2 px-3.5 py-3 text-sm">
                <Badge variant={badge.variant} className="gap-1">
                  {dep.status === "live" ? <LiveDot /> : IN_PROGRESS.includes(dep.status) ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : null}
                  {badge.label}
                </Badge>
                <button type="button" onClick={() => d.track(active ? null : dep.id)} className="min-w-0 flex-1 truncate text-left focus-visible:outline-2 focus-visible:outline-ring" aria-expanded={active}>
                  <span className="text-[13px] font-medium">Version {d.data!.deployments.length - i}</span>
                  <span className="ml-2 text-[12px] text-muted-foreground">
                    {relativeTime(dep.createdAt)} · {dep.provider === "codexa" ? "Codexa hosting" : "Vercel"} · <span className="font-mono">{dep.id.slice(0, 7)}</span>
                  </span>
                </button>
                {dep.url && (dep.status === "live" || dep.status === "rolled_back") ? (
                  <a href={dep.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline">
                    Open <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                ) : null}
                {dep.status === "rolled_back" && dep.url ? (
                  <Button size="sm" variant="outline" appearance="app" className="h-7 px-2.5 text-xs" onClick={() => void d.rollback(dep.id)} loading={d.rollingBack === dep.id} disabled={!d.canRollback || d.rollingBack !== null}>
                    <RotateCcw className="size-3.5" aria-hidden="true" /> Restore
                  </Button>
                ) : null}
              </div>
              {active && selected ? (
                <div className="border-t border-border px-3.5 py-3">
                  {selected.error ? <p className="mb-2 whitespace-pre-wrap text-xs text-danger">{selected.error}</p> : null}
                  <pre className="max-h-64 overflow-auto rounded-lg border border-code-border bg-code-bg p-2.5 font-mono text-[11px] leading-5 text-code-fg" aria-label="Build log">
                    {stripAnsi(selected.buildLog || "Waiting for build output…")}
                  </pre>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      {!d.canRollback ? <p className="text-[12px] text-muted-foreground">Only workspace owners and admins can restore a previous version.</p> : null}
    </div>
  );
}

function SettingsTab({ base, data, canManage, onChange, reloadDeployments }: { base: string; data: PublishingData | null; canManage: boolean; onChange: () => Promise<void>; reloadDeployments: () => Promise<void> }) {
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [confirmOffline, setConfirmOffline] = React.useState(false);
  const pub = data?.publishing;

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync the field with the loaded value
    if (pub) setName(pub.siteName);
  }, [pub?.siteName]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pub) return <Skeleton className="h-40 w-full rounded-[14px]" />;
  const suffix = pub.host ? pub.host.slice(pub.siteName.length) : "";
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNote(null);
    try {
      await api(`${base}/publishing`, { method: "PATCH", json: { siteName: name.trim().toLowerCase() } });
      setNote({ ok: true, text: pub.live ? "Saved. Your live site moved to the new address." : "Saved. Your site will be published at this address." });
      await Promise.all([onChange(), reloadDeployments()]);
    } catch (err) {
      setNote({ ok: false, text: message(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle icon={<Settings2 />}>Site address</CardTitle>
        <p className="mt-1 text-[12.5px] text-muted-foreground">The name in your free Codexa address. Lowercase letters, numbers and hyphens.</p>
        <form onSubmit={save} className="mt-3">
          <label htmlFor="site-name" className="sr-only">
            Site name
          </label>
          <div className="flex items-center gap-2">
            <div className="flex h-9 min-w-0 flex-1 items-center overflow-hidden rounded-[10px] border border-input bg-background font-mono text-[13px] focus-within:ring-2 focus-within:ring-ring">
              <input
                id="site-name"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                disabled={!canManage}
                maxLength={63}
                className="h-full min-w-0 flex-1 bg-transparent px-3 outline-none disabled:opacity-60"
                spellCheck={false}
                autoComplete="off"
              />
              {suffix ? <span className="shrink-0 pr-3 text-muted-foreground">{suffix}</span> : null}
            </div>
            <Button type="submit" size="sm" appearance="app" className="h-9" loading={saving} disabled={!canManage || !name || name === pub.siteName}>
              Save
            </Button>
          </div>
        </form>
        {note ? (
          <p className={cn("mt-2 text-[12.5px]", note.ok ? "text-success" : "text-danger")} role="status">
            {note.text}
          </p>
        ) : null}
        {!canManage ? <p className="mt-2 text-[12px] text-muted-foreground">Only workspace owners and admins can change the address.</p> : null}
      </Card>

      <Card className="border-danger/30">
        <CardTitle icon={<Power />}>Take site offline</CardTitle>
        <p className="mt-1 text-[12.5px] text-muted-foreground">Visitors see a &ldquo;not found&rdquo; page until you publish or restore a version. Your files and version history stay as they are.</p>
        <Button size="sm" variant="outline" appearance="app" className="mt-3 text-danger hover:text-danger" disabled={!canManage || !pub.live} onClick={() => setConfirmOffline(true)}>
          <Power className="size-3.5" aria-hidden="true" /> {pub.live ? "Take offline" : "Site is not live"}
        </Button>
      </Card>

      <ConfirmDialog
        open={confirmOffline}
        onOpenChange={setConfirmOffline}
        title="Take your site offline?"
        description={`${pub.live?.url ? shortUrl(pub.live.url) : "Your site"} will stop serving immediately. You can restore it from History.`}
        confirmLabel="Take offline"
        destructive
        onConfirm={async () => {
          await api(`${base}/publishing/unpublish`, { method: "POST" });
          setConfirmOffline(false);
          await Promise.all([onChange(), reloadDeployments()]);
        }}
      />
    </div>
  );
}
