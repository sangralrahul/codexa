import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { featureFlags } from "@/db/schema";

const cache = new Map<string, { enabled: boolean; at: number }>();
const TTL_MS = 15_000;

/**
 * Feature flag lookup usable by any module. Flags are managed by staff at
 * /admin/feature-flags. Unknown flags are disabled. Results are cached for
 * 15s per process to keep hot paths cheap.
 */
export async function isFlagEnabled(key: string, opts?: { fresh?: boolean }): Promise<boolean> {
  const hit = cache.get(key);
  if (!opts?.fresh && hit && Date.now() - hit.at < TTL_MS) return hit.enabled;
  const rows = await db.select({ enabled: featureFlags.enabled }).from(featureFlags).where(eq(featureFlags.key, key)).limit(1);
  const enabled = rows[0]?.enabled ?? false;
  cache.set(key, { enabled, at: Date.now() });
  return enabled;
}

export function invalidateFlagCache(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}
