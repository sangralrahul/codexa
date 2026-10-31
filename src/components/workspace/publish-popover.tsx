"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  ExternalLink,
  Gauge,
  Globe,
  Loader2,
  Rocket,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wand2,
} from "lucide-react";
import { emit } from "@/lib/client/events";
import { api } from "@/lib/client/api";
import { isCalm, useCalm } from "@/lib/client/motion";
import { IN_PROGRESS, useDeployments, type ProviderInfo } from "@/lib/client/workspace/deployments";
import { stripAnsi } from "@/lib/client/workspace/problems";
import { formatElapsed, useNow } from "@/lib/client/workspace/runtime";
import type { DeploymentDto } from "@/lib/runtime/types";
import type { Finding, ScanReport, SiteReport } from "@/lib/services/site-checks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LiveDot } from "@/components/ui/misc";
import { QrCode } from "@/components/ui/qr-code";
import { Segmented } from "@/components/ui/segmented";
import { Tooltip } from "@/components/ui/tooltip";
import { relativeTime } from "@/components/projects/format";
import { cn } from "@/lib/utils";

type StepId = "checks" | "build" | "upload" | "live";
const STEPS: { id: StepId; label: string; detail: string }[] = [
  { id: "checks", label: "Checks", detail: "Security and quality scan of your code" },
  { id: "build", label: "Build", detail: "Snapshot the files and run the production build" },
  { id: "upload", label: "Upload", detail: "Copy the built site to Codexa hosting" },
  { id: "live", label: "Live", detail: "Serve the new version at your address" },
];
const STEP_OF: Record<DeploymentDto["status"], StepId> = { queued: "build", building: "build", deploying: "upload", live: "live", failed: "build", rolled_back: "live" };

const CATEGORY = { security: { label: "Security", Icon: ShieldCheck }, seo: { label: "SEO", Icon: Search }, performance: { label: "Speed", Icon: Gauge }, quality: { label: "Quality", Icon: Sparkles } } as const;

/** Ember particles around the success check. Never in calm. */
function burst(from: HTMLElement | null) {
  if (!from || isCalm()) return;
  const r = from.getBoundingClientRect();
  for (let i = 0; i < 14; i++) {
    const p = document.createElement("span");
    p.className = "ws-particle";
    p.style.left = `${r.left + r.width / 2 - 2.5}px`;
    p.style.top = `${r.top + r.height / 2 - 2.5}px`;
    if (i % 3 === 1) p.style.background = "var(--brand-to)";
    if (i % 3 === 2) p.style.background = "var(--success)";
    document.body.appendChild(p);
    const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
    const d = 30 + Math.random() * 24;
    p.animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(0.3)`, opacity: 0 },
      ],
      { duration: 640 + Math.random() * 200, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" },
    ).onfinish = () => p.remove();
  }
}

function fixPrompt(findings: Finding[], intro: string) {
  const lines = findings.map((f) => `- ${f.title}: ${f.detail}${f.where?.length ? ` (${f.where.slice(0, 5).map((w) => (w.line ? `${w.path}:${w.line}` : w.path)).join(", ")})` : ""}`);
  return `${intro}\n${lines.join("\n")}\nFix these with minimal changes and keep the design as it is.`;
}

function FindingRow({ f }: { f: Finding }) {
  const [open, setOpen] = useState(false);
  const Icon = f.severity === "error" ? CircleAlert : f.severity === "warning" ? TriangleAlert : Check;
  return (
    <li className="rounded-lg">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/70">
        <Icon className={cn("mt-0.5 size-3.5 shrink-0", f.severity === "error" ? "text-danger" : f.severity === "warning" ? "text-warning" : "text-success")} aria-hidden="true" />
        <span className="min-w-0 flex-1 text-[13px] leading-snug">{f.title}</span>
        <ChevronDown className={cn("mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? (
        <div className="pb-2 pl-8 pr-2 text-[12px] leading-relaxed text-muted-foreground">
          <p>{f.detail}</p>
          {f.where?.length ? (
            <ul className="mt-1.5 flex flex-wrap gap-1">
              {f.where.slice(0, 8).map((w, i) => (
                <li key={i}>
                  <button type="button" onClick={() => emit("codexa:open-file", { path: w.path, line: w.line })} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground hover:bg-muted/70 hover:underline">
                    {w.path}
                    {w.line ? `:${w.line}` : ""}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

const VERSION_STATE: Record<DeploymentDto["status"], { label: string; tone: string }> = {
  live: { label: "Live", tone: "text-success" },
  failed: { label: "Failed", tone: "text-danger" },
  queued: { label: "Queued", tone: "text-info" },
  building: { label: "Building", tone: "text-info" },
  deploying: { label: "Uploading", tone: "text-info" },
  rolled_back: { label: "Previous", tone: "text-muted-foreground" },
};
const PROVIDER_NAME: Record<string, string> = { codexa: "Codexa hosting", vercel: "Vercel" };
const hostOf = (url: string | null) => (url ? url.replace(/^https?:\/\//, "").split("/")[0] : null);
const versionTime = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * "Latest deployment" (status, host, provider, when, how long it took, the current checks summary)
 * and the versions list (the newest five with Restore for versions that were live before).
 * Everything comes from the deployments rows; Restore calls the rollback API.
 */
function VersionsSection({ deployments, live, scan, canRollback, rollingBack, onRollback }: { deployments: DeploymentDto[]; live: DeploymentDto | null; scan: ScanReport | null; canRollback: boolean; rollingBack: string | null; onRollback: (id: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  if (!deployments.length) return null;
  const latest = deployments[0];
  const state = VERSION_STATE[latest.status];
  const took = latest.finishedAt ? Date.parse(latest.finishedAt) - Date.parse(latest.createdAt) : null;
  const versions = showAll ? deployments : deployments.slice(0, 5);
  return (
    <section aria-labelledby="versions-title" className="rounded-xl border border-border">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Rocket className="size-4 text-muted-foreground" aria-hidden="true" />
        <h3 id="versions-title" className="text-[13.5px] font-semibold">
          Latest deployment
        </h3>
        <span className={cn("ml-auto text-[12px] font-medium", state.tone)}>{state.label}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-[12px] sm:grid-cols-4">
        <div className="min-w-0">
          <dt className="text-muted-foreground">Address</dt>
          <dd className="truncate font-mono" title={latest.url ?? undefined}>
            {hostOf(latest.url) ?? "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Provider</dt>
          <dd className="truncate">{PROVIDER_NAME[latest.provider] ?? latest.provider}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">When</dt>
          <dd className="truncate tabular-nums" title={versionTime(latest.finishedAt ?? latest.createdAt)}>
            {relativeTime(latest.finishedAt ?? latest.createdAt)}
            {took !== null && took >= 0 ? <span className="text-muted-foreground"> · {formatElapsed(took)}</span> : null}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Checks now</dt>
          <dd className="truncate tabular-nums">
            {scan ? (
              <>
                {scan.counts.error ? <span className="text-danger">{scan.counts.error} to fix</span> : null}
                {scan.counts.error && scan.counts.warning ? " · " : null}
                {scan.counts.warning ? <span className="text-warning">{scan.counts.warning} suggestion{scan.counts.warning === 1 ? "" : "s"}</span> : null}
                {!scan.counts.error && !scan.counts.warning ? <span className="text-success">{scan.counts.pass} passed</span> : null}
              </>
            ) : (
              <span className="text-muted-foreground">Scanning…</span>
            )}
          </dd>
        </div>
      </dl>
      {latest.error ? <p className="line-clamp-2 border-t border-border px-4 py-2 font-mono text-[11px] text-danger">{latest.error}</p> : null}
      <ol className="border-t border-border" aria-label="Versions">
        {versions.map((v, i) => {
          const s = VERSION_STATE[v.status];
          const restorable = canRollback && v.status === "rolled_back" && Boolean(v.url);
          return (
            <li key={v.id} className="flex items-center gap-3 border-b border-border px-4 py-2 text-[12px] last:border-b-0">
              <span className={cn("size-1.5 shrink-0 rounded-full", v.status === "live" ? "bg-success" : v.status === "failed" ? "bg-danger" : IN_PROGRESS.includes(v.status) ? "bg-info" : "bg-muted-foreground/40")} aria-hidden="true" />
              <span className="w-14 shrink-0 font-mono text-[11px] text-muted-foreground">#{deployments.length - i}</span>
              <span className={cn("w-16 shrink-0 font-medium", s.tone)}>{s.label}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">{hostOf(v.url) ?? (v.error ? v.error : PROVIDER_NAME[v.provider] ?? v.provider)}</span>
              <time dateTime={v.createdAt} title={versionTime(v.createdAt)} className="shrink-0 tabular-nums text-muted-foreground">
                {relativeTime(v.finishedAt ?? v.createdAt)}
              </time>
              {restorable ? (
                <Button size="sm" variant="outline" appearance="app" className="h-6 px-2 text-[11px]" disabled={rollingBack !== null} loading={rollingBack === v.id} onClick={() => onRollback(v.id)}>
                  Restore
                </Button>
              ) : v.id === live?.id ? (
                <span className="inline-flex h-6 items-center px-2 text-[11px] text-success">Current</span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {deployments.length > 5 ? (
        <button type="button" onClick={() => setShowAll((s) => !s)} aria-expanded={showAll} className="flex w-full items-center gap-1 border-t border-border px-4 py-2 text-[12px] text-muted-foreground hover:text-foreground">
          <ChevronDown className={cn("size-3.5 transition-transform", showAll && "rotate-180")} aria-hidden="true" />
          {showAll ? "Show fewer" : `All ${deployments.length} versions`}
        </button>
      ) : null}
    </section>
  );
}

function ScoreRing({ value, label }: { value: number; label: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const tone = value >= 90 ? "var(--success)" : value >= 60 ? "var(--warning)" : "var(--danger)";
  return (
    <div className="flex items-center gap-3">
      <svg width="56" height="56" viewBox="0 0 56 56" role="img" aria-label={`${label} score ${value} out of 100`}>
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={tone} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 28 28)" />
        <text x="28" y="33" textAnchor="middle" fontSize="15" fontWeight="600" fill="currentColor">
          {value}
        </text>
      </svg>
      <span className="text-[13px] font-medium">{label}</span>
    </div>
  );
}

/**
 * Publish, as a full window off the header Publish button, in three phases:
 * 1. Review: the address (and a custom domain on first publish) plus a real security and quality
 *    scan of the current files (/checks). Errors offer "Fix with AI" before publishing.
 * 2. Deploying: Checks → Build → Upload → Live, moving only when the server's deployment status
 *    does, with the time each step took as seen here and the live build log.
 * 3. Live: the address with a QR code, and a speed & SEO report measured on the published files.
 * Domains, analytics, history and site settings live in the Publishing pane (publishing-sheet.tsx).
 */
export function PublishPopover({ projectId, onManage, className, compact, open: openProp, onOpenChange }: { projectId: string; onManage: (tab?: string) => void; className?: string; compact?: boolean; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const d = useDeployments();
  const calm = useCalm();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (o: boolean) => {
    setOpenState(o);
    onOpenChange?.(o);
  };
  const base = `/api/v1/projects/${encodeURIComponent(projectId)}`;
  const [provider, setProvider] = useState<ProviderInfo["id"]>("codexa");
  const [copied, setCopied] = useState(false);
  const checkRef = useRef<HTMLSpanElement>(null);
  const seenLive = useRef(d.wentLive);

  // ---- scan ---------------------------------------------------------------------------------
  const [scan, setScan] = useState<ScanReport | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showPassed, setShowPassed] = useState(false);
  const runScan = useCallback(async () => {
    setScanning(true);
    setScanError(null);
    try {
      setScan((await api<{ report: ScanReport }>(`${base}/checks`, { method: "POST" })).report);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Could not run the checks");
    } finally {
      setScanning(false);
    }
  }, [base]);

  // ---- first publish: address + optional domain ---------------------------------------------
  const [setup, setSetup] = useState<{ siteName: string; suffix: string; canManage: boolean } | null>(null);
  const [siteName, setSiteName] = useState("");
  const [domain, setDomain] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  const providers = d.data?.providers ?? [];
  const chosen = providers.find((p) => p.id === provider);
  const [providerPicked, setProviderPicked] = useState(false);
  if (!providerPicked && providers.length && !chosen?.available) {
    const first = providers.find((p) => p.available);
    if (first) setProvider(first.id);
    setProviderPicked(true);
  }
  const live = d.live;
  const host = d.data?.domain.host ?? null;
  const tracked = d.tracked;
  const inProgress = tracked ? IN_PROGRESS.includes(tracked.status) : false;

  // A deployment started from this window: its result replaces the review screen.
  const [sessionDeploy, setSessionDeploy] = useState<string | null>(null);
  const ours = tracked && tracked.id === sessionDeploy ? tracked : null;
  const phase: "review" | "deploying" | "live" | "failed" = inProgress ? "deploying" : ours?.status === "live" ? "live" : ours?.status === "failed" ? "failed" : "review";

  // Step timing as observed in this window (server timestamps cover only start and finish).
  const [stepTimes, setStepTimes] = useState<Partial<Record<StepId, { start: number; end?: number }>>>({});
  const currentStep: StepId | null = tracked && (inProgress || ours) ? STEP_OF[tracked.status] : null;
  useEffect(() => {
    if (!currentStep) return;
    const now = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- record when each server status was first seen
    setStepTimes((t) => {
        const next = { ...t };
        const idx = STEPS.findIndex((s) => s.id === currentStep);
        for (const s of STEPS.slice(0, idx)) if (next[s.id] && !next[s.id]!.end) next[s.id] = { ...next[s.id]!, end: now };
        if (!next[currentStep]) next[currentStep] = { start: now, end: currentStep === "live" ? now : undefined };
        return next;
      });
  }, [currentStep]);
  const now = useNow(1000, phase === "deploying");

  // ---- report after going live --------------------------------------------------------------
  const [report, setReport] = useState<SiteReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const reportFor = useRef<string | null>(null);
  useEffect(() => {
    if (phase !== "live" || !ours || ours.provider !== "codexa" || reportFor.current === ours.id) return;
    reportFor.current = ours.id;
    api<{ report: SiteReport }>(`${base}/deployments/${encodeURIComponent(ours.id)}/report`)
      .then((r) => setReport(r.report))
      .catch((err) => setReportError(err instanceof Error ? err.message : "Could not measure the site"));
  }, [phase, ours, base]);

  // The Ship moment: only when a deployment we watched reached "live" on the server.
  useEffect(() => {
    if (d.wentLive === seenLive.current) return;
    seenLive.current = d.wentLive;
    const raf = requestAnimationFrame(() => burst(checkRef.current));
    return () => cancelAnimationFrame(raf);
  }, [d.wentLive]);

  const logTail = useMemo(() => stripAnsi(tracked?.buildLog ?? "").split("\n").filter((l) => l.trim()).slice(-10), [tracked?.buildLog]);

  const onOpen = async (o: boolean) => {
    setOpen(o);
    if (!o) return;
    if (!d.data) void d.load();
    if (!inProgress && phase !== "live") {
      void runScan();
      if (!live && !setup) {
        try {
          const r = await api<{ publishing: { siteName: string; host: string | null }; canManage: boolean }>(`${base}/publishing`);
          setSetup({ siteName: r.publishing.siteName, suffix: r.publishing.host ? r.publishing.host.slice(r.publishing.siteName.length) : "", canManage: r.canManage });
          setSiteName(r.publishing.siteName);
        } catch {
          /* optional: publishing still works with the default address */
        }
      }
    }
  };

  // Opened from outside (keyboard shortcut, deep link): run the checks too.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts a request; state updates follow it
    if (open && !scan && !scanning && !scanError && !inProgress) void runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the window opens
  }, [open]);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const publish = async () => {
    const firstTime = !live && provider === "codexa" && setup;
    const wantDomain = firstTime && setup.canManage ? domain.trim() : "";
    setSetupError(null);
    if (firstTime && setup.canManage && siteName && siteName !== setup.siteName) {
      setPreparing(true);
      try {
        await api(`${base}/publishing`, { method: "PATCH", json: { siteName } });
        await d.load();
      } catch (err) {
        setSetupError(err instanceof Error ? err.message : "Could not save the address");
        setPreparing(false);
        return;
      }
    }
    if (wantDomain) {
      setPreparing(true);
      try {
        await api(`${base}/domains`, { method: "POST", json: { domain: wantDomain } });
        setDomain("");
      } catch (err) {
        setSetupError(err instanceof Error ? err.message : "Could not add the domain");
        setPreparing(false);
        return;
      }
    }
    setPreparing(false);
    setReport(null);
    setReportError(null);
    setShowReport(false);
    const now = Date.now();
    setStepTimes({ checks: { start: now - 1, end: now } });
    const dep = await d.publish(provider);
    if (dep) setSessionDeploy(dep.id);
    if (wantDomain && dep) onManage("domains");
  };

  const fixWithAi = (findings: Finding[], intro: string) => {
    emit("codexa:ai-send", { text: fixPrompt(findings, intro), mode: "build" });
    setOpen(false);
  };

  useNow(60_000, Boolean(live));
  const publishedAgo = live ? relativeTime(live.finishedAt ?? live.createdAt) : null;
  const errors = scan?.findings.filter((f) => f.severity === "error") ?? [];
  const warnings = scan?.findings.filter((f) => f.severity === "warning") ?? [];
  const passed = scan?.findings.filter((f) => f.severity === "pass") ?? [];
  const busy = d.publishing || preparing;
  const canPublish = Boolean(chosen?.available) && !inProgress && !busy && Boolean(d.data) && d.canDeploy;
  const siteUrl = (ours?.url ?? live?.url) || null;

  return (
    <>
      {live?.url && !compact ? (
        <a
          href={live.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ws-pill-in hidden h-8 items-center gap-1 rounded-[10px] px-2 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring min-[1440px]:inline-flex"
          aria-label={`Published ${publishedAgo}. Open the live site`}
        >
          Published {publishedAgo}
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      ) : null}
      <Dialog open={open} onOpenChange={(o) => void onOpen(o)}>
        <Tooltip content={live ? `Published ${publishedAgo}` : "Publish this project"}>
          <button
            type="button"
            data-spark=""
            onClick={() => void onOpen(true)}
            className={cn("btn-brand relative inline-flex h-8 select-none items-center gap-1.5 rounded-[10px] text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] calm:active:scale-100", compact ? "w-8 justify-center px-0" : "px-3.5", className)}
            aria-label={live ? `Publish (published ${publishedAgo})` : "Publish"}
          >
            {inProgress ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : live ? <LiveDot /> : <Rocket className="size-3.5" aria-hidden="true" data-spark-icon="" />}
            <span className={cn(compact && "sr-only")}>{inProgress ? "Publishing…" : "Publish"}</span>
          </button>
        </Tooltip>
        <DialogContent
          title={phase === "live" ? "Your site is live" : phase === "deploying" ? "Publishing…" : phase === "failed" ? "Publishing failed" : live ? "Publish a new version" : "Publish your site"}
          description={phase === "review" ? (live ? `Live since ${publishedAgo}. Review the checks, then publish the current files.` : "Review the checks, choose your address, then go live.") : undefined}
          className="max-h-[calc(100dvh-2rem)] max-w-[600px] overflow-y-auto p-0 [&>div:first-child]:px-6 [&>div:first-child]:pt-6"
        >
          <p className="sr-only" role="status" aria-live="polite">
            {phase === "deploying" && currentStep ? `Publishing: ${STEPS.find((s) => s.id === currentStep)?.label}` : phase === "live" ? "Published. Your site is live." : phase === "failed" ? "Publishing failed." : ""}
          </p>

          {phase === "review" ? (
            <div className="space-y-5 px-6 pb-6">
              {/* Address */}
              <section aria-label="Address" className="space-y-2.5">
                <div className="flex h-10 items-center gap-2 rounded-xl bg-muted px-3 font-mono text-[12.5px] shadow-[inset_0_0_0_1px_var(--border)]">
                  <Globe className={cn("size-4 shrink-0", live ? "text-success" : "text-muted-foreground")} aria-hidden="true" />
                  {live?.url ? (
                    <a href={live.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate hover:underline">
                      {live.url.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{host ? `${host} · not published yet` : "Not published yet"}</span>
                  )}
                  {live ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2 py-0.5 font-sans text-[11px] font-medium text-success">
                      <LiveDot /> Live
                    </span>
                  ) : null}
                </div>
                {providers.length > 1 ? (
                  <Segmented
                    aria-label="Provider"
                    size="sm"
                    fullWidth
                    value={provider}
                    onValueChange={(v) => setProvider(v)}
                    options={providers.map((p) => ({ value: p.id, label: p.name.replace(/\s*\([^)]*\)\s*$/, ""), disabled: !p.available, title: p.available ? p.name : `${p.name}: ${p.reason ?? "not configured"}` }))}
                  />
                ) : null}
                {providers.filter((p) => !p.available).map((p) => (
                  <p key={p.id} className="text-[12px] text-muted-foreground">
                    <span className="font-medium text-foreground/80">{p.name}: not configured.</span> {p.reason}
                  </p>
                ))}
                {setup && !live && provider === "codexa" && setup.canManage ? (
                  <div className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="first-site-name" className="text-[12px] font-medium">
                        Site address
                      </label>
                      <div className="mt-1 flex h-9 items-center overflow-hidden rounded-lg border border-input bg-background font-mono text-[12px] focus-within:ring-2 focus-within:ring-ring">
                        <input id="first-site-name" value={siteName} onChange={(e) => setSiteName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} maxLength={63} spellCheck={false} autoComplete="off" className="h-full min-w-0 flex-1 bg-transparent px-2.5 outline-none" />
                        {setup.suffix ? <span className="max-w-[55%] shrink-0 truncate pr-2.5 text-muted-foreground">{setup.suffix}</span> : null}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="first-domain" className="text-[12px] font-medium">
                        Your own domain <span className="font-normal text-muted-foreground">(optional)</span>
                      </label>
                      <input id="first-domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="www.yourbrand.com" spellCheck={false} autoComplete="off" className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2.5 font-mono text-[12px] outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <p className="text-[11.5px] text-muted-foreground sm:col-span-2">With your own domain, Codexa shows the two DNS records to add after publishing and checks them for you.</p>
                  </div>
                ) : null}
              </section>

              {/* Checks */}
              <section aria-labelledby="checks-title" className="rounded-xl border border-border">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
                  <h3 id="checks-title" className="text-[13.5px] font-semibold">
                    Pre-publish checks
                  </h3>
                  <span className="ml-auto text-[12px] text-muted-foreground">
                    {scanning ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Scanning your code…
                      </span>
                    ) : scan ? (
                      <>
                        {scan.counts.error ? <span className="font-medium text-danger">{scan.counts.error} to fix · </span> : null}
                        {scan.counts.warning ? <span className="font-medium text-warning">{scan.counts.warning} suggestion{scan.counts.warning === 1 ? "" : "s"} · </span> : null}
                        {scan.counts.pass} passed
                      </>
                    ) : null}
                  </span>
                </div>
                <div className="px-2 py-2">
                  {scanError ? (
                    <p className="px-2 py-1 text-[12.5px] text-danger" role="alert">
                      {scanError}{" "}
                      <button type="button" className="underline" onClick={() => void runScan()}>
                        Try again
                      </button>
                    </p>
                  ) : null}
                  {scan ? (
                    <>
                      {scan.counts.error === 0 && scan.counts.warning === 0 ? <p className="px-2 py-1.5 text-[13px] text-success">Everything checked out. No exposed keys or unsafe code found.</p> : null}
                      <ul className="space-y-0.5">
                        {[...errors, ...warnings].map((f) => (
                          <FindingRow key={f.id} f={f} />
                        ))}
                      </ul>
                      {passed.length ? (
                        <>
                          <button type="button" onClick={() => setShowPassed((s) => !s)} aria-expanded={showPassed} className="mt-1 flex items-center gap-1 px-2 py-1 text-[12px] text-muted-foreground hover:text-foreground">
                            <ChevronDown className={cn("size-3.5 transition-transform", showPassed && "rotate-180")} aria-hidden="true" />
                            {passed.length} check{passed.length === 1 ? "" : "s"} passed
                          </button>
                          {showPassed ? (
                            <ul className="space-y-0.5">
                              {passed.map((f) => (
                                <FindingRow key={f.id} f={f} />
                              ))}
                            </ul>
                          ) : null}
                        </>
                      ) : null}
                    </>
                  ) : scanning ? (
                    <ul className="space-y-2 px-2 py-1.5" aria-hidden="true">
                      {[0, 1, 2].map((i) => (
                        <li key={i} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${70 - i * 15}%` }} />
                      ))}
                    </ul>
                  ) : null}
                </div>
                {errors.length + warnings.length ? (
                  <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
                    <p className="min-w-0 flex-1 text-[12px] text-muted-foreground">{errors.length ? "Fix the issues marked red before going live." : "Suggestions do not block publishing."}</p>
                    <Button size="sm" variant="outline" appearance="app" onClick={() => fixWithAi([...errors, ...warnings], "Fix these issues found by the pre-publish checks:")}>
                      <Wand2 className="size-3.5" aria-hidden="true" /> Fix with AI
                    </Button>
                  </div>
                ) : null}
              </section>

              {/* Latest deployment and the versions behind it, from the deployments table. */}
              {d.data ? <VersionsSection deployments={d.data.deployments} live={live} scan={scan} canRollback={d.canDeploy} rollingBack={d.rollingBack} onRollback={(id) => void d.rollback(id)} /> : null}

              {d.loadError && !d.data ? <p className="text-[12.5px] text-danger" role="alert">{d.loadError}</p> : null}
              {d.publishError ? <p className="text-[12.5px] text-danger" role="alert">{d.publishError}</p> : null}
              {setupError ? <p className="text-[12.5px] text-danger" role="alert">{setupError}</p> : null}

              <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onManage();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] text-muted-foreground hover:text-foreground sm:mr-auto"
                >
                  <Settings2 className="size-3.5" aria-hidden="true" /> Domains, analytics &amp; settings
                </button>
                {!d.canDeploy ? (
                  <p className="text-[12.5px] text-muted-foreground">Viewers cannot publish. Ask an editor or an admin.</p>
                ) : (
                  <Button size="md" variant={errors.length ? "outline" : "primary"} appearance="app" disabled={!canPublish || scanning} loading={busy} onClick={() => void publish()}>
                    <Rocket className="size-4" aria-hidden="true" />
                    {errors.length ? "Publish anyway" : live ? "Publish new version" : "Publish"}
                  </Button>
                )}
              </div>
              <p className="-mt-2 text-[11.5px] text-muted-foreground">Publishing snapshots the current files, builds them and makes the result public. Anyone with the link can open it.</p>
            </div>
          ) : (
            <div className="space-y-5 px-6 pb-6">
              {/* Steps */}
              <ol className="space-y-0" aria-label="Publishing steps">
                {STEPS.map((s, i) => {
                  const at = tracked ? STEPS.findIndex((x) => x.id === (tracked.status === "failed" ? (stepTimes.upload ? "upload" : "build") : STEP_OF[tracked.status])) : -1;
                  const failed = phase === "failed" && i === at;
                  const done = phase === "live" ? true : i < at;
                  const active = phase === "deploying" && i === at;
                  const t = stepTimes[s.id];
                  const ms = t ? (t.end ?? (active ? now : t.start)) - t.start : null;
                  return (
                    <li key={s.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < STEPS.length - 1 ? <span className={cn("absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-px", done ? "bg-success/50" : "bg-border")} aria-hidden="true" /> : null}
                      <span
                        ref={s.id === "live" ? checkRef : undefined}
                        className={cn(
                          "relative z-[1] flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px]",
                          failed ? "border-danger bg-danger/10 text-danger" : done ? "border-success bg-success text-background" : active ? "border-primary bg-card text-primary" : "border-border bg-card text-muted-foreground",
                        )}
                      >
                        {failed ? <CircleAlert className="size-3.5" aria-hidden="true" /> : done ? <Check className={cn("size-3.5", !calm && s.id === "live" && "check-draw")} strokeWidth={3} aria-hidden="true" /> : active ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : i + 1}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="flex items-baseline gap-2 text-[13.5px] font-medium">
                          {s.label}
                          {s.id === "checks" && scan ? <span className="text-[12px] font-normal text-muted-foreground">{scan.counts.error ? `${scan.counts.error} issue${scan.counts.error === 1 ? "" : "s"} noted` : scan.counts.warning ? `${scan.counts.warning} suggestion${scan.counts.warning === 1 ? "" : "s"}` : "all passed"}</span> : null}
                          {ms !== null && (done || active) && s.id !== "checks" && s.id !== "live" ? <span className="ml-auto font-mono text-[11.5px] font-normal tabular-nums text-muted-foreground">{formatElapsed(ms)}</span> : null}
                        </p>
                        <p className="text-[12px] text-muted-foreground">{s.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {phase !== "live" && logTail.length ? (
                <pre className="max-h-48 overflow-auto rounded-xl border border-code-border bg-code-bg px-3 py-2 font-mono text-[11px] leading-[1.15rem] text-code-fg" aria-label="Build log, last lines">
                  {logTail.map((l, i) => (
                    <div key={`${i}-${l}`} className="whitespace-pre-wrap break-all">
                      {l}
                    </div>
                  ))}
                </pre>
              ) : null}

              {phase === "failed" && ours ? (
                <div className="rounded-xl border border-danger/30 bg-danger/[0.06] p-3.5" role="alert">
                  <p className="text-[13px] font-semibold text-danger">The build did not finish</p>
                  {ours.error ? <p className="mt-1 line-clamp-5 whitespace-pre-wrap break-words font-mono text-[11.5px] text-muted-foreground">{ours.error}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      appearance="app"
                      onClick={() => {
                        emit("codexa:ai-fix-request", { error: `Publishing failed: ${ours.error ?? "the build did not finish"}`, logs: (ours.buildLog ?? "").split("\n").slice(-40) });
                        setOpen(false);
                      }}
                    >
                      <Wand2 className="size-3.5" aria-hidden="true" /> Fix with AI
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      appearance="app"
                      onClick={() => {
                        setSessionDeploy(null);
                        void runScan();
                      }}
                    >
                      Back to review
                    </Button>
                  </div>
                </div>
              ) : null}

              {phase === "live" && siteUrl ? (
                <>
                  <div className="ws-drop flex flex-col gap-4 rounded-2xl border border-success/30 bg-success/[0.06] p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium uppercase tracking-wide text-success">Live</p>
                      <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate font-mono text-[14px] font-medium hover:underline">
                        {siteUrl.replace(/^https?:\/\//, "")}
                      </a>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button asChild size="sm" appearance="app">
                          <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                            Open site <ExternalLink className="size-3.5" aria-hidden="true" />
                          </a>
                        </Button>
                        <Button size="sm" variant="outline" appearance="app" onClick={() => void copy(siteUrl)}>
                          {copied ? <Check className="size-3.5 text-success" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />} {copied ? "Copied" : "Copy link"}
                        </Button>
                      </div>
                    </div>
                    <QrCode value={siteUrl} size={104} label="QR code for the live site" className="shrink-0 self-center p-1 shadow-[0_0_0_1px_var(--border)]" />
                  </div>

                  <section aria-labelledby="report-title" className="rounded-xl border border-border">
                    <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                      <Gauge className="size-4 text-muted-foreground" aria-hidden="true" />
                      <h3 id="report-title" className="text-[13.5px] font-semibold">
                        Speed &amp; SEO report
                      </h3>
                      <span className="ml-auto text-[11.5px] text-muted-foreground">Measured on the published files</span>
                    </div>
                    {report ? (
                      <div className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center gap-6">
                          <ScoreRing value={report.score.performance} label="Speed" />
                          <ScoreRing value={report.score.seo} label="SEO" />
                          <dl className="ml-auto grid grid-cols-2 gap-x-5 gap-y-1 text-[12px]">
                            <dt className="text-muted-foreground">JavaScript</dt>
                            <dd className="text-right font-mono tabular-nums">{Math.round(report.totals.jsGzip / 1024)} KB</dd>
                            <dt className="text-muted-foreground">CSS</dt>
                            <dd className="text-right font-mono tabular-nums">{Math.round(report.totals.cssGzip / 1024)} KB</dd>
                            <dt className="text-muted-foreground">Images</dt>
                            <dd className="text-right font-mono tabular-nums">{Math.round(report.totals.imageBytes / 1024)} KB</dd>
                          </dl>
                        </div>
                        {(() => {
                          const issues = report.findings.filter((f) => f.severity !== "pass");
                          return (
                            <>
                              <button type="button" onClick={() => setShowReport((s) => !s)} aria-expanded={showReport} className="flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
                                <ChevronDown className={cn("size-3.5 transition-transform", showReport && "rotate-180")} aria-hidden="true" />
                                {issues.length ? `${issues.length} thing${issues.length === 1 ? "" : "s"} to improve` : "All checks passed"} · see details
                              </button>
                              {showReport ? (
                                <ul className="space-y-0.5">
                                  {report.findings.map((f) => (
                                    <FindingRow key={f.id} f={f} />
                                  ))}
                                </ul>
                              ) : null}
                              {issues.length ? (
                                <Button size="sm" variant="outline" appearance="app" onClick={() => fixWithAi(issues, "Improve the published site. The speed & SEO report found:")}>
                                  <Wand2 className="size-3.5" aria-hidden="true" /> Improve with AI
                                </Button>
                              ) : null}
                            </>
                          );
                        })()}
                      </div>
                    ) : reportError ? (
                      <p className="p-4 text-[12.5px] text-muted-foreground">{reportError}</p>
                    ) : ours?.provider === "codexa" ? (
                      <p className="flex items-center gap-2 p-4 text-[12.5px] text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Measuring the published files…
                      </p>
                    ) : (
                      <p className="p-4 text-[12.5px] text-muted-foreground">The report is available for sites on Codexa hosting.</p>
                    )}
                  </section>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      appearance="app"
                      onClick={() => {
                        setOpen(false);
                        onManage("domains");
                      }}
                    >
                      Add a custom domain
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      appearance="app"
                      onClick={() => {
                        setOpen(false);
                        onManage();
                      }}
                    >
                      <Settings2 className="size-3.5" aria-hidden="true" /> Analytics &amp; settings
                    </Button>
                    <Button
                      size="sm"
                      appearance="app"
                      onClick={() => {
                        setSessionDeploy(null);
                        setOpen(false);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
