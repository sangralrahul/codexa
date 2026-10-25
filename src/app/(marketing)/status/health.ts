import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { env, capabilities } from "@/lib/env";

export type ComponentState = "operational" | "degraded" | "down" | "not_configured" | "unknown";
export type ComponentStatus = { id: string; name: string; state: ComponentState; detail: string; latencyMs?: number };
export type StatusReport = { checkedAt: string; components: ComponentStatus[]; overall: ComponentState; source: "api" | "fallback" };

const TIMEOUT_MS = 2000;

async function timed<T>(fn: () => Promise<T>): Promise<{ ok: true; value: T; ms: number } | { ok: false; error: string; ms: number }> {
  const start = Date.now();
  try {
    const value = await fn();
    return { ok: true, value, ms: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), ms: Date.now() - start };
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }, (e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

async function checkDatabase(): Promise<ComponentStatus> {
  const r = await timed(() => withTimeout(db.execute(sql`select 1`), TIMEOUT_MS));
  return r.ok
    ? { id: "database", name: "Database", state: "operational", detail: "PostgreSQL answered a test query.", latencyMs: r.ms }
    : { id: "database", name: "Database", state: "down", detail: "PostgreSQL did not answer within the timeout.", latencyMs: r.ms };
}

async function checkRunner(): Promise<ComponentStatus> {
  const url = new URL("/health", env.RUNNER_URL).toString();
  const r = await timed(async () => {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store", headers: { authorization: `Bearer ${env.RUNNER_TOKEN}` } });
    return res.status;
  });
  if (!r.ok) return { id: "runner", name: "Runner (sandboxes and previews)", state: "down", detail: "The runner service is not reachable. Previews and builds will not start.", latencyMs: r.ms };
  if (r.value >= 200 && r.value < 300) return { id: "runner", name: "Runner (sandboxes and previews)", state: "operational", detail: "The runner service answered its health check.", latencyMs: r.ms };
  return { id: "runner", name: "Runner (sandboxes and previews)", state: "degraded", detail: `The runner service answered with HTTP ${r.value}.`, latencyMs: r.ms };
}

function checkAi(): ComponentStatus {
  if (!capabilities.ai) return { id: "ai", name: "AI generation", state: "not_configured", detail: "No Anthropic or OpenAI API key is configured on this instance. AI features show a \"not configured\" state." };
  const providers = [capabilities.anthropic ? "Anthropic" : null, capabilities.openai ? "OpenAI" : null].filter(Boolean).join(", ");
  return { id: "ai", name: "AI generation", state: "unknown", detail: `${providers} configured. Provider reachability is not probed from this page; failures are reported per run.` };
}

function checkEmail(): ComponentStatus {
  return capabilities.email
    ? { id: "email", name: "Email delivery", state: "unknown", detail: "Resend is configured. Delivery is confirmed per message in the outbox; this page does not probe the provider." }
    : { id: "email", name: "Email delivery", state: "not_configured", detail: "No email provider is configured. Verification and invitation emails are queued in the outbox and can be read by an operator." };
}

/**
 * Fallback status used when the runtime owner's GET /api/v1/status is absent.
 * Checks the database and the runner directly with a 2s timeout each.
 */
export async function getFallbackStatus(): Promise<StatusReport> {
  const [database, runner] = await Promise.all([checkDatabase(), checkRunner()]);
  const components: ComponentStatus[] = [
    { id: "web", name: "Web application", state: "operational", detail: "This page was rendered by the web application." },
    database,
    runner,
    checkAi(),
    checkEmail(),
  ];
  return { checkedAt: new Date().toISOString(), components, overall: overallState(components), source: "fallback" };
}

export function overallState(components: ComponentStatus[]): ComponentState {
  if (components.some((c) => c.state === "down")) return "down";
  if (components.some((c) => c.state === "degraded")) return "degraded";
  return "operational";
}

function isReport(v: unknown): v is StatusReport {
  return Boolean(v && typeof v === "object" && Array.isArray((v as StatusReport).components));
}

/** Prefer the runtime owner's status API if it exists and returns the expected shape; otherwise fall back. */
export async function getStatus(): Promise<StatusReport> {
  try {
    const res = await fetch(new URL("/api/v1/status", env.APP_URL).toString(), { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (res.ok) {
      const data: unknown = await res.json();
      if (isReport(data)) return { ...data, overall: data.overall ?? overallState(data.components), checkedAt: data.checkedAt ?? new Date().toISOString(), source: "api" };
    }
  } catch {
    // The API is owned by another team and may not exist yet; fall through.
  }
  return getFallbackStatus();
}
