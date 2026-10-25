"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Monitor, Play, RefreshCw, RotateCw, Smartphone, Square, Tablet, Wand2 } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { emit, on } from "@/lib/client/events";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState, Spinner, StatusDot } from "@/components/ui/misc";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { LogLine, RuntimeStateDto } from "@/lib/runtime/types";

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
  const label = useMemo(() => ({ unavailable: runnerConfigured ? "Runner offline" : "Not configured", starting: "Starting", running: "Running", stopped: "Stopped", error: "Error" })[status], [status, runnerConfigured]);

  return (
    <TooltipProvider>
      <section className="flex h-full min-h-0 flex-col bg-background" aria-label="Preview">
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border px-2 py-1.5">
          <span className="flex items-center gap-1.5 pr-1 text-xs font-medium" aria-live="polite">
            <StatusDot status={dot} />
            {label}
          </span>
          {status === "running" || status === "starting" ? (
            <>
              <Button size="sm" variant="outline" onClick={() => void run("stop")} loading={busy === "stop"} disabled={busy !== null}>
                <Square className="size-3.5" aria-hidden="true" /> Stop
              </Button>
              <Button size="sm" variant="outline" onClick={() => void run("restart")} loading={busy === "restart"} disabled={busy !== null}>
                <RotateCw className="size-3.5" aria-hidden="true" /> Restart
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => void run("start")} loading={busy === "start"} disabled={busy !== null || status === "unavailable"}>
              <Play className="size-3.5" aria-hidden="true" /> {status === "error" ? "Start again" : "Start"}
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1">
            <div role="group" aria-label="Viewport size" className="hidden items-center rounded-md border border-border p-0.5 sm:flex">
              {(Object.keys(VIEWPORTS) as Viewport[]).map((v) => {
                const { Icon, label: vl } = VIEWPORTS[v];
                return (
                  <Tooltip key={v} content={vl}>
                    <button
                      type="button"
                      aria-label={vl}
                      aria-pressed={viewport === v}
                      onClick={() => setViewport(v)}
                      className={cn("rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring", viewport === v && "bg-muted text-foreground")}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </button>
                  </Tooltip>
                );
              })}
            </div>
            <Tooltip content="Reload preview">
              <Button size="icon" variant="ghost" aria-label="Reload preview" disabled={status !== "running"} onClick={() => setFrameKey((k) => k + 1)}>
                <RefreshCw className="size-4" aria-hidden="true" />
              </Button>
            </Tooltip>
            <Tooltip content="Open in a new tab">
              {status === "running" && previewUrl ? (
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" aria-label="Open preview in a new tab" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              ) : (
                <Button size="icon" variant="ghost" aria-label="Open preview in a new tab" disabled>
                  <ExternalLink className="size-4" aria-hidden="true" />
                </Button>
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
            <div className="p-4">
              <Alert variant="info" title="Previews are not available on this deployment">
                <p>Live previews, builds and Codexa hosting need the sandboxed runner service, and none is configured here (RUNNER_URL is not set). Your files, the editor, version history and AI still work.</p>
                <p className="mt-2">
                  To enable previews, run <code className="rounded bg-muted px-1">services/runner</code> on a Linux server and set <code className="rounded bg-muted px-1">RUNNER_URL</code> and <code className="rounded bg-muted px-1">RUNNER_TOKEN</code>. See the deployment docs.
                </p>
              </Alert>
            </div>
          ) : status === "unavailable" ? (
            <div className="p-4">
              <Alert variant="warning" title="The runner service is not reachable">
                <p>Previews run in a separate sandboxed runner process, which is offline right now{state?.runnerError ? ` (${state.runnerError})` : ""}.</p>
                <p className="mt-2">
                  Locally: start it with <code className="rounded bg-muted px-1">npm run runner:dev</code> (after a one-time <code className="rounded bg-muted px-1">npm run runner:prepare</code>). In production, check that <code className="rounded bg-muted px-1">RUNNER_URL</code> and <code className="rounded bg-muted px-1">RUNNER_TOKEN</code> point at a healthy runner.
                </p>
              </Alert>
            </div>
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
              <Spinner className="size-6 text-primary" />
              <p className="text-sm font-medium">Starting the dev server…</p>
              <p className="text-xs text-muted-foreground">Files are being materialised in a sandbox and dependencies linked. This usually takes a few seconds.</p>
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
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                icon={<Play className="size-8" aria-hidden="true" />}
                title={session?.status === "stopped" && session.stoppedAt ? "Preview stopped" : "No preview running"}
                description="Start the dev server to see your app here. It runs in an isolated sandbox; edits in the editor sync automatically."
                action={
                  <Button onClick={() => void run("start")} loading={busy === "start"} disabled={busy !== null}>
                    <Play className="size-4" aria-hidden="true" /> Start preview
                  </Button>
                }
              />
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-1 text-[11px] text-muted-foreground">
          <span className="truncate">{status === "running" && previewUrl ? previewUrl : "Preview URL appears here once the server is running."}</span>
          <label className="flex shrink-0 items-center gap-1.5">
            <input type="checkbox" checked={autoRefresh} onChange={toggleAutoRefresh} className="size-3.5 accent-primary" />
            Reload after sync
          </label>
        </div>
      </section>
    </TooltipProvider>
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
