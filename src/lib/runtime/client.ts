import "server-only";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/api";
import { logger } from "@/lib/logger";
import type { RunnerDeployResult, RunnerExecResult, RunnerHealth, RunnerSessionView, LogLine, ExecCommand } from "./types";

/**
 * Typed client for the runner control API (services/runner). The runner is a
 * separate process; when it is down every call fails fast with
 * RunnerUnavailableError (HTTP 503 to the browser) instead of hanging.
 */
export class RunnerUnavailableError extends ApiError {
  constructor(detail?: string) {
    super(503, `The runner service is not reachable at ${env.RUNNER_URL}${detail ? ` (${detail})` : ""}. Start it with "npm run runner:dev" or set RUNNER_URL.`, "runner_unavailable");
  }
}

export class RunnerRequestError extends ApiError {
  log?: string;
  constructor(status: number, message: string, code: string, log?: string) {
    super(status, message, code);
    this.log = log;
  }
}

const HEALTH_TTL_MS = 2000;
let healthCache: { at: number; result: { ok: boolean; health: RunnerHealth | null; error: string | null } } | null = null;

function authHeaders(): Record<string, string> {
  return { authorization: `Bearer ${env.RUNNER_TOKEN}`, "content-type": "application/json" };
}

function url(path: string) {
  return new URL(path, env.RUNNER_URL).toString();
}

async function request<T>(method: string, path: string, body?: unknown, opts: { timeoutMs?: number } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url(path), {
      method,
      headers: authHeaders(),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      cache: "no-store",
    });
  } catch (err) {
    healthCache = { at: Date.now(), result: { ok: false, health: null, error: err instanceof Error ? err.message : String(err) } };
    throw new RunnerUnavailableError(err instanceof Error ? err.name === "TimeoutError" ? "timed out" : err.message : undefined);
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as T & { error?: { code?: string; message?: string }; log?: string };
  if (!res.ok) {
    const status = res.status === 401 ? 500 : res.status; // a token mismatch is a server misconfiguration, not the user's fault
    const message = res.status === 401 ? "Runner rejected RUNNER_TOKEN; check that the web app and the runner share the same value" : data.error?.message ?? `Runner request failed (${res.status})`;
    logger.warn("runner request failed", { method, path, status: res.status, message });
    throw new RunnerRequestError(status, message, data.error?.code ?? "runner_error", data.log);
  }
  return data as T;
}

/** Cached (2s) health check so panels polling every few seconds do not hammer the runner. */
export async function runnerHealth(force = false): Promise<{ ok: boolean; health: RunnerHealth | null; error: string | null }> {
  if (!force && healthCache && Date.now() - healthCache.at < HEALTH_TTL_MS) return healthCache.result;
  let result: { ok: boolean; health: RunnerHealth | null; error: string | null };
  try {
    const res = await fetch(url("/health"), { headers: authHeaders(), signal: AbortSignal.timeout(2000), cache: "no-store" });
    if (!res.ok) result = { ok: false, health: null, error: `HTTP ${res.status}` };
    else result = { ok: true, health: (await res.json()) as RunnerHealth, error: null };
  } catch (err) {
    result = { ok: false, health: null, error: err instanceof Error ? (err.name === "TimeoutError" ? "timed out" : err.message) : String(err) };
  }
  healthCache = { at: Date.now(), result };
  return result;
}

export async function runnerAvailable(): Promise<boolean> {
  return (await runnerHealth()).ok;
}

export type CreateSessionInput = {
  projectId: string;
  framework: string;
  settings: Record<string, unknown>;
  files: Record<string, string>;
  env: Record<string, string>;
  previewToken: string;
};

export const runner = {
  createSession: (input: CreateSessionInput) => request<{ id: string; port: number; previewUrl: string; status: string; session: RunnerSessionView }>("POST", "/sessions", input, { timeoutMs: 60_000 }),
  getSession: (id: string, heartbeat = false) => request<{ session: RunnerSessionView }>("GET", `/sessions/${encodeURIComponent(id)}${heartbeat ? "?heartbeat=1" : ""}`),
  syncFiles: (id: string, files: Record<string, string>, deletes: string[] = []) => request<{ written: number; deleted: number }>("PUT", `/sessions/${encodeURIComponent(id)}/files`, { files, deletes }, { timeoutMs: 60_000 }),
  exec: (id: string, command: ExecCommand, timeoutMs?: number) => request<RunnerExecResult>("POST", `/sessions/${encodeURIComponent(id)}/exec`, { command, timeoutMs }, { timeoutMs: (timeoutMs ?? 120_000) + 10_000 }),
  logsTail: (id: string, n = 200) => request<{ lines: LogLine[]; status: string }>("GET", `/sessions/${encodeURIComponent(id)}/logs?tail=${n}`),
  stopSession: (id: string) => request<{ stopped: boolean }>("DELETE", `/sessions/${encodeURIComponent(id)}`),
  deploy: (input: { projectId: string; deploymentId: string; framework: string; settings: Record<string, unknown>; files: Record<string, string>; slug: string }) =>
    request<RunnerDeployResult>("POST", "/deployments", input, { timeoutMs: 15 * 60_000 }),
  setAlias: (slug: string, deploymentId: string) => request<{ slug: string; deploymentId: string; url: string }>("POST", "/deployments/alias", { slug, deploymentId }),
  deployLog: (deploymentId: string) => request<{ log: string }>("GET", `/deployments/${encodeURIComponent(deploymentId)}/log`),
  /** Raw SSE response for relaying to the browser. */
  logsStream: async (id: string, signal?: AbortSignal): Promise<Response> => {
    try {
      const res = await fetch(url(`/sessions/${encodeURIComponent(id)}/logs`), { headers: { authorization: `Bearer ${env.RUNNER_TOKEN}` }, signal, cache: "no-store" });
      if (!res.ok) throw new RunnerRequestError(res.status === 404 ? 404 : 502, res.status === 404 ? "Session not found on the runner" : `Runner log stream failed (${res.status})`, "runner_error");
      return res;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new RunnerUnavailableError(err instanceof Error ? err.message : undefined);
    }
  },
};
