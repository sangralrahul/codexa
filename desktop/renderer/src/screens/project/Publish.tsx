import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Gauge, Globe, History, Rocket, RotateCcw, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { ApiError, deployApi, publishingApi, type Deployment, type DeploymentReport, type Provider } from "../../lib/api";
import { cn, relativeTime } from "../../lib/util";
import { Badge, Button, Dialog, Spinner, Tip, toast } from "../../ui";

const ACTIVE = new Set(["queued", "building", "deploying"]);
const STEP_LABEL: Record<string, string> = { queued: "Queued", building: "Building your app", deploying: "Putting it online" };
const STEPS = [
  { label: "Build", status: ["queued", "building"] },
  { label: "Deploy", status: ["deploying"] },
  { label: "Live", status: ["live"] },
];
const STATUS: Record<Deployment["status"], { label: string; tone: "neutral" | "success" | "warning" | "danger" | "accent" }> = {
  queued: { label: "Queued", tone: "warning" },
  building: { label: "Building", tone: "warning" },
  deploying: { label: "Deploying", tone: "warning" },
  live: { label: "Live", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  rolled_back: { label: "Previous", tone: "neutral" },
};

/** Publish to Codexa hosting: start a deployment, follow it to live (or failed), then share the link. */
export function PublishDialog({ projectId, open, onClose, canPublish, onChanged }: { projectId: string; open: boolean; onClose: () => void; canPublish: boolean; onChanged?: () => void }) {
  const [list, setList] = useState<{ deployments: Deployment[]; providers: Provider[] } | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [report, setReport] = useState<DeploymentReport | null | "none">(null);
  const [tracking, setTracking] = useState<Deployment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    const [r, p] = await Promise.all([deployApi.list(projectId), publishingApi.get(projectId).catch(() => null)]);
    setList(r);
    setCanManage(Boolean(p?.canManage));
    const running = r.deployments.find((d) => ACTIVE.has(d.status));
    if (running) setTracking(running);
    return r;
  };

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fresh state each time the dialog opens
    setError(null);
    load().catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't load deployments"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is stable for a given project
  }, [open, projectId]);

  useEffect(() => {
    if (!tracking || !ACTIVE.has(tracking.status)) return;
    timer.current = setInterval(async () => {
      try {
        const { deployment } = await deployApi.get(projectId, tracking.id);
        setTracking(deployment);
        if (!ACTIVE.has(deployment.status)) {
          setList((l) => (l ? { ...l, deployments: [deployment, ...l.deployments.filter((d) => d.id !== deployment.id)] } : l));
          setReport(null);
          onChanged?.();
          if (deployment.status === "live") toast.success("Your app is live", deployment.url ?? undefined);
        }
      } catch {
        // keep polling
      }
    }, 2500);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [tracking, projectId, onChanged]);

  const codexa = list?.providers.find((p) => p.id === "codexa");
  const live = list?.deployments.find((d) => d.status === "live" && d.url);
  const working = tracking ? ACTIVE.has(tracking.status) : false;

  // Speed & SEO report for the live version (only Codexa-hosted versions have one).
  useEffect(() => {
    if (!open || !live || report !== null) return;
    deployApi
      .report(projectId, live.id)
      .then(setReport)
      .catch(() => setReport("none"));
  }, [open, live, report, projectId]);

  const publish = async () => {
    setError(null);
    setBusy("publish");
    try {
      const { deployment } = await deployApi.create(projectId);
      setTracking(deployment);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't start publishing");
    } finally {
      setBusy(null);
    }
  };
  const rollback = async (d: Deployment) => {
    setBusy(d.id);
    try {
      await deployApi.rollback(projectId, d.id);
      await load();
      setReport(null);
      onChanged?.();
      toast.success("Rolled back", `Your site now serves the version from ${relativeTime(d.createdAt)}.`);
    } catch (e) {
      toast.error("Couldn't roll back", e instanceof ApiError ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  };
  const unpublish = async () => {
    setBusy("unpublish");
    try {
      await publishingApi.unpublish(projectId);
      setConfirmUnpublish(false);
      await load();
      onChanged?.();
      toast.success("Site taken offline", "Publish again any time to bring it back.");
    } catch (e) {
      toast.error("Couldn't unpublish", e instanceof ApiError ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  };

  const history = (list?.deployments ?? []).filter((d) => !ACTIVE.has(d.status)).slice(0, 5);
  const rep = report && report !== "none" ? report.report : null;
  const issues = rep ? rep.findings.filter((f) => f.severity !== "pass") : [];

  return (
    <Dialog open={open} onClose={onClose} title="Publish" description="Put your app on the web with Codexa hosting. Every publish is a new version; you can roll back to any of them." width={560}>
      {!list && !error ? (
        <div className="flex h-24 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          {live && !working ? (
            <section className="overflow-hidden rounded-lg border border-border" aria-label="Live version">
              <div className="flex items-center gap-2 px-3.5 pt-3">
                <Badge tone="success">
                  <span className="ws-dot bg-success" /> Live
                </Badge>
                <span className="text-[12px] text-muted">Published {relativeTime(live.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1 px-3.5 pb-3 pt-2.5">
                <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-panel px-2.5">
                  <Globe className="size-3.5 shrink-0 text-dim" aria-hidden="true" />
                  <span className="selectable mono min-w-0 truncate text-[12.5px] text-fg">{live.url}</span>
                </div>
                <Tip label={copied ? "Copied" : "Copy link"}>
                  <button
                    type="button"
                    className="ws-icon"
                    aria-label="Copy link"
                    onClick={async () => {
                      await navigator.clipboard.writeText(live.url!);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                  >
                    {copied ? <Check className="text-success" /> : <Copy />}
                  </button>
                </Tip>
                <Button size="sm" variant="secondary" onClick={() => void window.codexa.openExternal(live.url!)}>
                  <ExternalLink className="!size-3.5" /> Open
                </Button>
              </div>
              {rep ? (
                <div className="grid grid-cols-3 divide-x divide-border border-t border-border bg-panel dark:bg-surface/40">
                  <Score icon={Gauge} label="Performance" value={rep.score.performance} />
                  <Score icon={Search} label="SEO" value={rep.score.seo} />
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                    <ShieldCheck className={cn("size-4 shrink-0", issues.length ? "text-warning" : "text-success")} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold tabular-nums">{issues.length ? `${issues.length} to review` : "No issues"}</span>
                      <span className="block text-[11px] text-muted">Security & quality</span>
                    </span>
                  </div>
                </div>
              ) : report === null ? (
                <p className="flex items-center gap-2 border-t border-border bg-panel px-3.5 py-2.5 text-[12px] text-dim dark:bg-surface/40">
                  <Spinner className="size-3.5" /> Checking speed and SEO…
                </p>
              ) : null}
            </section>
          ) : null}

          {working && tracking ? (
            <section className="rounded-lg border border-border p-4" aria-label="Publishing progress" aria-live="polite">
              <ol className="flex items-center gap-2">
                {STEPS.map((s, i) => {
                  const idx = STEPS.findIndex((x) => x.status.includes(tracking.status));
                  const state = i < idx ? "done" : i === idx ? "active" : "next";
                  return (
                    <li key={s.label} className="flex min-w-0 flex-1 items-center gap-2" aria-current={state === "active" ? "step" : undefined}>
                      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", state === "done" ? "bg-success text-bg" : state === "active" ? "bg-fg text-bg" : "bg-surface text-dim ring-1 ring-border")}>
                        {state === "done" ? <Check className="size-3.5" /> : state === "active" ? <Spinner className="size-3.5 text-bg" /> : <span className="mono">{i + 1}</span>}
                      </span>
                      <span className={cn("truncate text-[12.5px] font-medium", state === "next" ? "text-dim" : "text-fg")}>{s.label}</span>
                      {i < STEPS.length - 1 ? <span className={cn("h-px min-w-4 flex-1", state === "done" ? "bg-success" : "bg-border")} /> : null}
                    </li>
                  );
                })}
              </ol>
              <p className="mt-3 text-[12.5px] text-muted">{STEP_LABEL[tracking.status] ?? "Publishing"}… this usually takes under a minute. You can keep working.</p>
            </section>
          ) : null}

          {tracking && tracking.status === "failed" ? <Notice tone="danger">The build failed{tracking.error ? `: ${tracking.error}` : "."} Check the code or ask the AI to fix it, then try again.</Notice> : null}
          {codexa && !codexa.available ? <Notice tone="warning">{codexa.reason ?? "Codexa hosting isn't available on this server."}</Notice> : null}
          {error ? <Notice tone="danger">{error}</Notice> : null}

          {!live && !working && history.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-strong px-4 py-7 text-center">
              <span className="mx-auto flex size-9 items-center justify-center rounded-lg border border-border bg-panel text-dim">
                <Rocket className="size-4" />
              </span>
              <p className="mt-3 text-[13.5px] font-semibold">Not published yet</p>
              <p className="mx-auto mt-1 max-w-[340px] text-[12.5px] leading-relaxed text-muted">Publishing builds your app, checks it for security and speed, and puts it on a codexa address you can share.</p>
            </div>
          ) : null}

          {history.length ? (
            <section aria-label="Versions">
              <p className="ws-label mb-2 flex items-center gap-1.5">
                <History className="size-3" aria-hidden="true" /> Versions
              </p>
              <ul className="overflow-hidden rounded-lg border border-border">
                {history.map((d, i) => {
                  const s = STATUS[d.status];
                  const restorable = canManage && d.url && d.status === "rolled_back";
                  return (
                    <li key={d.id} className={cn("flex h-11 items-center gap-3 px-3 transition-colors hover:bg-panel dark:hover:bg-surface/50", i > 0 && "border-t border-border")}>
                      <span className={cn("ws-dot", s.tone === "success" ? "bg-success" : s.tone === "danger" ? "bg-danger" : s.tone === "warning" ? "bg-warning" : "bg-dim")} aria-hidden="true" />
                      <span className={cn("w-[62px] shrink-0 text-[12px] font-medium", s.tone === "success" ? "text-success" : s.tone === "danger" ? "text-danger" : "text-muted")}>{s.label}</span>
                      <span className={cn("min-w-0 flex-1 truncate text-[12.5px]", d.url ? "mono text-[12px] text-fg" : "text-muted")} title={d.url ?? d.error ?? undefined}>
                        {d.url ? d.url.replace(/^https?:\/\//, "") : d.error ? d.error.slice(0, 80) : "No address"}
                      </span>
                      <time dateTime={d.createdAt} title={new Date(d.createdAt).toLocaleString()} className="mono w-[56px] shrink-0 text-right text-[10.5px] text-dim">
                        {relativeTime(d.createdAt)}
                      </time>
                      <span className="flex w-[92px] shrink-0 justify-end">
                        {restorable ? (
                          <Button size="xs" variant="secondary" loading={busy === d.id} onClick={() => void rollback(d)}>
                            {busy === d.id ? null : <RotateCcw className="!size-3.5" />} Roll back
                          </Button>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <div className="-mx-6 -mb-6 mt-5 flex items-center justify-between gap-2 rounded-b-[10px] border-t border-border bg-panel px-6 py-3 dark:bg-surface/40">
            <span className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => void window.codexa.openWeb(`/projects/${projectId}?panel=publishing`)}>
                <Globe className="!size-3.5" /> Domains & analytics
              </Button>
              {live && canManage && !working ? (
                <Button variant="ghost" size="sm" className="text-muted hover:text-danger" onClick={() => setConfirmUnpublish(true)}>
                  Unpublish
                </Button>
              ) : null}
            </span>
            <Button variant="accent" size="sm" className="px-3.5" onClick={() => void publish()} loading={working || busy === "publish"} disabled={!canPublish || (codexa ? !codexa.available : false)}>
              {working || busy === "publish" ? null : <Rocket className="!size-3.5" />} {live ? "Publish update" : "Publish"}
            </Button>
          </div>
        </div>
      )}
      <Dialog open={confirmUnpublish} onClose={() => setConfirmUnpublish(false)} title="Take your site offline?" description="Visitors will see a 'not found' page. Your versions stay in history, so you can publish again any time.">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmUnpublish(false)}>
            Cancel
          </Button>
          <Button variant="danger" loading={busy === "unpublish"} onClick={() => void unpublish()}>
            Unpublish
          </Button>
        </div>
      </Dialog>
    </Dialog>
  );
}

function Notice({ tone, children }: { tone: "danger" | "warning"; children: React.ReactNode }) {
  return (
    <p role={tone === "danger" ? "alert" : "status"} className={cn("flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12.5px] leading-relaxed", tone === "danger" ? "border-danger/30 bg-danger/[0.06] text-danger" : "border-warning/30 bg-warning/[0.07] text-warning")}>
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> <span className="min-w-0">{children}</span>
    </p>
  );
}

function Score({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: number }) {
  const tone = value >= 90 ? "text-success" : value >= 60 ? "text-warning" : "text-danger";
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5">
      <Icon className={cn("size-4 shrink-0", tone)} />
      <span>
        <span className="mono block text-[13px] font-semibold tabular-nums">{Math.round(value)}</span>
        <span className="block text-[11px] text-muted">{label}</span>
      </span>
    </div>
  );
}
