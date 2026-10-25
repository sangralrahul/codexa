import "server-only";
import { containersEnabled, env, runnerUrl, runtimeSetupHint } from "@/lib/env";
import { ApiError } from "@/lib/api";
import { logger } from "@/lib/logger";
import { bindings } from "@/lib/cloudflare/bindings";
import type { RunnerDeployResult, RunnerExecResult, RunnerHealth, RunnerSessionView, LogLine, ExecCommand } from "./types";

/**
 * Typed client for the runner control API (services/runner).
 *
 * Two transports, chosen per deployment:
 *   - "http": a runner service reachable at RUNNER_URL (local development,
 *     self-hosted runners). Authenticated with RUNNER_TOKEN.
 *   - "containers": on Cloudflare, each project has a Durable Object
 *     (binding SANDBOX) that owns a Cloudflare Container running the runner.
 *     The Durable Object starts the container on demand and authenticates to
 *     it with a token only it knows.
 * When neither is available every call fails fast with RunnerUnavailableError
 * (HTTP 503 to the browser) instead of hanging.
 */

export type RuntimeMode = "http" | "containers";

export function runtimeMode(): RuntimeMode | null {
  if (runnerUrl()) return "http";
  if (containersEnabled()) return "containers";
  return null;
}

export class RunnerUnavailableError extends ApiError {
  constructor(detail?: string) {
    const mode = runtimeMode();
    const base = runnerUrl();
    super(
      503,
      mode === "containers"
        ? `The project's container could not be reached${detail ? ` (${detail})` : ""}. Try again in a moment.`
        : base
          ? `The runner service is not reachable at ${base}${detail ? ` (${detail})` : ""}. Start it with "npm run runner:dev" or check RUNNER_URL.`
          : (runtimeSetupHint() ?? "No runtime is configured for this deployment."),
      mode || base ? "runner_unavailable" : "runner_not_configured",
    );
  }
}

export class RunnerRequestError extends ApiError {
  log?: string;
  constructor(status: number, message: string, code: string, log?: string) {
    super(status, message, code);
    this.log = log;
  }
}

type SendInit = { method: string; body?: string; timeoutMs?: number; signal?: AbortSignal };
type Transport = (path: string, init: SendInit) => Promise<Response>;

/** Header the Durable Object uses to tell control calls from preview traffic. */
export const RUNNER_CONTROL_HEADER = "x-codexa-runner";

function transportFor(projectId: string | null): Transport {
  const mode = runtimeMode();
  if (mode === "http") {
    const base = runnerUrl()!;
    return (path, init) =>
      fetch(new URL(path, base).toString(), {
        method: init.method,
        headers: { authorization: `Bearer ${env.RUNNER_TOKEN}`, "content-type": "application/json" },
        body: init.body,
        signal: init.signal ?? AbortSignal.timeout(init.timeoutMs ?? 30_000),
        cache: "no-store",
      });
  }
  if (mode === "containers") {
    if (!projectId) throw new RunnerUnavailableError("no project selected");
    const ns = bindings().SANDBOX!;
    const stub = ns.get(ns.idFromName(projectId));
    return (path, init) =>
      stub.fetch(`http://runner${path}`, {
        method: init.method,
        headers: { "content-type": "application/json", [RUNNER_CONTROL_HEADER]: "control" },
        body: init.body,
      }) as unknown as Promise<Response>;
  }
  throw new RunnerUnavailableError();
}

async function request<T>(projectId: string | null, method: string, path: string, body?: unknown, opts: { timeoutMs?: number } = {}): Promise<T> {
  let res: Response;
  try {
    res = await transportFor(projectId)(path, { method, body: body === undefined ? undefined : JSON.stringify(body), timeoutMs: opts.timeoutMs });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    healthCache = { at: Date.now(), result: { ok: false, health: null, error: err instanceof Error ? err.message : String(err) } };
    throw new RunnerUnavailableError(err instanceof Error ? (err.name === "TimeoutError" ? "timed out" : err.message) : undefined);
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as T & { error?: { code?: string; message?: string }; log?: string };
  if (!res.ok) {
    if (res.status === 503 && data.error?.code === "container_unavailable") throw new RunnerUnavailableError(data.error.message);
    const status = res.status === 401 ? 500 : res.status; // a token mismatch is a server misconfiguration, not the user's fault
    const message = res.status === 401 ? "Runner rejected RUNNER_TOKEN; check that the web app and the runner share the same value" : data.error?.message ?? `Runner request failed (${res.status})`;
    logger.warn("runner request failed", { method, path, status: res.status, message });
    throw new RunnerRequestError(status, message, data.error?.code ?? "runner_error", data.log);
  }
  return data as T;
}

const HEALTH_TTL_MS = 2000;
let healthCache: { at: number; result: { ok: boolean; health: RunnerHealth | null; error: string | null } } | null = null;

/**
 * Cached (2s) health check. With Cloudflare Containers there is no shared
 * runner to probe (each project's container starts on demand), so the
 * runtime is reported available whenever the SANDBOX binding exists.
 */
export async function runnerHealth(force = false): Promise<{ ok: boolean; health: RunnerHealth | null; error: string | null }> {
  const mode = runtimeMode();
  if (mode === "containers") return { ok: true, health: null, error: null };
  if (!mode) return { ok: false, health: null, error: runtimeSetupHint() ?? "not configured" };
  if (!force && healthCache && Date.now() - healthCache.at < HEALTH_TTL_MS) return healthCache.result;
  let result: { ok: boolean; health: RunnerHealth | null; error: string | null };
  try {
    const res = await transportFor(null)("/health", { method: "GET", timeoutMs: 2000 });
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

export type DeployInput = { projectId: string; deploymentId: string; framework: string; settings: Record<string, unknown>; files: Record<string, string>; slug: string };
export type BuiltFile = { path: string; contentBase64: string; size: number };

/** Runner API for one project (selects that project's container on Cloudflare). */
export function runnerFor(projectId: string) {
  const r = <T>(method: string, path: string, body?: unknown, opts?: { timeoutMs?: number }) => request<T>(projectId, method, path, body, opts);
  return {
    createSession: (input: CreateSessionInput) => r<{ id: string; port: number; previewUrl: string; status: string; session: RunnerSessionView }>("POST", "/sessions", input, { timeoutMs: 60_000 }),
    getSession: (id: string, heartbeat = false) => r<{ session: RunnerSessionView }>("GET", `/sessions/${encodeURIComponent(id)}${heartbeat ? "?heartbeat=1" : ""}`),
    syncFiles: (id: string, files: Record<string, string>, deletes: string[] = []) => r<{ written: number; deleted: number }>("PUT", `/sessions/${encodeURIComponent(id)}/files`, { files, deletes }, { timeoutMs: 60_000 }),
    exec: (id: string, command: ExecCommand, timeoutMs?: number) => r<RunnerExecResult>("POST", `/sessions/${encodeURIComponent(id)}/exec`, { command, timeoutMs }, { timeoutMs: (timeoutMs ?? 120_000) + 10_000 }),
    logsTail: (id: string, n = 200) => r<{ lines: LogLine[]; status: string }>("GET", `/sessions/${encodeURIComponent(id)}/logs?tail=${n}`),
    stopSession: (id: string) => r<{ stopped: boolean }>("DELETE", `/sessions/${encodeURIComponent(id)}`),
    deploy: (input: Omit<DeployInput, "projectId">) => r<RunnerDeployResult>("POST", "/deployments", { ...input, projectId }, { timeoutMs: 15 * 60_000 }),
    deploymentFiles: (deploymentId: string) => r<{ files: BuiltFile[]; totalBytes: number }>("GET", `/deployments/${encodeURIComponent(deploymentId)}/files`, undefined, { timeoutMs: 120_000 }),
    setAlias: (slug: string, deploymentId: string) => r<{ slug: string; deploymentId: string; url: string }>("POST", "/deployments/alias", { slug, deploymentId }),
    deployLog: (deploymentId: string) => r<{ log: string }>("GET", `/deployments/${encodeURIComponent(deploymentId)}/log`),
    /** Raw SSE response for relaying to the browser. */
    logsStream: async (id: string, signal?: AbortSignal): Promise<Response> => {
      try {
        const res = await transportFor(projectId)(`/sessions/${encodeURIComponent(id)}/logs`, { method: "GET", signal });
        if (!res.ok) throw new RunnerRequestError(res.status === 404 ? 404 : 502, res.status === 404 ? "Session not found on the runner" : `Runner log stream failed (${res.status})`, "runner_error");
        return res;
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new RunnerUnavailableError(err instanceof Error ? err.message : undefined);
      }
    },
  };
}
