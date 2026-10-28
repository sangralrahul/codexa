"use client";

import * as React from "react";
import { api, ClientApiError } from "@/lib/client/api";
import { emit, on } from "@/lib/client/events";
import type { LogLine, RuntimeSessionDto, RuntimeStateDto } from "@/lib/runtime/types";

/**
 * The workspace's single owner of the preview runtime. It lives for the whole workspace
 * (not inside a tab), so status polling, file sync and the run-command listener never
 * stop when a panel is hidden:
 *   listens  codexa:run-command  { command } → POST runtime/start|stop|exec
 *   listens  codexa:files-changed { paths } → debounced POST runtime/sync (Vite HMR does the rest)
 *   emits    codexa:runtime-status { status, previewUrl, error }
 * It also owns the one log stream (SSE) that the terminal, the dock ticker and Problems read.
 */
export type RuntimeStatus = "unknown" | "unavailable" | "starting" | "running" | "stopped" | "error";
export type RuntimeCommand = "start" | "stop" | "restart" | "install" | "build";
export type LogConn = "connecting" | "live" | "ended" | "error";

const base = (id: string) => `/api/v1/projects/${encodeURIComponent(id)}/runtime`;
const AUTO_REFRESH_KEY = "codexa:preview:auto-refresh";
const MAX_LINES = 5000;

/* ---------------------------------------------------------------------------
   Log store: one SSE subscription, many readers (xterm writes line by line;
   the ticker and Problems read snapshots throttled to one per frame).
   --------------------------------------------------------------------------- */
export type LogSnapshot = { version: number; conn: LogConn; runtime: string; last: LogLine | null; errors: number; total: number };

export class LogStore {
  lines: LogLine[] = [];
  private snap: LogSnapshot = { version: 0, conn: "connecting", runtime: "stopped", last: null, errors: 0, total: 0 };
  private listeners = new Set<() => void>();
  private lineListeners = new Set<(line: LogLine) => void>();
  private clearListeners = new Set<() => void>();
  private frame = 0;

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };
  getSnapshot = () => this.snap;
  onLine(cb: (line: LogLine) => void) {
    this.lineListeners.add(cb);
    return () => {
      this.lineListeners.delete(cb);
    };
  }
  onClear(cb: () => void) {
    this.clearListeners.add(cb);
    return () => {
      this.clearListeners.delete(cb);
    };
  }
  private notify() {
    if (typeof window === "undefined") return;
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.listeners.forEach((l) => l());
    });
  }
  private set(patch: Partial<LogSnapshot>) {
    this.snap = { ...this.snap, ...patch, version: this.snap.version + 1 };
    this.notify();
  }
  append(line: LogLine) {
    this.lines.push(line);
    if (this.lines.length > MAX_LINES) this.lines.splice(0, this.lines.length - MAX_LINES);
    this.lineListeners.forEach((l) => l(line));
    this.set({ last: line, total: this.snap.total + 1, errors: this.snap.errors + (line.stream === "stderr" ? 1 : 0) });
  }
  setConn(conn: LogConn) {
    if (conn !== this.snap.conn) this.set({ conn });
  }
  setRuntime(runtime: string) {
    if (runtime !== this.snap.runtime) this.set({ runtime });
  }
  clear() {
    this.lines = [];
    this.clearListeners.forEach((l) => l());
    this.set({ last: null, errors: 0, total: 0 });
  }
}

export function useLogSnapshot(store: LogStore) {
  return React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/* ---------------------------------------------------------------------------
   Runtime context
   --------------------------------------------------------------------------- */
export type RuntimeContextValue = {
  state: RuntimeStateDto | null;
  status: RuntimeStatus;
  /** False only when the server says no runner is configured at all (vs. configured but down). */
  configured: boolean;
  session: RuntimeSessionDto | null;
  previewUrl: string | null;
  loadError: string | null;
  busy: RuntimeCommand | null;
  actionError: string | null;
  clearActionError: () => void;
  notice: string | null;
  clearNotice: () => void;
  /** When the next status poll is due (ms epoch), for an honest "Checking again in 24s". */
  nextPollAt: number | null;
  refresh: () => Promise<void>;
  run: (command: RuntimeCommand) => Promise<void>;
  /** Bumped to reload the preview iframe. */
  frameKey: number;
  reloadFrame: () => void;
  /** The last successful sync of edited files into the sandbox. */
  lastSync: { at: number; paths: string[]; seq: number } | null;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  /** Recent log lines while starting or after an error (REST tail). */
  tail: LogLine[];
  logs: LogStore;
};

const RuntimeContext = React.createContext<RuntimeContextValue | null>(null);

export function useRuntime(): RuntimeContextValue {
  const ctx = React.useContext(RuntimeContext);
  if (!ctx) throw new Error("useRuntime must be used inside <WorkspaceRuntimeProvider>");
  return ctx;
}

/** Same as useRuntime but null outside a provider (for components that also render standalone). */
export function useOptionalRuntime(): RuntimeContextValue | null {
  return React.useContext(RuntimeContext);
}

export function WorkspaceRuntimeProvider({ projectId, autoStart = false, children }: { projectId: string; /** Start the preview when the project opens and it is not running (editors only). */ autoStart?: boolean; children: React.ReactNode }) {
  const [state, setState] = React.useState<RuntimeStateDto | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<RuntimeCommand | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [nextPollAt, setNextPollAt] = React.useState<number | null>(null);
  const [frameKey, setFrameKey] = React.useState(0);
  const [lastSync, setLastSync] = React.useState<RuntimeContextValue["lastSync"]>(null);
  const [autoRefresh, setAutoRefreshState] = React.useState(false);
  const [tail, setTail] = React.useState<LogLine[]>([]);
  const [logs] = React.useState(() => new LogStore());
  const pendingPaths = React.useRef<Set<string>>(new Set());
  const syncTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitted = React.useRef("");
  const pollNow = React.useRef<() => void>(() => {});

  const session = state?.session ?? null;
  const status: RuntimeStatus = !state ? "unknown" : !state.runnerAvailable ? "unavailable" : (session?.status ?? "stopped");
  const statusRef = React.useRef(status);
  React.useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const refresh = React.useCallback(async () => {
    try {
      const next = await api<RuntimeStateDto>(base(projectId));
      setState(next);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load runtime status");
    }
  }, [projectId]);

  // Poll: fast while starting, slower while running (doubles as the usage heartbeat), slow otherwise.
  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (cancelled) return;
      if (timer) clearTimeout(timer);
      setNextPollAt(null);
      await refresh();
      if (cancelled) return;
      const current = statusRef.current;
      const delay = current === "starting" ? 2000 : current === "running" ? 10_000 : 30_000;
      setNextPollAt(Date.now() + delay);
      timer = setTimeout(tick, delay);
    };
    pollNow.current = () => void tick();
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [refresh]);

  // REST log tail while starting or on error (what the preview frame shows).
  React.useEffect(() => {
    if (status !== "starting" && status !== "error") return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api<{ lines: LogLine[] }>(`${base(projectId)}/logs?tail=12`);
        if (!cancelled) setTail(res.lines);
      } catch {
        /* the status poll reports the real error */
      }
    };
    void load();
    const t = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [status, projectId]);

  // Broadcast status changes to the header and other panels.
  React.useEffect(() => {
    if (!state) return;
    const key = `${status}|${session?.previewUrl ?? ""}|${session?.error ?? ""}`;
    if (key === lastEmitted.current) return;
    lastEmitted.current = key;
    if (status === "unknown") return;
    emit("codexa:runtime-status", { status, previewUrl: status === "running" ? session?.previewUrl : null, error: status === "unavailable" ? state.runnerError : session?.error });
  }, [state, status, session]);

  const run = React.useCallback(
    async (command: RuntimeCommand) => {
      setBusy(command);
      setActionError(null);
      setNotice(null);
      try {
        if (command === "stop" || command === "restart") await api(`${base(projectId)}/stop`, { method: "POST" });
        if (command === "start" || command === "restart") {
          await api(`${base(projectId)}/start`, { method: "POST" });
          setFrameKey((k) => k + 1);
        }
        if (command === "install" || command === "build") {
          const res = await api<{ exitCode: number; output: string; timedOut: boolean; durationMs: number; skipped?: boolean }>(`${base(projectId)}/exec`, { method: "POST", json: { command } });
          setNotice(
            res.skipped
              ? res.output
              : `${command === "install" ? "Install" : "Build"} ${res.timedOut ? "timed out" : res.exitCode === 0 ? "succeeded" : `failed (exit ${res.exitCode})`} in ${(res.durationMs / 1000).toFixed(1)}s. The terminal has the output.`,
          );
        }
        pollNow.current();
      } catch (err) {
        setActionError(err instanceof ClientApiError ? err.message : err instanceof Error ? err.message : "Request failed");
        pollNow.current();
      } finally {
        setBusy(null);
      }
    },
    [projectId],
  );

  React.useEffect(() => on("codexa:run-command", (d) => void run(d.command)), [run]);

  // Open a project → the preview starts by itself (once per visit, never after a failure or a
  // manual stop in this visit), so the app is on screen without pressing Run.
  const autoStarted = React.useRef(false);
  React.useEffect(() => {
    if (!autoStart || autoStarted.current || status === "unknown") return;
    autoStarted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts the runtime (a request); state follows its response
    if (status === "stopped") void run("start");
  }, [autoStart, status, run]);

  // Persisted "Reload after sync" preference (the old key is respected as is).
  React.useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage after mount (SSR-safe)
      setAutoRefreshState(localStorage.getItem(AUTO_REFRESH_KEY) === "1");
    } catch {
      /* private mode */
    }
  }, []);
  const setAutoRefresh = React.useCallback((v: boolean) => {
    setAutoRefreshState(v);
    try {
      localStorage.setItem(AUTO_REFRESH_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);
  const autoRefreshRef = React.useRef(autoRefresh);
  React.useEffect(() => {
    autoRefreshRef.current = autoRefresh;
  }, [autoRefresh]);

  // Debounced file sync so edits reach the sandbox.
  const flushSync = React.useCallback(async () => {
    const paths = [...pendingPaths.current];
    pendingPaths.current.clear();
    if (!paths.length || statusRef.current !== "running") return;
    try {
      await api(`${base(projectId)}/sync`, { method: "POST", json: { paths } });
      setLastSync((s) => ({ at: Date.now(), paths, seq: (s?.seq ?? 0) + 1 }));
      if (autoRefreshRef.current) setFrameKey((k) => k + 1);
    } catch (err) {
      setActionError(err instanceof Error ? `Sync failed: ${err.message}` : "Sync failed");
    }
  }, [projectId]);
  React.useEffect(
    () =>
      on("codexa:files-changed", (d) => {
        for (const p of d.paths) pendingPaths.current.add(p);
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => void flushSync(), 400);
      }),
    [flushSync],
  );

  // The one log stream. EventSource reconnects by itself when the relay drops; when the relay
  // says there is no runtime ("end"), retry every 5s so logs appear as soon as a preview starts.
  const [reconnectKey, setReconnectKey] = React.useState(0);
  React.useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const es = new EventSource(`${base(projectId)}/logs`);
    let ended = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    es.onopen = () => logs.setConn("live");
    es.onerror = () => {
      if (!ended) logs.setConn("error");
    };
    es.addEventListener("log", (e) => {
      try {
        logs.append(JSON.parse((e as MessageEvent).data) as LogLine);
      } catch {
        /* malformed line */
      }
    });
    es.addEventListener("status", (e) => {
      try {
        logs.setRuntime((JSON.parse((e as MessageEvent).data) as { status: string }).status);
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("end", () => {
      ended = true;
      logs.setConn("ended");
      es.close();
      retry = setTimeout(() => {
        logs.setConn("connecting");
        setReconnectKey((k) => k + 1);
      }, 5000);
    });
    return () => {
      es.close();
      if (retry) clearTimeout(retry);
    };
  }, [projectId, logs, reconnectKey]);

  const value = React.useMemo<RuntimeContextValue>(
    () => ({
      state,
      status,
      configured: state?.runnerConfigured !== false,
      session,
      previewUrl: status === "running" ? (session?.previewUrl ?? null) : null,
      loadError,
      busy,
      actionError,
      clearActionError: () => setActionError(null),
      notice,
      clearNotice: () => setNotice(null),
      nextPollAt,
      refresh: async () => pollNow.current(),
      run,
      frameKey,
      reloadFrame: () => setFrameKey((k) => k + 1),
      lastSync,
      autoRefresh,
      setAutoRefresh,
      tail,
      logs,
    }),
    [state, status, session, loadError, busy, actionError, notice, nextPollAt, run, frameKey, lastSync, autoRefresh, setAutoRefresh, tail, logs],
  );

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

/** A clock that ticks every `ms` while `enabled` (for elapsed timers and countdowns). */
export function useNow(ms: number, enabled = true): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resync the clock when the timer (re)starts
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms, enabled]);
  return now;
}

/** "0:42", "12:05", "1:02:09". */
export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

/** "45s", "12m", "3h 4m". */
export function formatUptime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
