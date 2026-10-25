import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

/**
 * Fixed-window rate limiter backed by D1 (shared by every Worker instance).
 * One atomic upsert per call. Keys include the scope, e.g. `login:ip:1.2.3.4`
 * or `ai:ws:<id>`.
 */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const cutoff = now - windowMs;
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, windowStart: new Date(now) })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.windowStart} < ${cutoff} THEN 1 ELSE ${rateLimits.count} + 1 END`,
        windowStart: sql`CASE WHEN ${rateLimits.windowStart} < ${cutoff} THEN ${now} ELSE ${rateLimits.windowStart} END`,
      },
    })
    .returning({ count: rateLimits.count, windowStart: rateLimits.windowStart });
  const count = Number(row.count);
  const resetAt = new Date(row.windowStart.getTime() + windowMs);
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
