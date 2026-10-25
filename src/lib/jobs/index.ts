/**
 * Postgres-backed job queue over the `jobs` table.
 * - claim: SELECT ... FOR UPDATE SKIP LOCKED so several workers can poll safely
 * - retries with exponential backoff until maxAttempts, then status "failed"
 * - no "server-only" import: this module is shared by Next.js and services/worker (tsx)
 */
import { and, asc, count, desc, eq, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { jobs, type Job } from "@/db/schema";

export const JOB_KINDS = ["email.retry", "cleanup.sessions", "cleanup.expired_tokens", "usage.rollup", "runtime.sweep"] as const;
export type JobKind = (typeof JOB_KINDS)[number] | (string & {});

export type EnqueueOptions = { runAt?: Date; maxAttempts?: number };

export async function enqueue(kind: JobKind, payload: Record<string, unknown> = {}, opts: EnqueueOptions = {}): Promise<Job> {
  const [row] = await db
    .insert(jobs)
    .values({ kind, payload, runAt: opts.runAt ?? new Date(), maxAttempts: opts.maxAttempts ?? 3 })
    .returning();
  return row;
}

/** Enqueue only if no queued/running job of this kind exists (used for recurring schedules). */
export async function enqueueUnique(kind: JobKind, payload: Record<string, unknown> = {}, opts: EnqueueOptions = {}): Promise<Job | null> {
  const existing = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.kind, kind), inArray(jobs.status, ["queued", "running"])))
    .limit(1);
  if (existing.length) return null;
  return enqueue(kind, payload, opts);
}

/**
 * Claim the next runnable job for `workerId`. Runs in a transaction so the row lock
 * from FOR UPDATE SKIP LOCKED is held until the status flips to running.
 * Also reclaims jobs whose lock is older than `staleAfterMs` (crashed worker).
 */
export async function claimNext(workerId: string, opts: { kinds?: string[]; staleAfterMs?: number } = {}): Promise<Job | null> {
  const stale = new Date(Date.now() - (opts.staleAfterMs ?? 10 * 60_000));
  return db.transaction(async (tx) => {
    const kindFilter = opts.kinds?.length ? sql`AND kind IN (${sql.join(opts.kinds.map((k) => sql`${k}`), sql`, `)})` : sql``;
    const res = await tx.execute<{ id: string }>(sql`
      SELECT id FROM jobs
      WHERE (
        (status = 'queued' AND run_at <= now())
        OR (status = 'running' AND locked_at IS NOT NULL AND locked_at < ${stale})
      ) ${kindFilter}
      ORDER BY run_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `);
    const id = res.rows[0]?.id;
    if (!id) return null;
    const [row] = await tx
      .update(jobs)
      .set({ status: "running", lockedAt: new Date(), lockedBy: workerId, attempts: sql`${jobs.attempts} + 1`, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return row ?? null;
  });
}

export async function completeJob(id: string, result?: unknown) {
  await db
    .update(jobs)
    .set({ status: "succeeded", result: result ?? null, lockedAt: null, lockedBy: null, lastError: null, updatedAt: new Date() })
    .where(eq(jobs.id, id));
}

export function backoffMs(attempt: number, baseMs = 30_000, maxMs = 60 * 60_000): number {
  return Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
}

/** Record a failure: re-queue with backoff while attempts remain, else mark failed. */
export async function failJob(job: Pick<Job, "id" | "attempts" | "maxAttempts">, error: string): Promise<"retry" | "failed"> {
  const willRetry = job.attempts < job.maxAttempts;
  await db
    .update(jobs)
    .set({
      status: willRetry ? "queued" : "failed",
      runAt: willRetry ? new Date(Date.now() + backoffMs(job.attempts)) : undefined,
      lastError: error.slice(0, 4000),
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, job.id));
  return willRetry ? "retry" : "failed";
}

export async function cancelJob(id: string) {
  await db.update(jobs).set({ status: "cancelled", lockedAt: null, lockedBy: null, updatedAt: new Date() }).where(and(eq(jobs.id, id), eq(jobs.status, "queued")));
}

/** Put a failed job back in the queue (admin action). */
export async function retryJob(id: string): Promise<Job | null> {
  const [row] = await db
    .update(jobs)
    .set({ status: "queued", runAt: new Date(), attempts: 0, lastError: null, lockedAt: null, lockedBy: null, updatedAt: new Date() })
    .where(and(eq(jobs.id, id), inArray(jobs.status, ["failed", "cancelled"])))
    .returning();
  return row ?? null;
}

export async function retryAllFailed(): Promise<number> {
  const rows = await db
    .update(jobs)
    .set({ status: "queued", runAt: new Date(), attempts: 0, lastError: null, lockedAt: null, lockedBy: null, updatedAt: new Date() })
    .where(eq(jobs.status, "failed"))
    .returning({ id: jobs.id });
  return rows.length;
}

export async function queueStats() {
  const rows = await db.select({ status: jobs.status, n: count() }).from(jobs).groupBy(jobs.status);
  const stats: Record<Job["status"], number> = { queued: 0, running: 0, succeeded: 0, failed: 0, cancelled: 0 };
  for (const r of rows) stats[r.status] = Number(r.n);
  const [oldest] = await db
    .select({ runAt: jobs.runAt })
    .from(jobs)
    .where(and(eq(jobs.status, "queued"), lte(jobs.runAt, new Date())))
    .orderBy(asc(jobs.runAt))
    .limit(1);
  return { ...stats, oldestDueAt: oldest?.runAt ?? null };
}

export async function listJobs(opts: { status?: Job["status"] | "all"; kind?: string; limit?: number; offset?: number } = {}) {
  const conds = [];
  if (opts.status && opts.status !== "all") conds.push(eq(jobs.status, opts.status));
  if (opts.kind) conds.push(eq(jobs.kind, opts.kind));
  const where = conds.length ? and(...conds) : undefined;
  const limit = Math.min(200, opts.limit ?? 50);
  const [rows, total] = await Promise.all([
    db.select().from(jobs).where(where).orderBy(desc(jobs.updatedAt)).limit(limit).offset(opts.offset ?? 0),
    db.select({ n: count() }).from(jobs).where(where),
  ]);
  return { jobs: rows, total: Number(total[0]?.n ?? 0) };
}

/** Delete succeeded/cancelled jobs older than `days` (housekeeping). */
export async function pruneJobs(days = 14): Promise<number> {
  const cutoff = new Date(Date.now() - days * 86400_000);
  const rows = await db
    .delete(jobs)
    .where(and(or(eq(jobs.status, "succeeded"), eq(jobs.status, "cancelled")), lte(jobs.updatedAt, cutoff), isNotNull(jobs.updatedAt)))
    .returning({ id: jobs.id });
  return rows.length;
}
