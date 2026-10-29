"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  CloudOff,
  Copy,
  ExternalLink,
  FileCode2,
  Globe,
  Hammer,
  History,
  Loader2,
  Lock,
  Monitor,
  MonitorOff,
  MousePointerClick,
  MoreHorizontal,
  QrCode as QrIcon,
  Smartphone,
  Tablet,
  Package,
  Play,
  RefreshCw,
  RotateCw,
  Rocket,
  Sparkles,
  Square,
  Wand2,
  X,
} from "lucide-react";
import { emit } from "@/lib/client/events";
import { useRuntime, useNow, formatElapsed } from "@/lib/client/workspace/runtime";
import { useAgent } from "@/lib/client/workspace/agent";
import { useOptionalDeployments } from "@/lib/client/workspace/deployments";
import { useCalm } from "@/lib/client/motion";
import type { LogLine } from "@/lib/runtime/types";
import { stripAnsi } from "@/lib/client/workspace/problems";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { QrCode } from "@/components/ui/qr-code";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { toolButton } from "./panel-tabs";
import { VisualEditHint, VisualEditPanel, type InspectedElement } from "./visual-edit";
import { filesApi } from "@/lib/client/workspace/api";

/**
 * The preview: the workspace card that holds it is the browser window (toolbar + viewport, one
 * border); the dotted stage appears only around a tablet or phone bezel. The runtime (status
 * polling, sync, the run command) lives in WorkspaceRuntimeProvider, so this panel can be hidden
 * without stopping anything. Every state renders inside the frame, from real runtime data; the
 * iframe src is the raw previewUrl (plus a path the user typed), title "Project preview", and
 * the sandbox attribute is exactly the documented one.
 */
export type Device = "desktop" | "tablet" | "mobile";
export const DEVICES: Record<Device, { width: number | null; label: string; Icon: typeof Monitor }> = {
  desktop: { width: null, label: "Desktop (full width)", Icon: Monitor },
  tablet: { width: 820, label: "Tablet (820px)", Icon: Tablet },
  mobile: { width: 390, label: "Mobile (390px)", Icon: Smartphone },
};

const SANDBOX = "allow-scripts allow-forms allow-same-origin allow-popups allow-modals allow-downloads";

function splitUrl(url: string) {
  try {
    const u = new URL(url);
    return { origin: `${u.protocol}//${u.host}`, host: u.host, path: `${u.pathname}${u.search}${u.hash}` };
  } catch {
    return { origin: url, host: url, path: "/" };
  }
}

export function PreviewPanel({
  projectId,
  device = "desktop",
  onDeviceChange,
  canEdit,
  showOperatorDetails,
}: {
  projectId: string;
  device?: Device;
  onDeviceChange?: (d: Device) => void;
  canEdit: boolean;
  showOperatorDetails: boolean;
}) {
  const rt = useRuntime();
  const agent = useAgent();
  const calm = useCalm();
  const { status, previewUrl, frameKey, lastSync } = rt;
  const [path, setPath] = useState<string | null>(null);
  const [draftPath, setDraftPath] = useState(() => (previewUrl ? splitUrl(previewUrl).path || "/" : "/"));
  const reloadRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);
  const [updated, setUpdated] = useState<{ seq: number; count: number } | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const loadedOnce = useRef(false);

  // ---- Visual edit: the inspector script in the preview reports clicks back to us.
  const [inspectable, setInspectable] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [picked, setPicked] = useState<InspectedElement | null>(null);
  const [tailwind, setTailwind] = useState<boolean | null>(null);
  const previewOrigin = previewUrl ? splitUrl(previewUrl).origin : null;
  const toFrame = useCallback(
    (msg: Record<string, unknown>) => {
      const win = frameRef.current?.contentWindow;
      if (win && previewOrigin) win.postMessage({ source: "codexa-editor", ...msg }, previewOrigin);
    },
    [previewOrigin],
  );
  // A reloaded page (navigation, HMR full reload) has a fresh inspector: turn it back on.
  const inspectingRef = useRef(false);
  useEffect(() => {
    inspectingRef.current = inspecting;
  }, [inspecting]);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow || e.data?.source !== "codexa-inspector") return;
      const d = e.data as { type: string; element?: InspectedElement };
      if (d.type === "available") {
        setInspectable(true);
        if (inspectingRef.current) (e.source as Window).postMessage({ source: "codexa-editor", type: "inspect", on: true }, e.origin);
      }
      else if (d.type === "select" && d.element) setPicked(d.element);
      else if (d.type === "deselect" || d.type === "escape") setPicked(null);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  const toggleInspect = (on: boolean) => {
    setInspecting(on);
    if (!on) setPicked(null);
    toFrame({ type: "inspect", on });
    if (on && tailwind === null) {
      filesApi
        .read(projectId, "package.json")
        .then((f) => setTailwind(/"tailwindcss"/.test(f.content)))
        .catch(() => setTailwind(false));
    }
  };

  // A new preview URL resets the address bar.
  const [urlSeen, setUrlSeen] = useState(previewUrl);
  if (urlSeen !== previewUrl) {
    setUrlSeen(previewUrl);
    setPath(null);
    setInspectable(false);
    setInspecting(false);
    setPicked(null);
    setDraftPath(previewUrl ? splitUrl(previewUrl).path || "/" : "/");
  }
  useEffect(() => {
    loadedOnce.current = false;
  }, [previewUrl]);

  // "Updated · N files" after each real sync into the sandbox.
  useEffect(() => {
    if (!lastSync) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show the pill for this sync, then hide it
    setUpdated({ seq: lastSync.seq, count: lastSync.paths.length });
    const t = setTimeout(() => setUpdated((u) => (u?.seq === lastSync.seq ? null : u)), 2600);
    return () => clearTimeout(t);
  }, [lastSync]);

  const src = previewUrl ? (path ? `${splitUrl(previewUrl).origin}${path.startsWith("/") ? path : `/${path}`}` : previewUrl) : null;
  const parts = src ? splitUrl(src) : null;

  const reload = () => {
    const el = reloadRef.current;
    if (el && !calm) {
      el.removeAttribute("data-spin");
      void el.offsetWidth;
      el.setAttribute("data-spin", "");
    }
    rt.reloadFrame();
  };
  const copy = async () => {
    if (!src) return;
    try {
      await navigator.clipboard.writeText(src);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const agentFiles = agent.run?.files.length ?? 0;
  const editing = agent.running;
  const width = DEVICES[device].width;
  const framed = device !== "desktop";

  return (
    <section className="@container/preview flex h-full min-h-0 flex-col" aria-label="Preview">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
        {/* Browser toolbar */}
        <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border bg-surface/80 px-1.5">
          <Tooltip content="Reload preview">
            <button ref={reloadRef} type="button" aria-label="Reload preview" disabled={status !== "running"} onClick={reload} className={cn(toolButton, "ws-reload size-7")}>
              <RotateCw className="size-3.5" aria-hidden="true" />
            </button>
          </Tooltip>
          <form
            className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-full bg-muted pl-2.5 pr-1 text-[11.5px] shadow-[inset_0_0_0_1px_var(--border)] focus-within:shadow-[inset_0_0_0_1px_var(--border-strong),0_0_0_3px_color-mix(in_oklab,var(--ring)_18%,transparent)]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!previewUrl) return;
              const p = draftPath.trim() || "/";
              setPath(p.startsWith("/") ? p : `/${p}`);
              rt.reloadFrame();
            }}
          >
            {parts ? (
              <>
                {status === "running" ? <Lock className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" /> : <Globe className="size-3 shrink-0 text-muted-foreground/70" aria-hidden="true" />}
                <span className="hidden max-w-[45%] shrink truncate font-mono text-muted-foreground sm:inline" title={parts.host}>
                  {parts.host}
                </span>
                <label htmlFor="preview-path" className="sr-only">
                  Preview path
                </label>
                <input
                  id="preview-path"
                  value={draftPath}
                  onChange={(e) => setDraftPath(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent font-mono text-foreground outline-none"
                />
                <Tooltip content={copied ? "Copied" : "Copy address"}>
                  <button type="button" onClick={() => void copy()} aria-label="Copy preview address" className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
                    {copied ? <Check className="pop-in size-3 text-success" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
                  </button>
                </Tooltip>
              </>
            ) : (
              // No address yet: plain sans status text (mono is kept for real URLs), not a repeat of the card title.
              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <span className={cn("size-1.5 shrink-0 rounded-full", status === "starting" ? "bg-signal" : "bg-muted-foreground/45")} aria-hidden="true" />
                <span className="truncate">{status === "starting" ? "Starting…" : "No address yet"}</span>
              </span>
            )}
          </form>
          {onDeviceChange ? (
            <div role="radiogroup" aria-label="Preview size" className="hidden shrink-0 items-center rounded-full bg-muted p-0.5 shadow-[inset_0_0_0_1px_var(--border)] @[520px]/preview:flex">
              {(Object.keys(DEVICES) as Device[]).map((d) => {
                const { Icon, label } = DEVICES[d];
                return (
                  <Tooltip key={d} content={label}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={device === d}
                      aria-label={label}
                      onClick={() => onDeviceChange(d)}
                      className={cn("inline-flex size-6 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-ring", device === d ? "bg-card text-foreground shadow-[var(--shadow-sm),inset_0_0_0_1px_var(--border)]" : "text-muted-foreground hover:text-foreground")}
                    >
                      <Icon className="size-3.5" aria-hidden="true" />
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          ) : null}
          {canEdit ? (
            <Tooltip content={inspectable ? (inspecting ? "Stop editing" : "Visual edit: click an element to change it") : "Visual edit is available once the preview is running"}>
              <button
                type="button"
                aria-pressed={inspecting}
                aria-label="Visual edit"
                disabled={!inspectable || status !== "running"}
                onClick={() => toggleInspect(!inspecting)}
                className={cn(toolButton, "h-7 w-auto gap-1 px-2 text-[12px] font-medium", inspecting && "bg-signal/12 text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--signal)_45%,transparent)]")}
              >
                <MousePointerClick className="size-3.5" aria-hidden="true" />
                <span className="hidden @[600px]/preview:inline">Edit</span>
              </button>
            </Tooltip>
          ) : null}
          <Popover>
            <Tooltip content="Open on your phone">
              <PopoverTrigger asChild>
                <button type="button" aria-label="Open the preview on your phone" disabled={!src || status !== "running"} className={cn(toolButton, "size-7")}>
                  <QrIcon className="size-3.5" aria-hidden="true" />
                </button>
              </PopoverTrigger>
            </Tooltip>
            <PopoverContent align="end" className="w-64 p-4 text-center">
              {src ? (
                <>
                  <p className="text-sm font-semibold">Open on your phone</p>
                  <QrCode value={src} size={176} label="QR code for the preview address" className="mx-auto mt-3 p-1.5 shadow-[0_0_0_1px_var(--border)]" />
                  <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">Scan with your phone camera. The link works while this preview is running, and anyone with it can view the preview.</p>
                </>
              ) : null}
            </PopoverContent>
          </Popover>
          <Tooltip content="Open in a new tab">
            {src ? (
              <a href={src} target="_blank" rel="noopener noreferrer" aria-label="Open preview in a new tab" className={cn(toolButton, "size-7")}>
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            ) : (
              <button type="button" aria-label="Open preview in a new tab" disabled className={cn(toolButton, "size-7")}>
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Preview options" className={cn(toolButton, "size-7")}>
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Dev server</DropdownMenuLabel>
              {status === "running" || status === "starting" ? (
                <>
                  <DropdownMenuItem disabled={!canEdit || rt.busy !== null} onSelect={() => void rt.run("restart")}>
                    <RefreshCw /> Restart
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!canEdit || rt.busy !== null} onSelect={() => void rt.run("stop")}>
                    <Square /> Stop
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem disabled={!canEdit || rt.busy !== null || status === "unavailable"} onSelect={() => void rt.run("start")}>
                  <Play /> Start
                </DropdownMenuItem>
              )}
              <DropdownMenuItem disabled={!canEdit || rt.busy !== null || status === "unavailable"} onSelect={() => void rt.run("install")}>
                <Package /> Install dependencies
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canEdit || rt.busy !== null || status === "unavailable"} onSelect={() => void rt.run("build")}>
                <Hammer /> Run the build
              </DropdownMenuItem>
              {onDeviceChange ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Device</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={device} onValueChange={(v) => onDeviceChange(v as Device)}>
                    {(Object.keys(DEVICES) as Device[]).map((d) => (
                      <DropdownMenuRadioItem key={d} value={d}>
                        {DEVICES[d].label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </>
              ) : null}
              <DropdownMenuSeparator />
              <div className="flex items-center justify-between gap-3 px-2 py-1.5 text-sm">
                <label htmlFor="preview-autorefresh" className="cursor-pointer">
                  Reload after sync
                </label>
                <Switch id="preview-autorefresh" checked={rt.autoRefresh} onCheckedChange={rt.setAutoRefresh} />
              </div>
              <p className="px-2 pb-1.5 text-[11.5px] leading-snug text-muted-foreground">Off: edits hot-reload through Vite. On: the whole page reloads after each sync.</p>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {rt.actionError || rt.notice ? (
          <div className={cn("ws-drop flex items-start gap-2 border-b px-3 py-2 text-[12.5px]", rt.actionError ? "border-danger/25 bg-danger/[0.06]" : "border-info/20 bg-info/[0.05]")} role={rt.actionError ? "alert" : "status"}>
            <span className="min-w-0 flex-1">{rt.actionError ?? rt.notice}</span>
            <button type="button" aria-label="Dismiss" onClick={() => (rt.actionError ? rt.clearActionError() : rt.clearNotice())} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {/* Viewport */}
        <div className={cn("relative min-h-0 flex-1 overflow-hidden", framed ? "ws-stage flex items-start justify-center overflow-y-auto p-4" : "bg-card")}>
          {editing && !calm ? <span className="ws-beam" aria-hidden="true" /> : null}
          {editing ? (
            // Visual only: the agent column's live region already announces each stage once.
            <div className="ws-drop glass pointer-events-none absolute left-1/2 top-3 z-[4] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border-strong px-3 py-1 text-[12px] font-medium shadow-lg" aria-hidden="true">
              <Loader2 className="size-3.5 animate-spin text-signal" aria-hidden="true" />
              {agentFiles ? `Agent is editing · ${agentFiles} file${agentFiles === 1 ? "" : "s"}` : "Agent is working…"}
            </div>
          ) : updated && status === "running" ? (
            <div key={updated.seq} className="ws-drop glass pointer-events-none absolute left-1/2 top-3 z-[4] flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-success/35 px-3 py-1 text-[12px] font-medium shadow-lg" role="status">
              <Check className="size-3.5 text-success" aria-hidden="true" />
              Updated · {updated.count} file{updated.count === 1 ? "" : "s"}
            </div>
          ) : null}

          {inspecting && status === "running" && !picked ? <VisualEditHint onExit={() => toggleInspect(false)} /> : null}
          {inspecting && picked ? (
            <VisualEditPanel
              key={`${picked.path}|${picked.classes}|${picked.text}`}
              projectId={projectId}
              element={picked}
              tailwind={tailwind ?? false}
              send={toFrame}
              onClose={() => {
                toFrame({ type: "deselect" });
                setPicked(null);
              }}
            />
          ) : null}
          <div
            className={cn("ws-frame relative mx-auto h-full", framed && (device === "mobile" ? "rounded-[44px] bg-code-bg p-3 shadow-xl ring-1 ring-border-strong" : "rounded-[26px] bg-code-bg p-2.5 shadow-xl ring-1 ring-border-strong"))}
            style={{ width: width ? width + (device === "mobile" ? 24 : 20) : "100%", maxWidth: "100%", height: framed ? "min(100%, 900px)" : "100%" }}
            data-device={device}
          >
            {device === "mobile" ? <span aria-hidden="true" className="absolute left-1/2 top-[19px] z-[2] h-[18px] w-[28%] -translate-x-1/2 rounded-full bg-code-bg" /> : null}
            {/* On the phone bezel the app starts below a status strip, so the island never covers it. */}
            <div ref={viewportRef} className={cn("relative h-full overflow-hidden bg-card", framed && (device === "mobile" ? "rounded-[32px] pt-[30px]" : "rounded-[18px]"))}>
              {status === "running" && src ? (
                <iframe
                  ref={frameRef}
                  key={frameKey}
                  src={src}
                  title="Project preview"
                  sandbox={SANDBOX}
                  onLoad={() => {
                    const el = frameRef.current;
                    if (!el) return;
                    if (!calm) {
                      // First real load of this preview URL: the app assembles top-down under a
                      // scanline (M11). Later loads (reload, sync, restart) develop back into focus.
                      const target = loadedOnce.current ? el : viewportRef.current;
                      const cls = loadedOnce.current ? "ws-frame-develop" : "ws-assemble";
                      if (target) {
                        target.classList.remove(cls);
                        void target.offsetWidth;
                        target.classList.add(cls);
                        // Drop the wrapper class once played so a later iframe (reload) does not re-assemble.
                        if (cls === "ws-assemble") setTimeout(() => target.classList.remove(cls), 800);
                      }
                    }
                    loadedOnce.current = true;
                    setPicked(null);
                  }}
                  className="block size-full border-0 bg-white"
                />
              ) : (
                <FrameState canEdit={canEdit} showOperatorDetails={showOperatorDetails} />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   States inside the frame
   --------------------------------------------------------------------------- */

function FrameState({ canEdit, showOperatorDetails }: { canEdit: boolean; showOperatorDetails: boolean }) {
  const rt = useRuntime();
  const { status, state, session, tail, busy } = rt;

  if (status === "unknown") {
    return (
      <div className="absolute inset-0" role="status" aria-label="Checking the preview">
        <SkeletonApp shimmer />
      </div>
    );
  }

  let card: React.ReactNode;
  if (status === "unavailable" && !rt.configured) {
    card = (
      <StatusCard icon={<MonitorOff className="size-5" aria-hidden="true" />} title="Previews are not available on this deployment" description="Your files, the editor, version history and AI still work.">
        <StillWorks />
        {showOperatorDetails && state?.runnerSetupHint ? <OperatorDetails>{state.runnerSetupHint}</OperatorDetails> : null}
      </StatusCard>
    );
  } else if (status === "unavailable") {
    card = (
      <StatusCard icon={<CloudOff className="size-5" aria-hidden="true" />} title="Preview isn't available right now" description="The sandbox that runs previews isn't responding. Your files, the editor and version history still work.">
        <RetryCountdown />
        <StillWorks />
        {showOperatorDetails ? (
          <OperatorDetails>
            <p>Previews run in a separate sandboxed runner service, which did not respond{state?.runnerError ? ` (${state.runnerError})` : ""}.</p>
            <p className="mt-2">
              Locally: start it with <code className="rounded bg-muted px-1">npm run runner:dev</code> (after a one-time <code className="rounded bg-muted px-1">npm run runner:prepare</code>). In production, check that <code className="rounded bg-muted px-1">RUNNER_URL</code> and{" "}
              <code className="rounded bg-muted px-1">RUNNER_TOKEN</code> point at a healthy runner.
            </p>
          </OperatorDetails>
        ) : null}
      </StatusCard>
    );
  } else if (status === "starting") {
    card = (
      <StatusCard icon={<Loader2 className="size-5 animate-spin text-signal" aria-hidden="true" />} title="Starting the dev server…" description="Files are copied into an isolated sandbox and dependencies linked.">
        {session?.startedAt ? <Elapsed since={session.startedAt} /> : null}
        <LogTail lines={tail} />
      </StatusCard>
    );
  } else if (status === "error") {
    const errLines = tail.filter((l) => l.stream !== "stdout");
    card = (
      <StatusCard tone="danger" icon={<Square className="size-4 fill-current" aria-hidden="true" />} title="The preview failed" description={session?.error ?? "The dev server exited unexpectedly."}>
        <LogTail lines={errLines.length ? errLines : tail} />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            appearance="app"
            onClick={() => {
              const stderr = tail.filter((l) => l.stream === "stderr").map((l) => l.line);
              emit("codexa:ai-fix-request", { error: session?.error ?? "The preview failed to start", logs: (stderr.length ? stderr : tail.map((l) => l.line)).slice(-20) });
            }}
          >
            <Wand2 className="size-3.5" aria-hidden="true" /> Ask AI to fix
          </Button>
          <Button size="sm" appearance="app" onClick={() => void rt.run("start")} loading={busy === "start"} disabled={!canEdit}>
            <Play className="size-3.5" aria-hidden="true" /> Start again
          </Button>
        </div>
      </StatusCard>
    );
  } else {
    card = (
      <StatusCard icon={<Play className="size-5 translate-x-px fill-current" aria-hidden="true" />} title={session?.status === "stopped" && session.stoppedAt ? "Preview stopped" : "Run your app"} description="Starts the dev server in an isolated sandbox. Edits sync as you type.">
        <Button onClick={() => void rt.run("start")} loading={busy === "start"} disabled={!canEdit || busy !== null} size="sm" appearance="app" className="mt-4">
          <Play className="size-3.5 fill-current" aria-hidden="true" /> Start preview
        </Button>
        {!canEdit ? <p className="mt-2 text-[12px] text-muted-foreground">You have view access; an editor can start the preview.</p> : null}
      </StatusCard>
    );
  }

  // Behind the card: a quiet dotted canvas only (a fake wireframe read as a broken page). The card
  // sits in the upper third.
  return (
    <div className="absolute inset-0 overflow-auto">
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_9%,transparent)_1px,transparent_1.5px)] [background-size:16px_16px]" />

      </div>
      <div className="relative z-[1] flex min-h-full flex-col items-center justify-start p-5 pt-[10%]">{card}</div>
    </div>
  );
}

function StatusCard({ icon, title, description, tone, children }: { icon: React.ReactNode; title: string; description: string; tone?: "danger"; children?: React.ReactNode }) {
  return (
    <div className="pop-in w-full max-w-[420px] rounded-2xl border border-border bg-card px-6 py-6 text-center shadow-lg" role={tone === "danger" ? "alert" : undefined}>
      <span className={cn("mx-auto flex size-10 items-center justify-center rounded-xl bg-muted shadow-[inset_0_0_0_1px_var(--border)]", tone === "danger" ? "bg-danger/10 text-danger" : "text-muted-foreground")}>{icon}</span>
      <h2 className="mt-4 text-[15px] font-semibold tracking-tight text-balance">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground text-pretty">{description}</p>
      {children}
    </div>
  );
}

function Elapsed({ since }: { since: string }) {
  const now = useNow(1000);
  const t = Date.parse(since);
  if (Number.isNaN(t)) return null;
  return <p className="mt-2 font-mono text-[12px] tabular-nums text-muted-foreground">{formatElapsed(now - t)} elapsed</p>;
}

/** "Checking again in 24s": the real next status poll, plus a Retry that checks now. */
function RetryCountdown() {
  const rt = useRuntime();
  const now = useNow(1000, rt.nextPollAt !== null);
  const left = rt.nextPollAt ? Math.max(0, Math.ceil((rt.nextPollAt - now) / 1000)) : null;
  return (
    <div className="mt-4 flex flex-col items-center gap-1.5">
      <Button size="sm" variant="outline" appearance="app" onClick={() => void rt.refresh()} disabled={rt.nextPollAt === null}>
        <RefreshCw className={cn("size-3.5", rt.nextPollAt === null && "animate-spin")} aria-hidden="true" /> {rt.nextPollAt === null ? "Checking…" : "Retry now"}
      </Button>
      {left !== null ? <p className="font-mono text-[11.5px] tabular-nums text-muted-foreground">Checking again in {left}s</p> : null}
    </div>
  );
}

/** What still works without a preview, from real capability state (no optimistic chips). */
function StillWorks() {
  const agent = useAgent();
  const deploy = useOptionalDeployments();
  const canPublish = deploy?.data?.providers.some((p) => p.available) ?? false;
  const items: { label: string; Icon: typeof FileCode2 }[] = [
    { label: "Editor and files", Icon: FileCode2 },
    { label: "Version history", Icon: History },
    ...(agent.ai?.configured ? [{ label: "AI agent", Icon: agent.ai.mock ? Bot : Sparkles }] : []),
    ...(canPublish ? [{ label: "Publish", Icon: Rocket }] : []),
  ];
  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">What still works</p>
      <ul className="mt-2.5 flex flex-wrap justify-center gap-1.5">
        {items.map(({ label, Icon }) => (
          <li key={label} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-foreground/85">
            <Icon className="size-3.5 text-success" aria-hidden="true" /> {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OperatorDetails({ children }: { children: React.ReactNode }) {
  return (
    <details className="group mt-4 w-full rounded-xl border border-border bg-card text-left text-xs">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        Details for the server operator
        <span className="transition-transform group-open:rotate-90" aria-hidden="true">
          ›
        </span>
      </summary>
      <div className="border-t border-border px-3 py-2.5 leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}

function LogTail({ lines }: { lines: LogLine[] }) {
  if (!lines.length) return null;
  return (
    <pre className="mt-4 max-h-44 overflow-auto rounded-xl border border-code-border bg-code-bg p-2.5 text-left font-mono text-[11px] leading-5 text-code-fg" aria-label="Recent log lines">
      {lines.map((l, i) => (
        <div key={`${l.ts}-${i}`} className={cn(l.stream === "stderr" && "text-danger", l.stream === "system" && "text-syn-attr")}>
          {stripAnsi(l.line)}
        </div>
      ))}
    </pre>
  );
}

/**
 * A decorative app wireframe behind status cards (never presented as the user's app). It only
 * shimmers while the first status check is in flight; behind a settled state it stays still, so
 * "unavailable" never looks like "loading".
 */
function SkeletonApp({ shimmer = false }: { shimmer?: boolean }) {
  const bar = (className: string) => (shimmer ? <Skeleton className={className} /> : <div className={cn("rounded-md bg-foreground/[0.06]", className)} />);
  return (
    <div className="absolute inset-0 overflow-hidden p-5" aria-hidden="true">
      <div className="flex items-center gap-3">
        {bar("size-7 rounded-lg")}
        {bar("h-3 w-24")}
        <div className="ml-auto flex gap-2">
          {bar("h-3 w-12")}
          {bar("h-3 w-12")}
          {bar("h-7 w-20 rounded-full")}
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-lg space-y-3 text-center">
        {bar("mx-auto h-6 w-3/4")}
        {bar("mx-auto h-6 w-1/2")}
        {bar("mx-auto mt-4 h-3 w-2/3")}
        {bar("mx-auto mt-5 h-9 w-32 rounded-full")}
      </div>
      <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn("space-y-2 rounded-xl border border-border p-3", !shimmer && "bg-card/50")}>
            {bar("h-20 w-full rounded-lg")}
            {bar("h-3 w-2/3")}
            {bar("h-3 w-1/2")}
          </div>
        ))}
      </div>
    </div>
  );
}
