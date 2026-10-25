/**
 * Local Cloudflare bindings for Node.js processes that are not served by
 * OpenNext: tests, seed/admin scripts. Uses Wrangler's platform proxy, which
 * runs the real D1 and R2 implementations (workerd + SQLite) on disk.
 */
import { setCloudflareContext, type CodexaBindings } from "./bindings";

let proxy: { env: CodexaBindings; dispose: () => Promise<void> } | null = null;

export async function initLocalBindings(opts: { persistPath?: string; environment?: string } = {}) {
  if (proxy) return proxy.env;
  const { getPlatformProxy } = await import("wrangler");
  const p = await getPlatformProxy<CodexaBindings>({
    configPath: "wrangler.jsonc",
    environment: opts.environment,
    persist: { path: opts.persistPath ?? ".wrangler/state/v3" },
    remoteBindings: false,
  });
  proxy = { env: p.env, dispose: p.dispose };
  setCloudflareContext({ env: p.env as unknown as Record<string, unknown>, ctx: { waitUntil: (pr: Promise<unknown>) => void pr.catch(() => {}) } });
  return p.env;
}

export async function disposeLocalBindings() {
  if (!proxy) return;
  setCloudflareContext(undefined);
  await proxy.dispose();
  proxy = null;
}
