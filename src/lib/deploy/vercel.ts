import "server-only";
import { env, capabilities } from "@/lib/env";
import { logger } from "@/lib/logger";
import { DeployError, type DeployProvider, type DeployRequest } from "./types";

/**
 * Vercel adapter implemented against the REST API:
 *   POST /v13/deployments  (inline files)   → { id, url, readyState }
 *   GET  /v13/deployments/:id               → poll readyState until READY | ERROR | CANCELED
 *   GET  /v3/deployments/:id/events         → build log lines (best effort)
 *   PATCH /v9/projects/:idOrName            → not used; rollback uses an alias (POST /v2/deployments/:id/aliases)
 *
 * IMPORTANT: this adapter is gated by VERCEL_TOKEN and could NOT be exercised
 * in the authoring environment (api.vercel.com is blocked there). It follows
 * the public API documentation but should be smoke tested with a real token
 * before being relied on.
 */
const API = "https://api.vercel.com";
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 10 * 60_000;

const FRAMEWORK_MAP: Record<string, string | null> = { "vite-react": "vite", static: null, "node-express": null, nextjs: "nextjs" };

export function vercelUrl(path: string, teamId = env.VERCEL_TEAM_ID): string {
  const u = new URL(`${API}${path}`);
  if (teamId) u.searchParams.set("teamId", teamId);
  return u.toString();
}

async function vercelFetch<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const res = await fetch(vercelUrl(path), {
    ...init,
    headers: { authorization: `Bearer ${env.VERCEL_TOKEN}`, "content-type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(init.timeoutMs ?? 30_000),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { code?: string; message?: string } };
  if (!res.ok) throw new DeployError(data.error?.message ?? `Vercel API error (${res.status})`, "", data.error?.code ?? "vercel_error");
  return data;
}

type VercelDeployment = { id: string; url: string; readyState: "QUEUED" | "BUILDING" | "INITIALIZING" | "READY" | "ERROR" | "CANCELED"; errorMessage?: string | null; alias?: string[] };

export function vercelProjectName(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 52) || "codexa-app";
}

export function buildVercelPayload(req: DeployRequest) {
  const framework = FRAMEWORK_MAP[req.project.framework] ?? null;
  const settings = req.project.settings ?? {};
  return {
    name: vercelProjectName(req.slug),
    target: "production",
    files: Object.entries(req.files).map(([file, data]) => ({ file, data })),
    projectSettings: {
      framework,
      buildCommand: settings.buildCommand || undefined,
      installCommand: settings.installCommand || undefined,
      outputDirectory: settings.outputDir && settings.outputDir !== "." ? settings.outputDir : undefined,
      devCommand: settings.devCommand || undefined,
    },
    meta: { codexaProjectId: req.project.id, codexaDeploymentId: req.deploymentId },
  };
}

async function fetchEvents(id: string): Promise<string> {
  try {
    const events = await vercelFetch<{ type: string; payload?: { text?: string }; text?: string }[]>(`/v3/deployments/${encodeURIComponent(id)}/events?builds=1&limit=500`);
    if (!Array.isArray(events)) return "";
    return events
      .map((e) => e.payload?.text ?? e.text ?? "")
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
}

export const vercelProvider: DeployProvider = {
  id: "vercel",
  name: "Vercel",
  async availability() {
    if (!capabilities.vercel) return { available: false, reason: "VERCEL_TOKEN is not configured on this instance (optionally VERCEL_TEAM_ID)." };
    return { available: true, reason: null };
  },
  async deploy(req) {
    if (!capabilities.vercel) throw new DeployError("VERCEL_TOKEN is not configured", "", "not_configured");
    const logLines: string[] = [];
    const log = (l: string) => {
      logLines.push(l);
      req.onLog?.(l);
    };
    log(`Creating Vercel deployment for ${vercelProjectName(req.slug)} (${Object.keys(req.files).length} files)`);
    let created: VercelDeployment;
    try {
      created = await vercelFetch<VercelDeployment>("/v13/deployments", { method: "POST", body: JSON.stringify(buildVercelPayload(req)), timeoutMs: 120_000 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`Vercel rejected the deployment: ${message}`);
      throw new DeployError(message, logLines.join("\n"), err instanceof DeployError ? err.code : "vercel_error");
    }
    log(`Deployment ${created.id} queued (${created.readyState})`);
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let state = created;
    while (Date.now() < deadline && !["READY", "ERROR", "CANCELED"].includes(state.readyState)) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      state = await vercelFetch<VercelDeployment>(`/v13/deployments/${encodeURIComponent(created.id)}`);
      log(`State: ${state.readyState}`);
    }
    const events = await fetchEvents(created.id);
    if (events) logLines.push("--- build output ---", events);
    if (state.readyState !== "READY") {
      const message = state.readyState === "ERROR" ? `Vercel build failed${state.errorMessage ? `: ${state.errorMessage}` : ""}` : state.readyState === "CANCELED" ? "Vercel deployment was canceled" : "Timed out waiting for Vercel";
      logger.warn("vercel deployment failed", { deploymentId: req.deploymentId, state: state.readyState });
      throw new DeployError(message, logLines.join("\n"), "build_failed");
    }
    const url = `https://${state.alias?.[0] ?? state.url}`;
    log(`Live at ${url}`);
    return { url, log: logLines.join("\n"), providerDeploymentId: created.id };
  },
  async rollback(req) {
    if (!capabilities.vercel) throw new DeployError("VERCEL_TOKEN is not configured", "", "not_configured");
    if (!req.providerDeploymentId) throw new DeployError("This deployment has no Vercel id to roll back to", "", "bad_request");
    const name = vercelProjectName(req.slug);
    const alias = await vercelFetch<{ alias: string }>(`/v2/deployments/${encodeURIComponent(req.providerDeploymentId)}/aliases`, {
      method: "POST",
      body: JSON.stringify({ alias: `${name}.vercel.app` }),
    });
    return { url: `https://${alias.alias}` };
  },
};
