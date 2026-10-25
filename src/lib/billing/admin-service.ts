/**
 * Staff administration queries. Every caller must have passed requireAdmin()/requireApiAdmin().
 * Lists are offset-paginated and ordered on indexed columns.
 */
import "server-only";
import { and, count, desc, eq, gte, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  abuseReports,
  auditLogs,
  deployments,
  featureFlags,
  generationRuns,
  projects,
  runtimeSessions,
  showcaseEntries,
  subscriptions,
  supportTickets,
  users,
  workspaceMembers,
  workspaces,
  type Plan,
  type User,
} from "@/db/schema";
import { ApiError, badRequest, notFound } from "@/lib/api";
import { audit } from "@/lib/audit";
import { capabilities, env } from "@/lib/env";
import { invalidateFlagCache } from "./flags";
import { setManualPlan } from "./service";

export const PAGE_SIZE = 25;
export type Page = { page: number; pageSize: number; total: number };
export function pageOf(page: number | undefined, total: number): Page {
  return { page: Math.max(1, page ?? 1), pageSize: PAGE_SIZE, total };
}
const offset = (page?: number) => (Math.max(1, page ?? 1) - 1) * PAGE_SIZE;

// --- Overview ---------------------------------------------------------------
export async function overview() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const [[u], [w], [p], [r], [fd], [t], [ab], [ps]] = await Promise.all([
    db.select({ n: count() }).from(users).where(isNull(users.deletedAt)),
    db.select({ n: count() }).from(workspaces).where(isNull(workspaces.deletedAt)),
    db.select({ n: count() }).from(projects).where(isNull(projects.deletedAt)),
    db.select({ n: count() }).from(generationRuns).where(gte(generationRuns.createdAt, today)),
    db.select({ n: count() }).from(deployments).where(and(eq(deployments.status, "failed"), gte(deployments.createdAt, new Date(Date.now() - 7 * 86400_000)))),
    db.select({ n: count() }).from(supportTickets).where(eq(supportTickets.status, "open")),
    db.select({ n: count() }).from(abuseReports).where(eq(abuseReports.status, "open")),
    db.select({ n: count() }).from(subscriptions).where(or(eq(subscriptions.status, "active"), eq(subscriptions.status, "trialing"), eq(subscriptions.status, "past_due"))),
  ]);
  return {
    users: Number(u.n),
    workspaces: Number(w.n),
    projects: Number(p.n),
    runsToday: Number(r.n),
    failedDeployments7d: Number(fd.n),
    openTickets: Number(t.n),
    openAbuseReports: Number(ab.n),
    paidSubscriptions: Number(ps.n),
  };
}

// --- Users ------------------------------------------------------------------
export async function listUsers(opts: { q?: string; page?: number; role?: User["role"] }) {
  const conds: SQL[] = [];
  if (opts.q) conds.push(or(ilike(users.email, `%${opts.q}%`), ilike(users.name, `%${opts.q}%`)) as SQL);
  if (opts.role) conds.push(eq(users.role, opts.role));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role, emailVerifiedAt: users.emailVerifiedAt, createdAt: users.createdAt, deletedAt: users.deletedAt })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset(opts.page)),
    db.select({ n: count() }).from(users).where(where),
  ]);
  return { users: rows, ...pageOf(opts.page, Number(n)) };
}

export async function updateUser(actor: User, userId: string, patch: { role?: User["role"]; suspended?: boolean }) {
  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) throw notFound("User");
  if (patch.role !== undefined && actor.role !== "admin") throw new ApiError(403, "Only admins can change user roles", "forbidden");
  if (userId === actor.id && (patch.suspended || (patch.role && patch.role !== "admin"))) throw badRequest("You cannot suspend or demote yourself");
  const set: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (patch.role !== undefined) set.role = patch.role;
  if (patch.suspended !== undefined) set.deletedAt = patch.suspended ? new Date() : null;
  const [row] = await db.update(users).set(set).where(eq(users.id, userId)).returning();
  if (patch.suspended) await db.execute(sql`DELETE FROM sessions WHERE user_id = ${userId}`);
  await audit({ actorId: actor.id, action: "admin.user_updated", targetType: "user", targetId: userId, metadata: patch });
  return { id: row.id, email: row.email, name: row.name, role: row.role, deletedAt: row.deletedAt };
}

// --- Workspaces -------------------------------------------------------------
export async function listWorkspacesAdmin(opts: { q?: string; page?: number; plan?: Plan }) {
  const conds: SQL[] = [isNull(workspaces.deletedAt)];
  if (opts.q) conds.push(or(ilike(workspaces.name, `%${opts.q}%`), ilike(workspaces.slug, `%${opts.q}%`)) as SQL);
  if (opts.plan) conds.push(eq(workspaces.plan, opts.plan));
  const where = and(...conds);
  const members = db.select({ wsId: workspaceMembers.workspaceId, n: count().as("n") }).from(workspaceMembers).groupBy(workspaceMembers.workspaceId).as("m");
  const projs = db.select({ wsId: projects.workspaceId, n: count().as("n") }).from(projects).where(isNull(projects.deletedAt)).groupBy(projects.workspaceId).as("p");
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        plan: workspaces.plan,
        billingCurrency: workspaces.billingCurrency,
        ownerId: workspaces.ownerId,
        ownerEmail: users.email,
        createdAt: workspaces.createdAt,
        members: sql<number>`coalesce(${members.n}, 0)`,
        projects: sql<number>`coalesce(${projs.n}, 0)`,
      })
      .from(workspaces)
      .leftJoin(users, eq(users.id, workspaces.ownerId))
      .leftJoin(members, eq(members.wsId, workspaces.id))
      .leftJoin(projs, eq(projs.wsId, workspaces.id))
      .where(where)
      .orderBy(desc(workspaces.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset(opts.page)),
    db.select({ n: count() }).from(workspaces).where(where),
  ]);
  return { workspaces: rows.map((r) => ({ ...r, members: Number(r.members), projects: Number(r.projects) })), ...pageOf(opts.page, Number(n)) };
}

export async function overridePlan(actor: User, workspaceId: string, input: { plan: Plan; periodEnd: Date | null; note?: string }) {
  const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(and(eq(workspaces.id, workspaceId), isNull(workspaces.deletedAt))).limit(1);
  if (!ws) throw notFound("Workspace");
  const plan = await setManualPlan({ workspaceId, actorId: actor.id, plan: input.plan, periodEnd: input.periodEnd, note: input.note });
  return { workspaceId, plan };
}

// --- Subscriptions ----------------------------------------------------------
export async function listSubscriptionsAdmin(opts: { page?: number; status?: string }) {
  const where = opts.status && opts.status !== "all" ? eq(subscriptions.status, opts.status as typeof subscriptions.$inferSelect.status) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({ sub: subscriptions, workspaceName: workspaces.name, workspaceSlug: workspaces.slug })
      .from(subscriptions)
      .leftJoin(workspaces, eq(workspaces.id, subscriptions.workspaceId))
      .where(where)
      .orderBy(desc(subscriptions.updatedAt))
      .limit(PAGE_SIZE)
      .offset(offset(opts.page)),
    db.select({ n: count() }).from(subscriptions).where(where),
  ]);
  return { subscriptions: rows.map((r) => ({ ...r.sub, workspaceName: r.workspaceName, workspaceSlug: r.workspaceSlug })), ...pageOf(opts.page, Number(n)) };
}

// --- AI health --------------------------------------------------------------
export async function aiHealth() {
  const runs = await db
    .select({
      id: generationRuns.id,
      projectId: generationRuns.projectId,
      status: generationRuns.status,
      stage: generationRuns.stage,
      provider: generationRuns.provider,
      model: generationRuns.model,
      error: generationRuns.error,
      tokensIn: generationRuns.tokensIn,
      tokensOut: generationRuns.tokensOut,
      repairAttempts: generationRuns.repairAttempts,
      startedAt: generationRuns.startedAt,
      finishedAt: generationRuns.finishedAt,
      createdAt: generationRuns.createdAt,
    })
    .from(generationRuns)
    .orderBy(desc(generationRuns.createdAt))
    .limit(20);
  const since = new Date(Date.now() - 24 * 3600_000);
  const agg = await db.select({ status: generationRuns.status, n: count() }).from(generationRuns).where(gte(generationRuns.createdAt, since)).groupBy(generationRuns.status);
  const last24h: Record<string, number> = {};
  for (const a of agg) last24h[a.status] = Number(a.n);
  return {
    capabilities: { anthropic: capabilities.anthropic, openai: capabilities.openai, ai: capabilities.ai, email: capabilities.email, stripe: capabilities.stripe, razorpay: capabilities.razorpay, github: capabilities.github, vercel: capabilities.vercel, e2b: capabilities.e2b },
    defaults: { provider: env.AI_DEFAULT_PROVIDER, model: env.AI_DEFAULT_MODEL },
    last24h,
    runs: runs.map((r) => ({ ...r, durationMs: r.startedAt && r.finishedAt ? r.finishedAt.getTime() - r.startedAt.getTime() : null })),
  };
}

// --- Runtimes & deployments -------------------------------------------------
export async function activeRuntimes() {
  return db
    .select({ session: runtimeSessions, projectName: projects.name, workspaceId: projects.workspaceId })
    .from(runtimeSessions)
    .leftJoin(projects, eq(projects.id, runtimeSessions.projectId))
    .where(or(eq(runtimeSessions.status, "starting"), eq(runtimeSessions.status, "running")))
    .orderBy(desc(runtimeSessions.startedAt))
    .limit(100);
}

export async function recentDeployments(opts: { status?: string; page?: number }) {
  const where = opts.status && opts.status !== "all" ? eq(deployments.status, opts.status as typeof deployments.$inferSelect.status) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({ d: deployments, projectName: projects.name, workspaceId: projects.workspaceId })
      .from(deployments)
      .leftJoin(projects, eq(projects.id, deployments.projectId))
      .where(where)
      .orderBy(desc(deployments.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset(opts.page)),
    db.select({ n: count() }).from(deployments).where(where),
  ]);
  return { deployments: rows.map((r) => ({ ...r.d, buildLog: r.d.buildLog.slice(-4000), projectName: r.projectName, workspaceId: r.workspaceId })), ...pageOf(opts.page, Number(n)) };
}

// --- Support & abuse --------------------------------------------------------
export type TicketStatus = "open" | "in_progress" | "closed";
export async function listTickets(opts: { status?: TicketStatus | "all"; kind?: string; page?: number }) {
  const conds: SQL[] = [];
  if (opts.status && opts.status !== "all") conds.push(eq(supportTickets.status, opts.status));
  if (opts.kind) conds.push(eq(supportTickets.kind, opts.kind));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db.select().from(supportTickets).where(where).orderBy(desc(supportTickets.createdAt)).limit(PAGE_SIZE).offset(offset(opts.page)),
    db.select({ n: count() }).from(supportTickets).where(where),
  ]);
  return { tickets: rows, ...pageOf(opts.page, Number(n)) };
}

export async function setTicketStatus(actor: User, id: string, status: TicketStatus) {
  const [row] = await db.update(supportTickets).set({ status, updatedAt: new Date() }).where(eq(supportTickets.id, id)).returning();
  if (!row) throw notFound("Ticket");
  await audit({ actorId: actor.id, action: "admin.ticket_status", targetType: "ticket", targetId: id, metadata: { status } });
  return row;
}

export async function listAbuse(opts: { status?: TicketStatus | "all"; page?: number }) {
  const where = opts.status && opts.status !== "all" ? eq(abuseReports.status, opts.status) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db.select().from(abuseReports).where(where).orderBy(desc(abuseReports.createdAt)).limit(PAGE_SIZE).offset(offset(opts.page)),
    db.select({ n: count() }).from(abuseReports).where(where),
  ]);
  return { reports: rows, ...pageOf(opts.page, Number(n)) };
}

export async function setAbuseStatus(actor: User, id: string, status: TicketStatus) {
  const [row] = await db.update(abuseReports).set({ status }).where(eq(abuseReports.id, id)).returning();
  if (!row) throw notFound("Report");
  await audit({ actorId: actor.id, action: "admin.abuse_status", targetType: "abuse_report", targetId: id, metadata: { status } });
  return row;
}

// --- Audit logs -------------------------------------------------------------
export async function listAuditLogs(opts: { action?: string; workspaceId?: string; actorId?: string; page?: number }) {
  const conds: SQL[] = [];
  if (opts.action) conds.push(ilike(auditLogs.action, `${opts.action}%`));
  if (opts.workspaceId) conds.push(eq(auditLogs.workspaceId, opts.workspaceId));
  if (opts.actorId) conds.push(eq(auditLogs.actorId, opts.actorId));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({ log: auditLogs, actorEmail: users.email })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset(opts.page)),
    db.select({ n: count() }).from(auditLogs).where(where),
  ]);
  return { logs: rows.map((r) => ({ ...r.log, actorEmail: r.actorEmail })), ...pageOf(opts.page, Number(n)) };
}

// --- Feature flags ----------------------------------------------------------
export const FLAG_KEY = /^[a-z0-9][a-z0-9_.-]{1,63}$/;
export async function listFlags() {
  return db.select().from(featureFlags).orderBy(featureFlags.key);
}
export async function upsertFlag(actor: User, input: { key: string; enabled?: boolean; description?: string; rules?: Record<string, unknown> }) {
  if (!FLAG_KEY.test(input.key)) throw badRequest("Flag keys are lowercase letters, numbers, dots, dashes and underscores");
  const [row] = await db
    .insert(featureFlags)
    .values({ key: input.key, enabled: input.enabled ?? false, description: input.description ?? "", rules: input.rules ?? {} })
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: {
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.rules !== undefined ? { rules: input.rules } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();
  invalidateFlagCache(input.key);
  await audit({ actorId: actor.id, action: "admin.flag_upserted", targetType: "feature_flag", targetId: input.key, metadata: { enabled: row.enabled } });
  return row;
}
export async function deleteFlag(actor: User, key: string) {
  const rows = await db.delete(featureFlags).where(eq(featureFlags.key, key)).returning({ key: featureFlags.key });
  if (!rows.length) throw notFound("Flag");
  invalidateFlagCache(key);
  await audit({ actorId: actor.id, action: "admin.flag_deleted", targetType: "feature_flag", targetId: key });
}

// --- Showcase ---------------------------------------------------------------
export async function listShowcase(opts: { filter?: "pending" | "approved" | "all"; page?: number }) {
  const where = opts.filter === "pending" ? isNull(showcaseEntries.approvedAt) : opts.filter === "approved" ? sql`${showcaseEntries.approvedAt} IS NOT NULL` : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({ entry: showcaseEntries, projectName: projects.name, submitterEmail: users.email })
      .from(showcaseEntries)
      .leftJoin(projects, eq(projects.id, showcaseEntries.projectId))
      .leftJoin(users, eq(users.id, showcaseEntries.submittedBy))
      .where(where)
      .orderBy(desc(showcaseEntries.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset(opts.page)),
    db.select({ n: count() }).from(showcaseEntries).where(where),
  ]);
  return { entries: rows.map((r) => ({ ...r.entry, projectName: r.projectName, submitterEmail: r.submitterEmail })), ...pageOf(opts.page, Number(n)) };
}

/** approve → set approvedAt; reject → delete the entry (no showcase service exists yet, so this is a direct table update). */
export async function reviewShowcase(actor: User, id: string, action: "approve" | "reject") {
  if (action === "approve") {
    const [row] = await db.update(showcaseEntries).set({ approvedAt: new Date() }).where(eq(showcaseEntries.id, id)).returning();
    if (!row) throw notFound("Showcase entry");
    await audit({ actorId: actor.id, action: "admin.showcase_approved", targetType: "showcase", targetId: id });
    return row;
  }
  const rows = await db.delete(showcaseEntries).where(eq(showcaseEntries.id, id)).returning();
  if (!rows.length) throw notFound("Showcase entry");
  await audit({ actorId: actor.id, action: "admin.showcase_rejected", targetType: "showcase", targetId: id, metadata: { slug: rows[0].slug } });
  return rows[0];
}
