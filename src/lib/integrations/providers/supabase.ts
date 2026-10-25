import type { ConnectionTestResult, ProviderAdapter } from "../types";
import { testPostgres, validateConnectionString } from "./postgres";
import { httpProbe, statusMessage } from "./http";

export function validateSupabaseConfig(config: Record<string, string>, secret: Record<string, string>) {
  const url = (config.projectUrl ?? "").trim();
  if (!url) throw new Error("Project URL is required");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Project URL must be a valid https URL");
  }
  if (parsed.protocol !== "https:") throw new Error("Project URL must use https");
  if (!(config.anonKey ?? "").trim()) throw new Error("Anon key is required");
  validateConnectionString(secret.connectionString);
}

export async function testSupabaseRest(projectUrl: string, anonKey: string, fetchImpl: typeof fetch = fetch): Promise<ConnectionTestResult> {
  const base = projectUrl.replace(/\/+$/, "");
  return httpProbe(
    `${base}/rest/v1/`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
    (status, body) => {
      if (status >= 200 && status < 300) {
        const paths = body && typeof body === "object" && "paths" in body ? Object.keys((body as { paths: Record<string, unknown> }).paths ?? {}).length : null;
        return { ok: true, message: "Supabase REST endpoint reachable", details: { restPaths: paths } };
      }
      return { ok: false, message: statusMessage(status, "Supabase REST") };
    },
    fetchImpl,
  );
}

export const supabaseAdapter: ProviderAdapter = {
  id: "supabase",
  validate: validateSupabaseConfig,
  async test(config, secret) {
    // Supabase direct connections always use TLS.
    const pg = await testPostgres(secret.connectionString, true);
    if (!pg.ok) return { ok: false, message: `Database: ${pg.message}` };
    const rest = await testSupabaseRest(config.projectUrl, config.anonKey);
    if (!rest.ok) return { ok: false, message: `Database connected, but REST check failed: ${rest.message}`, details: pg.details };
    return { ok: true, message: `${pg.message}; REST endpoint reachable`, details: { ...pg.details, ...rest.details } };
  },
};
