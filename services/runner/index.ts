/**
 * Codexa runner service entry point.
 *   npm run runner:dev     (tsx watch)
 *   npm run runner:start
 * Reads the repository .env, starts the control API on RUNNER_PORT (127.0.0.1)
 * and the preview/sites proxy on RUNNER_PREVIEW_PORT, and stops every
 * sandbox on SIGTERM/SIGINT.
 */
import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(here, "../../.env"), quiet: true });

import { hostFor } from "../../src/lib/hosts";
import { createRunner } from "./app";

async function main() {
  const app = await createRunner();
  const { cfg } = app;
  console.log(`[runner] control API    http://127.0.0.1:${app.apiPort}  (driver: ${cfg.driver}, data: ${cfg.dataDir})`);
  console.log(`[runner] preview proxy  http://${hostFor("<token>", cfg.previewHost)}:${app.proxyPort}  sites: http://${hostFor("<slug>", cfg.deployHost)}:${app.proxyPort}`);
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[runner] ${signal} received, stopping ${app.sessions.stats().total} session(s)`);
    const timer = setTimeout(() => process.exit(1), 15_000);
    timer.unref();
    await app.close();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("[runner] failed to start:", err instanceof Error ? err.message : err);
  process.exit(1);
});
