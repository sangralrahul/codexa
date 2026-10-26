"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloudOff, ExternalLink, Monitor, MonitorOff, Play, RefreshCw, RotateCw, Smartphone, Square, Tablet, Wand2 } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { emit, on } from "@/lib/client/events";
import { Button } from "@/components/ui/button";
import { Alert, Spinner, StatusDot } from "@/components/ui/misc";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { LogLine, RuntimeStateDto } from "@/lib/runtime/types";
import { toolButton } from "./panel-tabs";

/**
 * Preview panel: runtime controls + the sandboxed dev server in an iframe.
 * Cross-panel events:
 *   listens  codexa:run-command  { command: start|stop|restart|install|build }
 *   listens  codexa:files-changed { paths } → debounced POST runtime/sync so edits hot-reload
 *   emits    codexa:runtime-status { status, previewUrl, error }
 *   emits    codexa:ai-fix-request { error, logs }  (for the AI chat to pick up; see docs/RUNTIME.md)
 */
type Viewport = "mobile" | "tablet" | "desktop";
const VIEWPORTS: Record<Viewport, { width: number | null; label: string; Icon: typeof Monitor }> = {
  mobile: { width: 390, label: "Mobile (390px)", Icon: Smartphone },
  tablet: { width: 820, label: "Tablet (820px)", Icon: Tablet },
  desktop: { width: null, label: "Desktop (full width)", Icon: Monitor },
};

const base = (id: string) => `/api/v1/projects/${encodeURIComponent(id)}/runtime`;

export function PreviewPanel({ projectId }: { projectId: string; conversationId?: string }) {
  const [state, setState] = useState<RuntimeStateDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"start" | "stop" | "restart" | "install" | "build" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [frameKey, setFrameKey] = useState(0);
  const [tail, setTail] = useState<LogLine[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const pendingPaths = useRef<Set<string>>(new Set());
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitted = useRef<string>("");

  const session = state?.session ?? null;
  const status: "unavailable" | "starting" | "running" | "stopped" | "error" = !state ? "stopped" : !state.runnerAvailable ? "unavailable" : (session?.status ?? "stopped");
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const refresh = useCallback(async () => {
    try {
      const next = await api<RuntimeStateDto>(base(projectId));
      setState(next);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load runtime status");
    }
  }, [projectId]);

  // Poll: fast while starting, slower while running (doubles as the usage heartbeat), slow otherwise.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (cancelled) return;
      await refresh();
      const current = statusRef.current;
      const delay = current === "starting" ? 2000 : current === "running" ? 10_000 : 30_000;
      timer = setTimeout(tick, delay);
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [refresh]);

  // Log tail while starting or on error (what the user needs to see).
  useEffect(() => {
    if (status !== "starting" && status !== "error") return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api<{ lines: LogLine[] }>(`${base(projectId)}/logs?tail=12`);
        if (!cancelled) setTail(res.lines);
      } catch {
        /* status poll reports the real error */
      }
    };
    void load();
    const t = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [status, projectId]);

  // Broadcast status changes to the workspace header and other panels.
  useEffect(() => {
    if (!state) return;
    const key = `${status}|${session?.previewUrl ?? ""}|${session?.error ?? ""}`;
    if (key === lastEmitted.current) return;
    lastEmitted.current = key;
    emit("codexa:runtime-status", { status, previewUrl: status === "running" ? session?.previewUrl : null, error: status === "unavailable" ? state.runnerError : session?.error });
  }, [state, status, session]);

  const run = useCallback(
    async (command: "start" | "stop" | "restart" | "install" | "build") => {
      setBusy(command);
      setActionError(null);
      setNotice(null);
      try {
        if (command === "stop" || command === "restart") {
          await api(`${base(projectId)}/stop`, { method: "POST" });
        }
        if (command === "start" || command === "restart") {
          await api(`${base(projectId)}/start`, { method: "POST" });
          setFrameKey((k) => k + 1);
        }
        if (command === "install" || command === "build") {
          const res = await api<{ exitCode: number; output: string; timedOut: boolean; durationMs: number; skipped?: boolean }>(`${base(projectId)}/exec`, { method: "POST", json: { command } });
          setNotice(
            res.skipped
              ? res.output
              : `${command === "install" ? "Install" : "Build"} ${res.timedOut ? "timed out" : res.exitCode === 0 ? "succeeded" : `failed (exit ${res.exitCode})`} in ${(res.durationMs / 1000).toFixed(1)}s. See the Logs panel for output.`,
          );
        }
        await refresh();
      } catch (err) {
        setActionError(err instanceof ClientApiError ? err.message : err instanceof Error ? err.message : "Request failed");
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [projectId, refresh],
  );

  useEffect(() => on("codexa:run-command", (d) => void run(d.command)), [run]);

  // Debounced file sync so edits reach the sandbox (Vite HMR does the rest).
  const flushSync = useCallback(async () => {
    const paths = [...pendingPaths.current];
    pendingPaths.current.clear();
    if (!paths.length || statusRef.current !== "running") return;
    try {
      await api(`${base(projectId)}/sync`, { method: "POST", json: { paths } });
      if (autoRefresh) setFrameKey((k) => k + 1);
    } catch (err) {
      setActionError(err instanceof Error ? `Sync failed: ${err.message}` : "Sync failed");
    }
  }, [projectId, autoRefresh]);
  useEffect(
    () =>
      on("codexa:files-changed", (d) => {
        for (const p of d.paths) pendingPaths.current.add(p);
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => void flushSync(), 400);
      }),
    [flushSync],
  );
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage after mount (SSR-safe)
      setAutoRefresh(localStorage.getItem("codexa:preview:auto-refresh") === "1");
    } catch {
      /* private mode */
    }
  }, []);
  const toggleAutoRefresh = () => {
    setAutoRefresh((v) => {
      try {
        localStorage.setItem("codexa:preview:auto-refresh", v ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !v;
    });
  };

  const askAiToFix = () => {
    const stderr = tail.filter((l) => l.stream === "stderr").map((l) => l.line);
    const error = session?.error ?? "The preview failed to start";
    window.dispatchEvent(new CustomEvent("codexa:ai-fix-request", { detail: { error, logs: (stderr.length ? stderr : tail.map((l) => l.line)).slice(-20) } }));
    setNotice("Sent the error to the AI chat. If nothing happens, paste the error into the chat yourself.");
  };

  const width = VIEWPORTS[viewport].width;
  const previewUrl = session?.previewUrl ?? null;
  const dot = status === "running" ? "ok" : status === "starting" ? "busy" : status === "error" || status === "unavailable" ? "error" : "idle";
  const runnerConfigured = state?.runnerConfigured !== false;
  const label = useMemo(() => ({ unavailable: runnerConfigured ? "Unavailable" : "Not configured", starting: "Starting", running: "Running", stopped: "Stopped", error: "Error" })[status], [status, runnerConfigured]);

  return (
    <TooltipProvider>
      <section className="flex h-full min-h-0 flex-col bg-background" aria-label="Preview">
        <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-border px-2">
          <span className="flex items-center gap-1.5 pl-1 pr-1.5 text-xs font-medium" aria-live="polite">
            <StatusDot status={dot} />
            {label}
          </span>
          {status === "running" || status === "starting" ? (
            <>
              <Button size="sm" variant="outline" onClick={() => void run("stop")} loading={busy === "stop"} disabled={busy !== null} className="h-7 rounded-md px-2.5 text-xs">
                <Square className="size-3 fill-current" aria-hidden="true" /> Stop
              </Button>
              <Button size="sm" variant="outline" onClick={() => void run("restart")} loading={busy === "restart"} disabled={busy !== null} className="h-7 rounded-md px-2.5 text-xs">
                <RotateCw className="size-3.5" aria-hidden="true" /> Restart
              </Button>
            </>
          ) : status !== "unavailable" ? (
            <Button size="sm" variant="outline" onClick={() => void run("start")} loading={busy === "start"} disabled={busy !== null} className="h-7 rounded-md px-2.5 text-xs">
              <Play className="size-3 fill-current text-success" aria-hidden="true" /> {status === "error" ? "Start again" : "Start"}
            </Button>
          ) : null}
          <div className="ml-auto flex items-center gap-0.5">
            <div role="group" aria-label="Viewport size" className="mr-1 hidden items-center rounded-md bg-muted p-0.5 sm:flex">
              {(Object.keys(VIEWPORTS) as Viewport[]).map((v) => {
                const { Icon, label: vl } = VIEWPORTS[v];
                return (
                  <Tooltip key={v} content={vl}>
                    <button
                      type="button"
                      aria-label={vl}
                      aria-pressed={viewport === v}
                      onClick={() => setViewport(v)}
                      className={cn("rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring", viewport === v && "bg-background text-foreground shadow-sm")}
                    >
                      <Icon className="size-3.5" aria-hidden="true" />
                    </button>
                  </Tooltip>
                );
              })}
            </div>
            <Tooltip content="Reload preview">
              <button type="button" aria-label="Reload preview" disabled={status !== "running"} onClick={() => setFrameKey((k) => k + 1)} className={cn(toolButton, "size-7")}>
                <RefreshCw className="size-3.5" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip content="Open in a new tab">
              {status === "running" && previewUrl ? (
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" aria-label="Open preview in a new tab" className={cn(toolButton, "size-7")}>
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              ) : (
                <button type="button" aria-label="Open preview in a new tab" disabled className={cn(toolButton, "size-7")}>
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </Tooltip>
          </div>
        </div>

        {actionError ? (
          <div className="px-3 pt-3">
            <Alert variant="danger" title="Runtime action failed">{actionError}</Alert>
          </div>
        ) : null}
        {notice ? (
          <div className="px-3 pt-3">
            <Alert variant="info">{notice}</Alert>
          </div>
        ) : null}
        {loadError && !state ? (
          <div className="px-3 pt-3">
            <Alert variant="danger" title="Could not load runtime status">{loadError}</Alert>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto bg-muted/40">
          {status === "unavailable" && state?.runnerConfigured === false ? (
            <PanelState
              icon={<MonitorOff className="size-5" aria-hidden="true" />}
              title="Previews are not available on this deployment"
              description="Your files, the editor, version history and AI still work."
              details={state?.runnerSetupHint ? <p>{state.runnerSetupHint}</p> : null}
            />
          ) : status === "unavailable" ? (
            <PanelState
              icon={<CloudOff className="size-5" aria-hidden="true" />}
              title="Preview isn't available right now"
              description="The sandbox that runs previews isn't responding. Your files, the editor and version history still work."
              action={
                <Button size="sm" variant="outline" onClick={() => void refresh()} className="h-8 rounded-md">
                  <RefreshCw className="size-3.5" aria-hidden="true" /> Try again
                </Button>
              }
              details={
                <>
                  <p>Previews run in a separate sandboxed runner service, which did not respond{state?.runnerError ? ` (${state.runnerError})` : ""}.</p>
                  <p className="mt-2">
                    Locally: start it with <code className="rounded bg-muted px-1">npm run runner:dev</code> (after a one-time <code className="rounded bg-muted px-1">npm run runner:prepare</code>). In production, check that <code className="rounded bg-muted px-1">RUNNER_URL</code> and <code className="rounded bg-muted px-1">RUNNER_TOKEN</code> point at a healthy runner.
                  </p>
                </>
              }
            />
          ) : status === "running" && previewUrl ? (
            <div className={cn("flex h-full min-h-[320px] justify-center", width ? "p-3" : "")}>
              <iframe
                key={frameKey}
                src={previewUrl}
                title="Project preview"
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals allow-downloads"
                className={cn("h-full bg-white", width ? "max-w-full rounded-lg border border-border shadow-sm" : "w-full border-0")}
                style={width ? { width } : undefined}
              />
            </div>
          ) : status === "starting" ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl border border-border bg-background shadow-sm">
                <Spinner className="size-5 text-foreground" />
              </span>
              <p className="text-sm font-semibold">Starting the dev server…</p>
              <p className="max-w-xs text-xs text-muted-foreground">Files are being copied into an isolated sandbox and dependencies linked. This usually takes a few seconds.</p>
              <LogTail lines={tail} />
            </div>
          ) : status === "error" ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <Alert variant="danger" title="The preview failed" className="w-full max-w-xl text-left">
                {session?.error ?? "The dev server exited unexpectedly."}
              </Alert>
              <LogTail lines={tail.filter((l) => l.stream !== "stdout").length ? tail.filter((l) => l.stream !== "stdout") : tail} />
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" variant="outline" onClick={askAiToFix}>
                  <Wand2 className="size-3.5" aria-hidden="true" /> Ask AI to fix
                </Button>
                <Button size="sm" onClick={() => void run("start")} loading={busy === "start"}>
                  <Play className="size-3.5" aria-hidden="true" /> Start again
                </Button>
              </div>
            </div>
          ) : (
            <PanelState
              icon={<Play className="size-5 fill-current" aria-hidden="true" />}
              title={session?.status === "stopped" && session.stoppedAt ? "Preview stopped" : "No preview running"}
              description="Start the dev server to see your app here. It runs in an isolated sandbox; edits in the editor sync automatically."
              action={
                <Button onClick={() => void run("start")} loading={busy === "start"} disabled={busy !== null} size="sm" className="h-8 rounded-md px-3">
                  <Play className="size-3.5 fill-current" aria-hidden="true" /> Start preview
                </Button>
              }
            />
          )}
        </div>
        <div className="flex h-7 shrink-0 items-center justify-between gap-2 border-t border-border bg-surface px-3 text-[11px] text-muted-foreground">
          <span className={cn("truncate", status === "running" && previewUrl && "font-mono text-foreground/80")}>{status === "running" && previewUrl ? previewUrl : "The preview address appears here once the server is running."}</span>
          <label className="flex shrink-0 items-center gap-1.5">
            <input type="checkbox" checked={autoRefresh} onChange={toggleAutoRefresh} className="size-3.5 accent-primary" />
            Reload after sync
          </label>
        </div>
      </section>
    </TooltipProvider>
  );
}

/** Centered panel state: icon tile, title, one sentence, optional action and collapsible operator details. */
function PanelState({ icon, title, description, action, details }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode; details?: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="pop-in flex w-full max-w-sm flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground shadow-sm">{icon}</span>
        <p className="mt-4 text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        {action ? <div className="mt-4">{action}</div> : null}
        {details ? (
          <details className="group mt-6 w-full rounded-lg border border-border bg-background text-left text-xs">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
              Details for the server operator
              <span className="transition-transform group-open:rotate-90" aria-hidden="true">›</span>
            </summary>
            <div className="border-t border-border px-3 py-2.5 leading-relaxed text-muted-foreground">{details}</div>
          </details>
        ) : null}
      </div>
    </div>
  );
}

function LogTail({ lines }: { lines: LogLine[] }) {
  if (!lines.length) return null;
  return (
    <pre className="max-h-48 w-full max-w-xl overflow-auto rounded-md border border-border bg-card p-2 text-left font-mono text-[11px] leading-5 text-muted-foreground" aria-label="Recent log lines">
      {lines.map((l, i) => (
        <div key={`${l.ts}-${i}`} className={cn(l.stream === "stderr" && "text-danger", l.stream === "system" && "text-primary")}>
          {l.line}
        </div>
      ))}
    </pre>
  );
}
