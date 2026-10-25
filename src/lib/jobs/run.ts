/**
 * Runs due background jobs. Called by the Worker's cron trigger
 * (scheduled handler in worker/entry.ts) every few minutes: claims jobs one at
 * a time until none are due or the time budget is spent, retries failures with
 * backoff, and re-schedules recurring jobs.
 */
import { claimNext, completeJob, failJob } from "@/lib/jobs";
import { handlers, scheduleNext, ensureRecurringSeeded } from "./handlers";
import { logger } from "@/lib/logger";

export async function runDueJobs(opts: { workerId?: string; budgetMs?: number; maxJobs?: number } = {}) {
  const workerId = opts.workerId ?? `cron:${crypto.randomUUID().slice(0, 8)}`;
  const deadline = Date.now() + (opts.budgetMs ?? 25_000);
  const maxJobs = opts.maxJobs ?? 25;
  const seeded = await ensureRecurringSeeded();
  const ran: { id: string; kind: string; outcome: "succeeded" | "retry" | "failed" }[] = [];
  while (ran.length < maxJobs && Date.now() < deadline) {
    const job = await claimNext(workerId);
    if (!job) break;
    const handler = handlers[job.kind];
    if (!handler) {
      await failJob({ id: job.id, attempts: job.maxAttempts, maxAttempts: job.maxAttempts }, `no handler for kind "${job.kind}"`);
      ran.push({ id: job.id, kind: job.kind, outcome: "failed" });
      continue;
    }
    try {
      const result = await handler(job);
      await completeJob(job.id, result);
      ran.push({ id: job.id, kind: job.kind, outcome: "succeeded" });
      await scheduleNext(job.kind);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const outcome = await failJob(job, message);
      ran.push({ id: job.id, kind: job.kind, outcome });
      logger.warn("job failed", { id: job.id, kind: job.kind, attempts: job.attempts, error: message });
      if (outcome === "failed") await scheduleNext(job.kind);
    }
  }
  return { workerId, seeded, ran };
}
