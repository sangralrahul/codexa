import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { integrationConnections, type IntegrationConnection } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { badRequest, notFound } from "@/lib/api";
import { getIntegration } from "@/config/integrations";
import { getAdapter, DATABASE_PROVIDERS } from "./providers";
import { splitConfig, toConnectionDto } from "./masking";
import type { ConnectionDto, ConnectionTestResult } from "./types";

/** Secrets are stored as one encrypted JSON blob: { [fieldKey]: value }. */
function encodeSecret(secret: Record<string, string>): string | null {
  const entries = Object.entries(secret).filter(([, v]) => v.length > 0);
  if (!entries.length) return null;
  return encryptSecret(JSON.stringify(Object.fromEntries(entries)));
}

export function decodeSecret(secretEnc: string | null): Record<string, string> {
  if (!secretEnc) return {};
  try {
    const parsed = JSON.parse(decryptSecret(secretEnc)) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) if (typeof v === "string") out[k] = v;
    return out;
  } catch {
    return {};
  }
}

function storedSecretKeys(row: IntegrationConnection): string[] {
  const meta = row.config.__secretKeys;
  return Array.isArray(meta) ? meta.filter((k): k is string => typeof k === "string") : [];
}

function serialize(row: IntegrationConnection): ConnectionDto {
  const { __secretKeys: _omit, ...config } = row.config;
  return toConnectionDto({ ...row, config }, storedSecretKeys(row));
}

export async function listConnections(workspaceId: string): Promise<ConnectionDto[]> {
  const rows = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.workspaceId, workspaceId))
    .orderBy(desc(integrationConnections.createdAt));
  return rows.map(serialize);
}

export async function getConnectionRow(workspaceId: string, connectionId: string): Promise<IntegrationConnection> {
  const rows = await db
    .select()
    .from(integrationConnections)
    .where(and(eq(integrationConnections.id, connectionId), eq(integrationConnections.workspaceId, workspaceId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw notFound("Connection");
  return row;
}

export async function getConnection(workspaceId: string, connectionId: string): Promise<ConnectionDto> {
  return serialize(await getConnectionRow(workspaceId, connectionId));
}

export async function createConnection(input: {
  workspaceId: string;
  provider: string;
  name: string;
  config: Record<string, string>;
  secret?: Record<string, string>;
  createdBy: string;
}): Promise<ConnectionDto> {
  const def = getIntegration(input.provider);
  const adapter = getAdapter(input.provider);
  if (!def || !adapter || def.status !== "available") throw badRequest(`Unknown or unsupported provider: ${input.provider}`);
  // Accept secrets either in `secret` or mixed into `config`; the definition decides which keys are secret.
  const merged = { ...input.config, ...(input.secret ?? {}) };
  const { config, secret } = splitConfig(input.provider, merged);
  for (const f of def.configFields) {
    const v = f.type === "password" ? secret[f.key] : config[f.key];
    if (f.required && !(v ?? "").trim()) throw badRequest(`${f.label} is required`, [{ path: f.key, message: "Required" }]);
  }
  try {
    adapter.validate?.(config, secret);
  } catch (err) {
    throw badRequest(err instanceof Error ? err.message : "Invalid configuration");
  }
  const secretKeys = Object.keys(secret).filter((k) => secret[k].length > 0);
  const [row] = await db
    .insert(integrationConnections)
    .values({
      workspaceId: input.workspaceId,
      provider: input.provider,
      name: input.name.trim().slice(0, 100) || def.name,
      config: { ...config, __secretKeys: secretKeys },
      secretEnc: encodeSecret(secret),
      status: "unverified",
      createdBy: input.createdBy,
    })
    .returning();
  return serialize(row);
}

export async function deleteConnection(workspaceId: string, connectionId: string): Promise<boolean> {
  const rows = await db
    .delete(integrationConnections)
    .where(and(eq(integrationConnections.id, connectionId), eq(integrationConnections.workspaceId, workspaceId)))
    .returning({ id: integrationConnections.id });
  return rows.length > 0;
}

/** Run the provider's live test and persist status/lastTestedAt/lastError. */
export async function testConnection(workspaceId: string, connectionId: string): Promise<{ connection: ConnectionDto; result: ConnectionTestResult }> {
  const row = await getConnectionRow(workspaceId, connectionId);
  const adapter = getAdapter(row.provider);
  let result: ConnectionTestResult;
  if (!adapter) result = { ok: false, message: `No adapter for provider ${row.provider}` };
  else {
    const { __secretKeys: _omit, ...config } = row.config;
    const cfg: Record<string, string> = {};
    for (const [k, v] of Object.entries(config)) if (typeof v === "string") cfg[k] = v;
    try {
      result = await adapter.test(cfg, decodeSecret(row.secretEnc));
    } catch (err) {
      result = { ok: false, message: err instanceof Error ? err.message.slice(0, 300) : "Connection test failed" };
    }
  }
  const [updated] = await db
    .update(integrationConnections)
    .set({ status: result.ok ? "connected" : "error", lastTestedAt: new Date(), lastError: result.ok ? null : result.message, updatedAt: new Date() })
    .where(eq(integrationConnections.id, row.id))
    .returning();
  return { connection: serialize(updated), result };
}

/** Resolve a database connection's credentials for a project's workspace. Throws 404 when it does not belong there. */
export async function resolveDatabaseConnection(workspaceId: string, connectionId: string) {
  const row = await getConnectionRow(workspaceId, connectionId);
  if (!DATABASE_PROVIDERS.has(row.provider)) throw badRequest("This connection is not a database connection");
  const secret = decodeSecret(row.secretEnc);
  const connectionString = secret.connectionString;
  if (!connectionString) throw badRequest("Connection has no stored connection string");
  const sslRaw = typeof row.config.ssl === "string" ? row.config.ssl : "";
  const ssl = row.provider === "supabase" ? true : /^(1|true|yes|require|on)$/i.test(sslRaw);
  return { id: row.id, provider: row.provider, name: row.name, connectionString, ssl };
}
