/**
 * Codexa background worker.
 *   npm run worker:start
 * Polls the Postgres job queue (src/lib/jobs) every 5s, runs handlers from
 * ./handlers.ts, retries with backoff, re-schedules recurring jobs, and shuts
 * down gracefully on SIGTERM/SIGINT (finishes the in-flight job first).
 */
import "./env";
import os from "node:os";
import { claimNext, completeJob, failJob } from "@/lib/jobs";
import { pool } from "@/db";
import { handlers, scheduleNext, ensureRecurringSeeded } from "./handlers";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 5000);
const workerId = `${os.hostname()}:${process.pid}`;
const log = (msg: string, meta?: Record<string, unknown>) => console.log(JSON.stringify({ time: new Date().toISOString(), worker: workerId, msg, ...(meta ?? {}) }));

let stopping = false;
let inFlight: Promise<void> | null = null;

async function runOne(): Promise<boolean> {
  const job = await claimNext(workerId);
  if (!job) return false;
  const handler = handlers[job.kind];
  const started = Date.now();
  if (!handler) {
    await failJob({ id: job.id, attempts: job.maxAttempts, maxAttempts: job.maxAttempts }, `no handler for kind "${job.kind}"`);
    log("job failed: unknown kind", { id: job.id, kind: job.kind });
    return true;
  }
  try {
    const result = await handler(job);
    await completeJob(job.id, result);
    log("job succeeded", { id: job.id, kind: job.kind, ms: Date.now() - started, result });
    const next = await scheduleNext(job.kind);
    if (next) log("scheduled next run", { kind: job.kind, runAt: next.runAt.toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const outcome = await failJob(job, message);
    log(`job ${outcome === "retry" ? "will retry" : "failed"}`, { id: job.id, kind: job.kind, attempts: job.attempts, error: message });
    if (outcome === "failed") {
      const next = await scheduleNext(job.kind);
      if (next) log("scheduled next run after failure", { kind: job.kind, runAt: next.runAt.toISOString() });
    }
  }
  return true;
}

async function loop() {
  while (!stopping) {
    let didWork = false;
    try {
      inFlight = runOne().then((w) => {
        didWork = w;
      });
      await inFlight;
    } catch (err) {
      log("poll error", { error: err instanceof Error ? err.message : String(err) });
    } finally {
      inFlight = null;
    }
    if (stopping) break;
    if (!didWork) await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

async function main() {
  const seeded = await ensureRecurringSeeded();
  log("worker started", { pollMs: POLL_MS, seeded });
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    log(`${signal} received, finishing in-flight job`);
    const timer = setTimeout(() => process.exit(1), 30_000);
    timer.unref();
    if (inFlight) await inFlight.catch(() => undefined);
    await pool.end().catch(() => undefined);
    log("worker stopped");
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
  await loop();
}

main().catch((err) => {
  console.error("[worker] failed to start:", err instanceof Error ? err.message : err);
  process.exit(1);
});
