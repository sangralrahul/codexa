/** Job queue: claim with FOR UPDATE SKIP LOCKED, complete, retry with backoff, admin retry. */
import { afterAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { backoffMs, claimNext, completeJob, enqueue, enqueueUnique, failJob, queueStats, retryJob } from "@/lib/jobs";

const kind = `test.kind.${Date.now().toString(36)}`;
const created: string[] = [];

afterAll(async () => {
  if (created.length) await db.delete(jobs).where(inArray(jobs.id, created));
});

describe("job queue", () => {
  it("two concurrent claimers never receive the same job", async () => {
    const a = await enqueue(kind, { n: 1 });
    const b = await enqueue(kind, { n: 2 });
    created.push(a.id, b.id);
    const [c1, c2, c3] = await Promise.all([claimNext("w1", { kinds: [kind] }), claimNext("w2", { kinds: [kind] }), claimNext("w3", { kinds: [kind] })]);
    const got = [c1, c2, c3].filter(Boolean).map((j) => j!.id);
    expect(got).toHaveLength(2);
    expect(new Set(got).size).toBe(2);
    expect(got.sort()).toEqual([a.id, b.id].sort());
    for (const j of [c1, c2, c3]) if (j) expect(j).toMatchObject({ status: "running", attempts: 1 });
    expect(await claimNext("w4", { kinds: [kind] })).toBeNull();
    for (const id of got) await completeJob(id, { ok: true });
    const rows = await db.select().from(jobs).where(inArray(jobs.id, got));
    for (const r of rows) expect(r).toMatchObject({ status: "succeeded", lockedBy: null, result: { ok: true } });
  });

  it("does not claim jobs scheduled in the future", async () => {
    const later = await enqueue(kind, {}, { runAt: new Date(Date.now() + 3600_000) });
    created.push(later.id);
    expect(await claimNext("w1", { kinds: [kind] })).toBeNull();
  });

  it("retries with exponential backoff until maxAttempts, then fails; admin retry re-queues", async () => {
    const j = await enqueue(kind, {}, { maxAttempts: 2 });
    created.push(j.id);
    const first = (await claimNext("w1", { kinds: [kind] }))!;
    expect(first.id).toBe(j.id);
    expect(await failJob(first, "boom")).toBe("retry");
    let [row] = await db.select().from(jobs).where(eq(jobs.id, j.id));
    expect(row.status).toBe("queued");
    expect(row.lastError).toBe("boom");
    expect(row.runAt.getTime()).toBeGreaterThan(Date.now() + backoffMs(1) - 5000);
    // Make it due again and exhaust attempts.
    await db.update(jobs).set({ runAt: new Date(Date.now() - 1000) }).where(eq(jobs.id, j.id));
    const second = (await claimNext("w1", { kinds: [kind] }))!;
    expect(second.attempts).toBe(2);
    expect(await failJob(second, "boom again")).toBe("failed");
    [row] = await db.select().from(jobs).where(eq(jobs.id, j.id));
    expect(row.status).toBe("failed");
    const retried = await retryJob(j.id);
    expect(retried).toMatchObject({ status: "queued", attempts: 0, lastError: null });
    expect(backoffMs(1)).toBe(30_000);
    expect(backoffMs(3)).toBe(120_000);
    expect(backoffMs(20)).toBe(3_600_000);
    await db.update(jobs).set({ status: "cancelled" }).where(eq(jobs.id, j.id));
  });

  it("reclaims a stale running job (crashed worker)", async () => {
    const j = await enqueue(kind);
    created.push(j.id);
    await db.update(jobs).set({ status: "running", lockedAt: new Date(Date.now() - 20 * 60_000), lockedBy: "dead" }).where(eq(jobs.id, j.id));
    const reclaimed = await claimNext("w9", { kinds: [kind], staleAfterMs: 10 * 60_000 });
    expect(reclaimed?.id).toBe(j.id);
    expect(reclaimed?.lockedBy).toBe("w9");
    await completeJob(j.id);
  });

  it("enqueueUnique skips when a queued job of the kind exists; queueStats counts statuses", async () => {
    const k = `${kind}.unique`;
    const a = await enqueueUnique(k);
    expect(a).not.toBeNull();
    created.push(a!.id);
    expect(await enqueueUnique(k)).toBeNull();
    const stats = await queueStats();
    expect(stats.queued).toBeGreaterThanOrEqual(1);
    expect(typeof stats.failed).toBe("number");
  });
});
