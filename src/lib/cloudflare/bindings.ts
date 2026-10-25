/**
 * Cloudflare bindings (D1, R2, Durable Objects) for the current request.
 *
 * In the deployed Worker and under `next dev`, OpenNext stores the bindings
 * on a per-request global. Tests and scripts install a local, file-backed
 * copy of the same bindings with `initLocalBindings()` (src/lib/cloudflare/local.ts).
 * No `server-only` import here: scripts and tests load this module too.
 */
import type { D1Database, R2Bucket, DurableObjectNamespace, Fetcher } from "@cloudflare/workers-types";

export type CodexaBindings = {
  DB: D1Database;
  STORAGE: R2Bucket;
  SANDBOX?: DurableObjectNamespace;
  PRESENCE?: DurableObjectNamespace;
  ASSETS?: Fetcher;
};

type CloudflareContext = { env: Partial<CodexaBindings> & Record<string, unknown>; ctx?: { waitUntil(p: Promise<unknown>): void } };

const CF_CONTEXT = Symbol.for("__cloudflare-context__");

export function cloudflareContext(): CloudflareContext | undefined {
  try {
    return (globalThis as Record<symbol, CloudflareContext | undefined>)[CF_CONTEXT];
  } catch {
    return undefined;
  }
}

export function bindings(): Partial<CodexaBindings> {
  return cloudflareContext()?.env ?? {};
}

export function requireBinding<K extends keyof CodexaBindings>(name: K): NonNullable<CodexaBindings[K]> {
  const value = bindings()[name];
  if (!value) {
    throw new Error(
      `Cloudflare binding ${String(name)} is not available. Run Codexa through Wrangler or OpenNext (npm run dev / cf:preview), or call initLocalBindings() in scripts and tests.`,
    );
  }
  return value as NonNullable<CodexaBindings[K]>;
}

/** Run background work after the response when the platform supports it. */
export function waitUntil(promise: Promise<unknown>) {
  const ctx = cloudflareContext()?.ctx;
  if (ctx) ctx.waitUntil(promise);
  else void promise.catch(() => {});
}

/** Install a bindings object as the current context (used by local bindings for tests and scripts). */
export function setCloudflareContext(context: CloudflareContext | undefined) {
  const g = globalThis as Record<symbol, unknown>;
  const desc = Object.getOwnPropertyDescriptor(g, CF_CONTEXT);
  if (desc && !desc.writable && !desc.set) return; // the Worker runtime owns it
  g[CF_CONTEXT] = context;
}
