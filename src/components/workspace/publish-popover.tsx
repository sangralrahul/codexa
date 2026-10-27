"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleAlert, Copy, ExternalLink, Globe, Loader2, Rocket, Settings2, Wand2 } from "lucide-react";
import { emit } from "@/lib/client/events";
import { isCalm, useCalm } from "@/lib/client/motion";
import { IN_PROGRESS, useDeployments, type ProviderInfo } from "@/lib/client/workspace/deployments";
import type { DeploymentDto } from "@/lib/runtime/types";
import { Button } from "@/components/ui/button";
import { LiveDot } from "@/components/ui/misc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Segmented } from "@/components/ui/segmented";
import { Tooltip } from "@/components/ui/tooltip";
import { relativeTime } from "@/components/projects/format";
import { cn } from "@/lib/utils";

const STEPS: { id: DeploymentDto["status"]; label: string }[] = [
  { id: "queued", label: "Queued" },
  { id: "building", label: "Building" },
  { id: "deploying", label: "Deploying" },
  { id: "live", label: "Live" },
];
const stepIndex = (s: DeploymentDto["status"]) => STEPS.findIndex((x) => x.id === s);

/** Ember particles around the success check (M17 garnish). Never in calm. */
function burst(from: HTMLElement | null) {
  if (!from || isCalm()) return;
  const r = from.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  for (let i = 0; i < 12; i++) {
    const p = document.createElement("span");
    p.className = "ws-particle";
    p.style.left = `${cx - 2.5}px`;
    p.style.top = `${cy - 2.5}px`;
    if (i % 3 === 1) p.style.background = "var(--signal-2)";
    if (i % 3 === 2) p.style.background = "var(--success)";
    document.body.appendChild(p);
    const a = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
    const d = 26 + Math.random() * 22;
    p.animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(0.3)`, opacity: 0 },
      ],
      { duration: 620 + Math.random() * 200, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" },
    ).onfinish = () => p.remove();
  }
}

/** M17 Ship: a URL pill flies on an arc from the success card to the header's Publish button. */
function flight(from: HTMLElement | null, to: HTMLElement | null, text: string) {
  if (!from || !to || isCalm()) return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const pill = document.createElement("div");
  pill.className = "ws-flight";
  pill.textContent = text;
  pill.style.left = `${a.left}px`;
  pill.style.top = `${a.top}px`;
  document.body.appendChild(pill);
  const dx = b.left + b.width / 2 - (a.left + pill.offsetWidth / 2);
  const dy = b.top + b.height / 2 - (a.top + pill.offsetHeight / 2);
  pill.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 70}px) scale(0.85)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy + 2}px) scale(0.32)`, opacity: 0.9, offset: 0.92 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0 },
    ],
    { duration: 650, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" },
  ).onfinish = () => pill.remove();
}

/**
 * Publish, as a popover off the header: the site URL, the providers (unavailable ones disabled
 * with their real reason), an inline confirmation, then a stepper that only moves when the
 * server's deployment.status does, a live tail of the build log, and the Ship moment on a
 * real "live". Failure shows the real error with "Fix with AI". History, rollback and the
 * custom domain live in the "Manage deployments" sheet.
 */
export function PublishPopover({ onManage, className, compact, open: openProp, onOpenChange }: { onManage: () => void; className?: string; compact?: boolean; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const d = useDeployments();
  const calm = useCalm();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (o: boolean) => {
    setOpenState(o);
    onOpenChange?.(o);
  };
  const [provider, setProvider] = useState<ProviderInfo["id"]>("codexa");
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLSpanElement>(null);
  const seenLive = useRef(d.wentLive);

  const providers = d.data?.providers ?? [];
  const chosen = providers.find((p) => p.id === provider);
  // Default to the first available provider once the list is known.
  const [providerPicked, setProviderPicked] = useState(false);
  if (!providerPicked && providers.length && !chosen?.available) {
    const first = providers.find((p) => p.available);
    if (first) setProvider(first.id);
    setProviderPicked(true);
  }

  const tracked = d.tracked;
  const inProgress = tracked ? IN_PROGRESS.includes(tracked.status) : false;
  // The furthest step each deployment was seen at (a failure lands on the step after it).
  const [maxStep, setMaxStep] = useState<Record<string, number>>({});
  const seenStep = tracked ? stepIndex(tracked.status) : -1;
  if (tracked && seenStep > (maxStep[tracked.id] ?? -1)) setMaxStep((m) => ({ ...m, [tracked.id]: seenStep }));
  const reached = tracked ? Math.max(maxStep[tracked.id] ?? -1, seenStep) : -1;
  const live = d.live;
  const host = d.data?.domain.host ?? null;

  // The Ship moment: only when a deployment we watched reached "live" on the server.
  useEffect(() => {
    if (d.wentLive === seenLive.current) return;
    seenLive.current = d.wentLive;
    const raf = requestAnimationFrame(() => {
      burst(checkRef.current);
      if (open) setTimeout(() => flight(successRef.current, triggerRef.current, (tracked?.url ?? "").replace(/^https?:\/\//, "")), 380);
    });
    return () => cancelAnimationFrame(raf);
  }, [d.wentLive, open, tracked?.url]);

  const logTail = useMemo(() => (tracked?.buildLog ?? "").split("\n").filter((l) => l.trim()).slice(-6), [tracked?.buildLog]);

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
    setConfirming(false);
    await d.publish(provider);
  };

  const showStepper = Boolean(tracked) && (inProgress || tracked?.status === "failed" || tracked?.status === "live");
  const publishedAgo = live ? relativeTime(live.finishedAt ?? live.createdAt) : null;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setConfirming(false);
        if (o && !d.data) void d.load();
      }}
    >
      <Tooltip content={live ? `Published ${publishedAgo}` : "Publish this project"}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            data-spark=""
            className={cn("btn-ember relative inline-flex h-8 select-none items-center gap-1.5 rounded-[10px] text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] calm:active:scale-100", compact ? "w-8 justify-center px-0" : "px-3.5", className)}
            aria-label={live ? `Publish (published ${publishedAgo})` : "Publish"}
          >
            {inProgress ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : live ? <LiveDot /> : <Rocket className="size-3.5" aria-hidden="true" data-spark-icon="" />}
            <span className={cn(compact && "sr-only")}>{inProgress ? "Publishing…" : "Publish"}</span>
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent align="end" className="w-[380px] max-w-[calc(100vw-1.5rem)] p-0">
        <div className="px-4 pb-3 pt-4">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-semibold tracking-tight">Publish</p>
            {live ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-medium text-success">
                <LiveDot /> Live
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">{live ? `Last published ${publishedAgo}.` : "Make the current files public at a URL."}</p>

          {/* Site URL */}
          <div className="mt-3 flex h-9 items-center gap-2 rounded-xl bg-muted px-3 font-mono text-[12px] shadow-[inset_0_0_0_1px_var(--border)]">
            <Globe className={cn("size-3.5 shrink-0", live ? "text-success" : "text-muted-foreground")} aria-hidden="true" />
            {live?.url ? (
              <>
                <span className="min-w-0 flex-1 truncate">{live.url.replace(/^https?:\/\//, "")}</span>
                <button type="button" onClick={() => void copy(live.url!)} aria-label="Copy site URL" className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground">
                  {copied ? <Check className="pop-in size-3.5 text-success" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                </button>
                <a href={live.url} target="_blank" rel="noopener noreferrer" aria-label="Open the live site" className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground">
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </>
            ) : (
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{host ? `Not published yet · ${host}` : "Not published yet"}</span>
            )}
          </div>

          {/* Provider */}
          {providers.length > 1 ? (
            <div className="mt-3">
              <Segmented
                aria-label="Provider"
                size="sm"
                fullWidth
                value={provider}
                onValueChange={(v) => setProvider(v)}
                options={providers.map((p) => ({ value: p.id, label: p.name, disabled: !p.available, title: p.available ? undefined : (p.reason ?? "Not configured") }))}
              />
            </div>
          ) : null}
          {providers.filter((p) => !p.available).map((p) => (
            <p key={p.id} className="mt-1.5 text-[11.5px] text-muted-foreground">
              <span className="font-medium text-foreground/80">{p.name}: not configured.</span> {p.reason}
            </p>
          ))}

          {d.loadError && !d.data ? <p className="mt-3 text-[12.5px] text-danger" role="alert">{d.loadError}</p> : null}
          {d.publishError ? <p className="mt-3 text-[12.5px] text-danger" role="alert">{d.publishError}</p> : null}
        </div>

        {/* Stepper, from the real deployment.status */}
        {showStepper && tracked ? (
          <div className="border-t border-border px-4 py-3" aria-live="polite">
            <ol className="flex items-center gap-1.5" aria-label="Deployment progress">
              {STEPS.map((s, i) => {
                const isLive = tracked.status === "live";
                const failed = tracked.status === "failed" && i === Math.max(0, reached);
                const done = isLive || i < reached;
                const active = inProgress && i === Math.max(0, reached);
                return (
                  <li key={s.id} className="flex flex-1 flex-col gap-1">
                    <span className="relative h-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn("ws-step-line absolute inset-0 rounded-full", failed ? "bg-danger" : active ? "bg-signal" : "bg-success")}
                        style={{ transform: `scaleX(${failed || done || active ? 1 : 0})`, opacity: active ? 0.75 : 1 }}
                      />
                    </span>
                    <span className={cn("flex items-center gap-1 text-[11px]", failed ? "text-danger" : done || active ? "text-foreground" : "text-muted-foreground")}>
                      {active ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : failed ? <CircleAlert className="size-3" aria-hidden="true" /> : done ? <Check className="size-3 text-success" aria-hidden="true" /> : null}
                      {s.label}
                      <span className="sr-only">{failed ? " (failed)" : active ? " (in progress)" : done ? " (done)" : ""}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            {logTail.length && tracked.status !== "live" ? (
              <pre className="mt-2.5 max-h-[7.5rem] overflow-hidden rounded-lg border border-code-border bg-code-bg px-2.5 py-1.5 font-mono text-[10.5px] leading-[1.15rem] text-code-fg" aria-label="Build log, last lines">
                {logTail.map((l, i) => (
                  <div key={`${i}-${l}`} className="truncate">
                    {l}
                  </div>
                ))}
              </pre>
            ) : null}
            {tracked.status === "live" && tracked.url ? (
              <div ref={successRef} className="ws-drop mt-3 flex items-center gap-3 rounded-xl border border-success/30 bg-success/[0.07] p-3">
                <span ref={checkRef} className="ws-check-pop flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-background">
                  <Check className={cn("size-4", !calm && "check-draw")} strokeWidth={3} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">Your site is live</p>
                  <p className="truncate font-mono text-[11.5px] text-muted-foreground">{tracked.url.replace(/^https?:\/\//, "")}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button asChild size="sm" variant="outline" appearance="app" className="h-7 px-2.5 text-xs">
                    <a href={tracked.url} target="_blank" rel="noopener noreferrer">
                      Open <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" appearance="app" className="h-7 px-2 text-xs" onClick={() => void copy(tracked.url!)} aria-label="Copy link">
                    {copied ? <Check className="size-3.5 text-success" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                  </Button>
                </div>
              </div>
            ) : null}
            {tracked.status === "failed" ? (
              <div className="mt-3 rounded-xl border border-danger/30 bg-danger/[0.06] p-3" role="alert">
                <p className="text-[13px] font-semibold text-danger">The deployment failed</p>
                {tracked.error ? <p className="mt-1 line-clamp-4 whitespace-pre-wrap break-words font-mono text-[11.5px] text-muted-foreground">{tracked.error}</p> : null}
                <div className="mt-2.5 flex gap-2">
                  <Button
                    size="sm"
                    appearance="app"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => {
                      emit("codexa:ai-fix-request", { error: `Publishing failed: ${tracked.error ?? "the build did not finish"}`, logs: (tracked.buildLog ?? "").split("\n").slice(-40) });
                      setOpen(false);
                    }}
                  >
                    <Wand2 className="size-3.5" aria-hidden="true" /> Fix with AI
                  </Button>
                  <Button size="sm" variant="outline" appearance="app" className="h-7 px-2.5 text-xs" onClick={() => setConfirming(true)} disabled={!d.canDeploy}>
                    Try again
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Action */}
        <div className="border-t border-border px-4 py-3">
          {!d.canDeploy ? (
            <p className="text-[12.5px] text-muted-foreground">Viewers cannot publish. Ask an editor or an admin.</p>
          ) : confirming ? (
            <div className="ws-drop space-y-2.5">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Publishing creates a snapshot of the current files, builds it and makes the result publicly reachable{host && provider === "codexa" ? <> at <code className="font-mono text-foreground">{host}</code></> : null}. Anyone with the link can open it.
              </p>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" appearance="app" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" appearance="app" onClick={() => void publish()} loading={d.publishing}>
                  <Rocket className="size-3.5" aria-hidden="true" /> Publish now
                </Button>
              </div>
            </div>
          ) : (
            <Button className="w-full" size="md" variant="primary" appearance="app" disabled={!chosen?.available || inProgress || d.publishing || !d.data} onClick={() => setConfirming(true)}>
              {inProgress ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Rocket className="size-4" aria-hidden="true" />}
              {inProgress ? "Publishing…" : live ? "Publish new version" : "Publish"}
            </Button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onManage();
            }}
            className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-1 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Settings2 className="size-3.5" aria-hidden="true" /> Manage deployments
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
