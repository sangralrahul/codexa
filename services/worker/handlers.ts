/**
 * Job handlers. Keep these free of Next.js-only modules ("server-only", next/headers):
 * the worker runs under tsx outside Next.js.
 */
import { and, eq, inArray, lt, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { authTokens, emailOutbox, rateLimits, sessions, usageEvents, workspaceInvites } from "@/db/schema";
import { env, runnerUrl } from "@/lib/env";
import { activeEmailProvider, deliverEmail } from "@/lib/email/providers";
import { enqueue, type JobKind } from "@/lib/jobs";
import type { Job } from "@/db/schema";

export type HandlerResult = Record<string, unknown>;
export type Handler = (job: Job) => Promise<HandlerResult>;

/** Recurring schedule (ms). On completion each handler enqueues its next run. */
export const RECURRING: Record<string, number> = {
  "email.retry": 15 * 60_000,
  "cleanup.sessions": 60 * 60_000,
  "cleanup.expired_tokens": 60 * 60_000,
  "usage.rollup": 24 * 60 * 60_000,
  "runtime.sweep": 5 * 60_000,
};

export const handlers: Record<string, Handler> = {
  /** Retry failed/queued outbox emails with the configured provider (Customer.io or Resend); otherwise report and leave them. */
  "email.retry": async (job) => {
    const limit = Number(job.payload.limit ?? 50);
    const provider = activeEmailProvider();
    if (!provider) {
      const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(emailOutbox).where(or(eq(emailOutbox.status, "failed"), eq(emailOutbox.status, "queued")));
      return { skipped: "No email provider configured (CUSTOMERIO_APP_API_KEY or RESEND_API_KEY)", pending: Number(n) };
    }
    // Messages queued while no provider was configured ("outbox") are not
    // retried automatically: they may hold stale one-time links.
    const rows = await db
      .select()
      .from(emailOutbox)
      .where(or(eq(emailOutbox.status, "failed"), and(eq(emailOutbox.status, "queued"), ne(emailOutbox.provider, "outbox"))))
      .limit(limit);
    let sent = 0;
    let failed = 0;
    for (const m of rows) {
      try {
        const r = await deliverEmail({ to: m.to, subject: m.subject, html: m.html, text: m.text || undefined }, provider);
        await db.update(emailOutbox).set({ status: "sent", provider: r.provider, providerId: r.providerId, sentAt: new Date(), error: null }).where(eq(emailOutbox.id, m.id));
        sent++;
      } catch (err) {
        failed++;
        await db.update(emailOutbox).set({ status: "failed", error: err instanceof Error ? err.message : String(err) }).where(eq(emailOutbox.id, m.id));
      }
    }
    return { provider, sent, failed, scanned: rows.length };
  },

  "cleanup.sessions": async () => {
    const rows = await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).returning({ id: sessions.id });
    return { deletedSessions: rows.length };
  },

  "cleanup.expired_tokens": async () => {
    const now = new Date();
    const dayAgo = new Date(Date.now() - 86400_000);
    const tokens = await db
      .delete(authTokens)
      .where(or(lt(authTokens.expiresAt, now), and(sql`${authTokens.usedAt} IS NOT NULL`, lt(authTokens.usedAt, dayAgo))))
      .returning({ id: authTokens.id });
    const invites = await db
      .delete(workspaceInvites)
      .where(and(lt(workspaceInvites.expiresAt, new Date(Date.now() - 30 * 86400_000)), sql`${workspaceInvites.acceptedAt} IS NULL`))
      .returning({ id: workspaceInvites.id });
    const limits = await db.delete(rateLimits).where(lte(rateLimits.windowStart, new Date(Date.now() - 24 * 3600_000))).returning({ key: rateLimits.key });
    return { deletedTokens: tokens.length, deletedStaleInvites: invites.length, deletedRateLimitWindows: limits.length };
  },

  /** Placeholder: usage is summed live from usage_events; this just reports volume so operators can see it running. */
  "usage.rollup": async () => {
    const since = new Date(Date.now() - 24 * 3600_000);
    const rows = await db
      .select({ kind: usageEvents.kind, total: sql<number>`coalesce(sum(${usageEvents.quantity}), 0)` })
      .from(usageEvents)
      .where(sql`${usageEvents.createdAt} >= ${since}`)
      .groupBy(usageEvents.kind);
    const totals: Record<string, number> = {};
    for (const r of rows) totals[r.kind] = Number(r.total);
    return { window: "24h", totals, note: "rollup table not implemented; summaries are computed live" };
  },

  /** Placeholder: pings the runner; does nothing when it is absent. The runner owns sandbox lifecycle. */
  "runtime.sweep": async () => {
    const base = runnerUrl();
    if (!base) return { runnerReachable: false, note: "no runner configured (RUNNER_URL is not set)" };
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(new URL("/health", base), { headers: { Authorization: `Bearer ${env.RUNNER_TOKEN}` }, signal: ctrl.signal });
      clearTimeout(t);
      return { runnerReachable: res.ok, status: res.status };
    } catch {
      return { runnerReachable: false, note: "runner absent; nothing swept" };
    }
  },
};

export async function scheduleNext(kind: JobKind) {
  const every = RECURRING[kind];
  if (!every) return null;
  const existing = await db.execute<{ id: string }>(sql`SELECT id FROM jobs WHERE kind = ${kind} AND status IN ('queued','running') LIMIT 1`);
  if (existing.rows.length) return null;
  return enqueue(kind, {}, { runAt: new Date(Date.now() + every), maxAttempts: 3 });
}

export async function ensureRecurringSeeded() {
  const kinds = Object.keys(RECURRING);
  const rows = await db.execute<{ kind: string }>(sql`SELECT DISTINCT kind FROM jobs WHERE status IN ('queued','running') AND kind IN (${sql.join(kinds.map((k) => sql`${k}`), sql`, `)})`);
  const present = new Set(rows.rows.map((r) => r.kind));
  const seeded: string[] = [];
  for (const k of kinds) {
    if (!present.has(k)) {
      await enqueue(k, {}, { runAt: new Date(), maxAttempts: 3 });
      seeded.push(k);
    }
  }
  return seeded;
}

export { inArray };
