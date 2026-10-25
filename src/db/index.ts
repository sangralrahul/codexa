import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  var __codexaPool: Pool | undefined;
}

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
  });
}

export const pool: Pool = globalThis.__codexaPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__codexaPool = pool;

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
export type Db = typeof db;
export { schema };
