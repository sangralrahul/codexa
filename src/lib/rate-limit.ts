import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Fixed-window rate limiter backed by Postgres (works across instances).
 * Returns { ok, remaining, resetAt }. Keys should include the scope, e.g.
 * `login:ip:1.2.3.4` or `ai:ws:<id>`.
 */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const rows = await db.execute<{ count: number; window_start: Date }>(sql`
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (${key}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start < ${new Date(now.getTime() - windowMs)} THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start < ${new Date(now.getTime() - windowMs)} THEN ${now} ELSE rate_limits.window_start END
    RETURNING count, window_start
  `);
  const row = rows.rows[0];
  const count = Number(row.count);
  const resetAt = new Date(new Date(row.window_start).getTime() + windowMs);
  return { ok: count <= limit, remaining: Math.max(0, limit - count), resetAt, count };
}

export class RateLimitError extends Error {
  resetAt: Date;
  constructor(resetAt: Date) {
    super("Too many requests. Please try again later.");
    this.resetAt = resetAt;
  }
}

export async function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const r = await rateLimit(key, limit, windowMs);
  if (!r.ok) throw new RateLimitError(r.resetAt);
  return r;
}
