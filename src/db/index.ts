import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/*
 * Database access.
 *
 * Node.js (next dev/start, Vercel, Docker, worker, tests): one shared pool.
 *
 * Cloudflare Workers: a socket opened while handling one request cannot be
 * used by another, so each request gets its own small pool, cached for the
 * lifetime of that request. Workers drop the request's sockets when it ends;
 * Hyperdrive keeps the database-side connections pooled. The connection string
 * comes from a Hyperdrive binding named HYPERDRIVE when present (recommended),
 * otherwise DATABASE_URL.
 *
 * `db` is a proxy that resolves the right instance on every access, so
 * callers keep writing `db.select()...` everywhere.
 */

export type Db = NodePgDatabase<typeof schema>;

type CloudflareRequestContext = {
  env?: { HYPERDRIVE?: { connectionString?: string } } & Record<string, unknown>;
  ctx?: { waitUntil(promise: Promise<unknown>): void };
};

declare global {
  var __codexaPool: Pool | undefined;
}

const CF_CONTEXT = Symbol.for("__cloudflare-context__");

/** The per-request Cloudflare context set by the OpenNext worker, or undefined on Node.js. */
function cloudflareContext(): CloudflareRequestContext | undefined {
  try {
    return (globalThis as Record<symbol, CloudflareRequestContext | undefined>)[CF_CONTEXT];
  } catch {
    return undefined;
  }
}

function connectionString(cf?: CloudflareRequestContext) {
  const url = cf?.env?.HYPERDRIVE?.connectionString || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (or bind Hyperdrive as HYPERDRIVE on Cloudflare)");
  return url;
}

function nodePool(): Pool {
  if (!globalThis.__codexaPool) {
    globalThis.__codexaPool = new Pool({
      connectionString: connectionString(),
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
    });
  }
  return globalThis.__codexaPool;
}

let nodeDb: Db | undefined;
const requestDbs = new WeakMap<object, Db>();

export function getDb(): Db {
  const cf = cloudflareContext();
  if (cf?.ctx) {
    const existing = requestDbs.get(cf.ctx);
    if (existing) return existing;
    const pool = new Pool({ connectionString: connectionString(cf), max: 3, idleTimeoutMillis: 5_000 });
    const instance = drizzle(pool, { schema });
    requestDbs.set(cf.ctx, instance);
    return instance;
  }
  if (!nodeDb) nodeDb = drizzle(nodePool(), { schema });
  return nodeDb;
}

function lazy<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const real = resolve();
      const value = Reflect.get(real, prop, real);
      return typeof value === "function" ? value.bind(real) : value;
    },
  });
}

export const db: Db = lazy(getDb);
/** The shared Node.js pool (scripts and the worker use it to shut down cleanly). */
export const pool: Pool = lazy(nodePool);
export { schema };
