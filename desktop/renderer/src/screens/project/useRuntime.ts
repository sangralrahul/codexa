import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, runtimeApi, type RuntimeState } from "../../lib/api";

export type RuntimeView = {
  state: RuntimeState | null;
  status: "loading" | "unavailable" | "stopped" | "starting" | "running" | "error";
  previewUrl: string | null;
  error: string | null;
  busy: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  restart: () => Promise<void>;
  refresh: () => Promise<void>;
};

/**
 * The project's live preview session on Codexa's servers: polls its state (fast while starting,
 * slowly while running, which also keeps it alive) and starts it once when the project opens.
 */
export function useRuntime(projectId: string): RuntimeView {
  const [state, setState] = useState<RuntimeState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const autoStarted = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setState(await runtimeApi.state(projectId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach the preview service");
    }
  }, [projectId]);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await runtimeApi.start(projectId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start the preview");
    } finally {
      setBusy(false);
      await refresh();
    }
  }, [projectId, refresh]);

  const stop = useCallback(async () => {
    setBusy(true);
    try {
      await runtimeApi.stop(projectId);
    } catch {
      // ignore: the state refresh shows what happened
    } finally {
      setBusy(false);
      await refresh();
    }
  }, [projectId, refresh]);

  const restart = useCallback(async () => {
    await stop();
    await start();
  }, [start, stop]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data from the API when the inputs change
    void refresh();
  }, [refresh]);

  const session = state?.session ?? null;
  const status: RuntimeView["status"] = !state
    ? "loading"
    : !state.runnerAvailable
      ? "unavailable"
      : !session || session.status === "stopped"
        ? "stopped"
        : session.status === "error"
          ? "error"
          : session.status;

  // Start the preview once when the project opens (as the web editor does).
  useEffect(() => {
    if (status === "stopped" && !autoStarted.current) {
      autoStarted.current = true;
      void start();
    }
  }, [status, start]);

  useEffect(() => {
    if (status === "loading" || status === "unavailable") return;
    const ms = status === "starting" ? 2000 : status === "running" ? 20000 : 0;
    if (!ms) return;
    const t = setInterval(() => void refresh(), ms);
    return () => clearInterval(t);
  }, [status, refresh]);

  return {
    state,
    status,
    previewUrl: status === "running" ? (session?.previewUrl ?? null) : null,
    error: error ?? session?.error ?? (status === "unavailable" ? (state?.runnerSetupHint ?? state?.runnerError ?? null) : null),
    busy,
    start,
    stop,
    restart,
    refresh,
  };
}
