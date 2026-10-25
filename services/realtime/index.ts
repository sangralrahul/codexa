/**
 * Codexa realtime presence service entry point.
 *   npm run realtime:dev     (tsx watch)
 *   npm run realtime:start
 * Reads the repository .env.local then .env (same precedence as Next.js, so SESSION_SECRET matches
 * the web app) and serves WebSocket rooms per project.
 */
import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// Higher-priority file first: dotenv never overrides variables that are already set.
loadDotenv({ path: path.resolve(here, "../../.env.local"), quiet: true });
loadDotenv({ path: path.resolve(here, "../../.env"), quiet: true });

import { createRealtimeServer } from "./server";

async function main() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    console.error("[realtime] SESSION_SECRET is missing or too short; it must match the Next.js app so presence tokens verify.");
    process.exit(1);
  }
  const port = Number(process.env.REALTIME_PORT ?? "4200") || 4200;
  const host = process.env.REALTIME_HOST ?? "0.0.0.0";
  const server = await createRealtimeServer({
    port,
    host,
    secret,
    log: (msg, meta) => console.log(`[realtime] ${msg}${meta ? " " + JSON.stringify(meta) : ""}`),
  });
  console.log(`[realtime] listening on ws://${host}:${server.port}  (health: http://${host}:${server.port}/health)`);
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[realtime] ${signal} received, closing ${server.stats().clients} connection(s)`);
    const timer = setTimeout(() => process.exit(1), 5_000);
    timer.unref();
    await server.close();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("[realtime] failed to start:", err instanceof Error ? err.message : err);
  process.exit(1);
});
