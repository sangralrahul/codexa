import "server-only";
import { and, eq, count } from "drizzle-orm";
import { db } from "@/db";
import { projectEnvVars } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { badRequest } from "@/lib/api";

export const MASKED_VALUE = "••••";
export const MAX_ENV_VARS = 100;
export const MAX_ENV_VALUE_LENGTH = 10_000;

/** Environment variable keys follow the POSIX convention used by every runtime we support. */
export function validateEnvKey(key: string): string {
  const k = key.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(k)) {
    throw badRequest("Environment variable keys must start with a letter or underscore and contain only letters, numbers and underscores");
  }
  return k;
}

export type EnvVarView = { id: string; key: string; value: string; isSecret: boolean; updatedAt: Date };

/**
 * List env vars for a project. Values are masked unless `reveal` is true; the
 * caller is responsible for checking the user's role before revealing.
 */
export async function listEnvVars(projectId: string, opts: { reveal?: boolean } = {}): Promise<EnvVarView[]> {
  const rows = await db.select().from(projectEnvVars).where(eq(projectEnvVars.projectId, projectId)).orderBy(projectEnvVars.key);
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    value: opts.reveal ? safeDecrypt(r.valueEnc) : MASKED_VALUE,
    isSecret: r.isSecret,
    updatedAt: r.updatedAt,
  }));
}

/** Decrypted key/value map, for server-side consumers only (runner sync, builds). Never send to the browser. */
export async function getEnvVarsDecrypted(projectId: string): Promise<Record<string, string>> {
  const rows = await db.select().from(projectEnvVars).where(eq(projectEnvVars.projectId, projectId));
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = safeDecrypt(r.valueEnc);
  return out;
}

function safeDecrypt(payload: string): string {
  try {
    return decryptSecret(payload);
  } catch {
    // Key rotation or corrupted row: surface an explicit marker rather than crashing the whole list.
    return "";
  }
}

export async function upsertEnvVar(projectId: string, input: { key: string; value: string; isSecret?: boolean }) {
  const key = validateEnvKey(input.key);
  if (input.value.length > MAX_ENV_VALUE_LENGTH) throw badRequest(`Values are limited to ${MAX_ENV_VALUE_LENGTH} characters`);
  const existing = await db
    .select({ id: projectEnvVars.id })
    .from(projectEnvVars)
    .where(and(eq(projectEnvVars.projectId, projectId), eq(projectEnvVars.key, key)))
    .limit(1);
  if (!existing.length) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(projectEnvVars)
      .where(eq(projectEnvVars.projectId, projectId));
    if (total >= MAX_ENV_VARS) throw badRequest(`Projects are limited to ${MAX_ENV_VARS} environment variables`);
  }
  const valueEnc = encryptSecret(input.value);
  const [row] = await db
    .insert(projectEnvVars)
    .values({ projectId, key, valueEnc, isSecret: input.isSecret ?? true })
    .onConflictDoUpdate({
      target: [projectEnvVars.projectId, projectEnvVars.key],
      set: { valueEnc, isSecret: input.isSecret ?? true, updatedAt: new Date() },
    })
    .returning({ id: projectEnvVars.id, key: projectEnvVars.key, isSecret: projectEnvVars.isSecret, updatedAt: projectEnvVars.updatedAt });
  return row;
}

export async function deleteEnvVar(projectId: string, key: string): Promise<boolean> {
  const k = validateEnvKey(key);
  const rows = await db
    .delete(projectEnvVars)
    .where(and(eq(projectEnvVars.projectId, projectId), eq(projectEnvVars.key, k)))
    .returning({ id: projectEnvVars.id });
  return rows.length > 0;
}
