import { sql } from "drizzle-orm";
import { db } from "@/db";
import { handler, json } from "@/lib/api";
import { env, capabilities, runtimeSetupHint } from "@/lib/env";
import { runnerHealth } from "@/lib/runtime/client";
import { activeEmailProvider, EMAIL_PROVIDER_NAMES } from "@/lib/email/providers";

export type ComponentState = "operational" | "degraded" | "down" | "not_configured" | "unknown";
export type ComponentStatus = { id: string; name: string; state: ComponentState; detail: string; latencyMs?: number };

/**
 * GET /api/v1/status — public platform health used by the /status page.
 * Probes the database and the runner (2s timeouts); reports whether AI and
 * email are configured without pretending to know provider reachability.
 * Never includes secrets or internal hostnames beyond what the UI shows.
 */
export const GET = handler(async () => {
  const [database, runner] = await Promise.all([checkDatabase(), checkRunner()]);
  const components: ComponentStatus[] = [
    { id: "web", name: "Web application", state: "operational", detail: "The API answered this request." },
    database,
    runner,
    checkAi(),
    checkEmail(),
  ];
  const overall: ComponentState = components.some((c) => c.state === "down") ? "down" : components.some((c) => c.state === "degraded") ? "degraded" : "operational";
  return json({ checkedAt: new Date().toISOString(), components, overall }, { headers: { "cache-control": "no-store" } });
});

async function checkDatabase(): Promise<ComponentStatus> {
  const start = Date.now();
  try {
    await Promise.race([db.run(sql`select 1`), new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000))]);
    return { id: "database", name: "Database", state: "operational", detail: "The database answered a test query.", latencyMs: Date.now() - start };
  } catch {
    return { id: "database", name: "Database", state: "down", detail: "The database did not answer within 2 seconds.", latencyMs: Date.now() - start };
  }
}

async function checkRunner(): Promise<ComponentStatus> {
  const start = Date.now();
  if (!capabilities.runner) return { id: "runner", name: "Runner (sandboxes and previews)", state: "not_configured", detail: runtimeSetupHint() ?? "Not configured." };
  const h = await runnerHealth(true);
  const ms = Date.now() - start;
  if (!h.ok) return { id: "runner", name: "Runner (sandboxes and previews)", state: "down", detail: "The runner service is not reachable. Previews, builds and Codexa deployments will not start.", latencyMs: ms };
  const sessions = h.health?.sessions.total ?? 0;
  const driver = String(h.health?.driver?.driver ?? "unknown");
  const degraded = h.health && (!h.health.cgroups.memory || !h.health.cgroups.pids);
  return {
    id: "runner",
    name: "Runner (sandboxes and previews)",
    state: degraded ? "degraded" : "operational",
    detail: degraded ? `Runner is up (${driver} driver) but resource limits (cgroups) are unavailable on its host.` : `Runner is up (${driver} driver, ${sessions} active session${sessions === 1 ? "" : "s"}).`,
    latencyMs: ms,
  };
}

function checkAi(): ComponentStatus {
  if (!capabilities.ai) return { id: "ai", name: "AI generation", state: "not_configured", detail: "No Anthropic or OpenAI API key is configured on this instance." };
  const providers = [capabilities.anthropic ? "Anthropic" : null, capabilities.openai ? "OpenAI" : null].filter(Boolean).join(", ");
  return { id: "ai", name: "AI generation", state: "unknown", detail: `${providers} configured (default: ${env.AI_DEFAULT_PROVIDER}). Provider reachability is reported per run, not probed here.` };
}

function checkEmail(): ComponentStatus {
  return capabilities.email
    ? { id: "email", name: "Email delivery", state: "unknown", detail: `${EMAIL_PROVIDER_NAMES[activeEmailProvider() ?? "resend"]} is configured. Delivery is confirmed per message in the outbox.` }
    : { id: "email", name: "Email delivery", state: "not_configured", detail: "No email provider is configured; verification and invitation emails are queued in the outbox." };
}
