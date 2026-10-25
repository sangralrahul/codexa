import "server-only";
import { activeEmailProvider, EMAIL_PROVIDER_NAMES } from "@/lib/email/providers";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { capabilities, runtimeSetupHint } from "@/lib/env";
import { runnerHealth, runtimeMode } from "@/lib/runtime/client";

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
  const r = await timed(() => withTimeout(db.run(sql`select 1`), TIMEOUT_MS));
  return r.ok
    ? { id: "database", name: "Database", state: "operational", detail: "The database answered a test query.", latencyMs: r.ms }
    : { id: "database", name: "Database", state: "down", detail: "The database did not answer within the timeout.", latencyMs: r.ms };
}

async function checkRunner(): Promise<ComponentStatus> {
  if (!capabilities.runner) return { id: "runner", name: "Runner (sandboxes and previews)", state: "not_configured", detail: runtimeSetupHint() ?? "Not configured." };
  if (runtimeMode() === "containers")
    return { id: "runner", name: "Runner (sandboxes and previews)", state: "operational", detail: "Each project gets its own Cloudflare Container, started when someone runs it." };
  const r = await timed(async () => (await runnerHealth(true)).ok);
  if (!r.ok || !r.value) return { id: "runner", name: "Runner (sandboxes and previews)", state: "down", detail: "The runner service is not reachable. Previews and builds will not start.", latencyMs: r.ms };
  return { id: "runner", name: "Runner (sandboxes and previews)", state: "operational", detail: "The runner service answered its health check.", latencyMs: r.ms };
}

function checkAi(): ComponentStatus {
  if (!capabilities.ai) return { id: "ai", name: "AI generation", state: "not_configured", detail: "No Anthropic or OpenAI API key is configured on this instance. AI features show a \"not configured\" state." };
  const providers = [capabilities.anthropic ? "Anthropic" : null, capabilities.openai ? "OpenAI" : null].filter(Boolean).join(", ");
  return { id: "ai", name: "AI generation", state: "unknown", detail: `${providers} configured. Provider reachability is not probed from this page; failures are reported per run.` };
}

function checkEmail(): ComponentStatus {
  return capabilities.email
    ? { id: "email", name: "Email delivery", state: "unknown", detail: `${EMAIL_PROVIDER_NAMES[activeEmailProvider() ?? "resend"]} is configured. Delivery is confirmed per message in the outbox; this page does not probe the provider.` }
    : { id: "email", name: "Email delivery", state: "not_configured", detail: "No email provider is configured. Verification and invitation emails are queued in the outbox and can be read by an operator." };
}

/** Checks the database and the runner directly with a 2s timeout each. */
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

/**
 * Runs the checks in-process (same components as GET /api/v1/status). Fetching our own API over
 * the network would cost a round trip, and on Cloudflare a Worker calling its own URL is unreliable.
 */
export async function getStatus(): Promise<StatusReport> {
  return getFallbackStatus();
}
