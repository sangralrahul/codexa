import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { capabilities, env, runtimeHostsConfigured, runtimeSetupHint } from "@/lib/env";
import { runnerHealth } from "@/lib/runtime/client";
import { activeEmailProvider, EMAIL_PROVIDER_NAMES } from "@/lib/email/providers";

/**
 * Platform health for the signed-in dashboard: the same facts GET /api/v1/status reports
 * (database and runner probed with 2s timeouts; AI, email and hosting reported as configured or
 * not, never as "reachable"). "not_configured" is an honest grey, not a failure.
 */
export type ComponentState = "operational" | "degraded" | "down" | "not_configured" | "unknown";
export type PlatformComponent = { id: "database" | "runner" | "ai" | "email" | "hosting"; name: string; state: ComponentState; detail: string; latencyMs?: number };
export type PlatformStatus = { checkedAt: string; components: PlatformComponent[]; overall: ComponentState };

async function checkDatabase(): Promise<PlatformComponent> {
  const start = Date.now();
  try {
    await Promise.race([db.run(sql`select 1`), new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000))]);
    return { id: "database", name: "Database", state: "operational", detail: "Answered a test query.", latencyMs: Date.now() - start };
  } catch {
    return { id: "database", name: "Database", state: "down", detail: "Did not answer within 2 seconds.", latencyMs: Date.now() - start };
  }
}

async function checkRunner(): Promise<PlatformComponent> {
  const start = Date.now();
  if (!capabilities.runner) return { id: "runner", name: "Runner", state: "not_configured", detail: runtimeSetupHint() ?? "Not configured." };
  const h = await runnerHealth(true);
  const ms = Date.now() - start;
  if (!h.ok) return { id: "runner", name: "Runner", state: "down", detail: "Not reachable: previews, builds and Codexa deployments will not start.", latencyMs: ms };
  const sessions = h.health?.sessions.total ?? 0;
  const driver = String(h.health?.driver?.driver ?? "unknown");
  const degraded = h.health && (!h.health.cgroups.memory || !h.health.cgroups.pids);
  return {
    id: "runner",
    name: "Runner",
    state: degraded ? "degraded" : "operational",
    detail: degraded ? `Up (${driver}), but resource limits are unavailable on its host.` : `Up (${driver} driver, ${sessions} active session${sessions === 1 ? "" : "s"}).`,
    latencyMs: ms,
  };
}

function checkAi(): PlatformComponent {
  if (!capabilities.ai) return { id: "ai", name: "AI generation", state: "not_configured", detail: "No Anthropic or OpenAI API key is configured." };
  const providers = [capabilities.anthropic ? "Anthropic" : null, capabilities.openai ? "OpenAI" : null].filter(Boolean).join(", ");
  return { id: "ai", name: "AI generation", state: "unknown", detail: `${providers} configured (default: ${env.AI_DEFAULT_PROVIDER}). Reachability is reported per run.` };
}

function checkEmail(): PlatformComponent {
  return capabilities.email
    ? { id: "email", name: "Email delivery", state: "unknown", detail: `${EMAIL_PROVIDER_NAMES[activeEmailProvider() ?? "resend"]} is configured. Delivery is confirmed per message.` }
    : { id: "email", name: "Email delivery", state: "not_configured", detail: "No email provider: verification and invitation emails are queued in the outbox." };
}

function checkHosting(runner: PlatformComponent): PlatformComponent {
  const codexa = capabilities.runner && runtimeHostsConfigured();
  const vercel = capabilities.vercel;
  if (!codexa && !vercel) return { id: "hosting", name: "Hosting", state: "not_configured", detail: "Neither Codexa hosting (needs a runner and site hosts) nor Vercel is configured." };
  const names = [codexa ? `Codexa hosting (*.${env.DEPLOY_HOST})` : null, vercel ? "Vercel" : null].filter(Boolean).join(" · ");
  if (codexa && runner.state === "down") return { id: "hosting", name: "Hosting", state: "down", detail: `${names}. Codexa builds run in the runner, which is not reachable.` };
  return { id: "hosting", name: "Hosting", state: codexa ? runner.state : "unknown", detail: names };
}

export async function getPlatformStatus(): Promise<PlatformStatus> {
  const [database, runner] = await Promise.all([checkDatabase(), checkRunner()]);
  const components: PlatformComponent[] = [database, runner, checkAi(), checkEmail(), checkHosting(runner)];
  const overall: ComponentState = components.some((c) => c.state === "down") ? "down" : components.some((c) => c.state === "degraded") ? "degraded" : "operational";
  return { checkedAt: new Date().toISOString(), components, overall };
}
