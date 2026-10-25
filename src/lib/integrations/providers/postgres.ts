import { Client, type ClientConfig } from "pg";
import type { ConnectionTestResult, ProviderAdapter } from "../types";

export const PG_CONNECT_TIMEOUT_MS = 5_000;
export const PG_STATEMENT_TIMEOUT_MS = 15_000;

export function parseSslFlag(value: string | undefined): boolean {
  if (!value) return false;
  return /^(1|true|yes|require|on)$/i.test(value.trim());
}

export function validateConnectionString(cs: string | undefined): string {
  const value = (cs ?? "").trim();
  if (!value) throw new Error("Connection string is required");
  if (!/^postgres(ql)?:\/\//i.test(value)) throw new Error("Connection string must start with postgres:// or postgresql://");
  try {
    new URL(value);
  } catch {
    throw new Error("Connection string is not a valid URL");
  }
  return value;
}

export function pgClientConfig(connectionString: string, ssl: boolean): ClientConfig {
  return {
    connectionString,
    connectionTimeoutMillis: PG_CONNECT_TIMEOUT_MS,
    statement_timeout: PG_STATEMENT_TIMEOUT_MS,
    query_timeout: PG_STATEMENT_TIMEOUT_MS + 2_000,
    ssl: ssl ? { rejectUnauthorized: false } : undefined,
    application_name: "codexa",
  };
}

/** Open a pg Client for a stored connection; caller must `end()` it. */
export async function openPgClient(connectionString: string, ssl: boolean): Promise<Client> {
  const client = new Client(pgClientConfig(connectionString, ssl));
  await client.connect();
  return client;
}

/** Sanitise pg error messages: they can echo the host but never the password. */
export function pgErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.replace(/password=[^\s&]+/gi, "password=***").slice(0, 300);
}

export async function testPostgres(connectionString: string, ssl: boolean): Promise<ConnectionTestResult> {
  let client: Client | null = null;
  try {
    client = await openPgClient(connectionString, ssl);
    const res = await client.query<{ version: string; db: string; user: string }>(
      "select version() as version, current_database() as db, current_user as user",
    );
    const row = res.rows[0];
    const version = row?.version?.split(" on ")[0] ?? "PostgreSQL";
    return { ok: true, message: `Connected to ${row?.db ?? "database"} as ${row?.user ?? "user"}`, details: { version, database: row?.db, user: row?.user, ssl } };
  } catch (err) {
    return { ok: false, message: pgErrorMessage(err) };
  } finally {
    await client?.end().catch(() => undefined);
  }
}

export const postgresAdapter: ProviderAdapter = {
  id: "postgres",
  validate(config, secret) {
    validateConnectionString(secret.connectionString);
    if (config.ssl && !/^(true|false|1|0|yes|no|require|on|off)$/i.test(config.ssl.trim())) throw new Error("ssl must be true or false");
  },
  test(config, secret) {
    return testPostgres(secret.connectionString, parseSslFlag(config.ssl));
  },
};
