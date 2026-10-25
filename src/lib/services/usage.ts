import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, usageEvents, workspaces, type Plan, type Workspace } from "@/db/schema";
import { PLANS, isUnlimited, type PlanLimits } from "@/config/plans";
import { ApiError } from "@/lib/api";

export type UsageKind = "ai_request" | "ai_tokens" | "runtime_minutes" | "deployment" | "storage_bytes";

export class QuotaExceededError extends ApiError {
  kind: UsageKind;
  limit: number;
  used: number;
  constructor(kind: UsageKind, used: number, limit: number) {
    super(402, `Usage limit reached for ${kind.replace("_", " ")} (${used}/${limit}). Upgrade your plan to continue.`, "quota_exceeded", { kind, used, limit });
    this.kind = kind;
    this.limit = limit;
    this.used = used;
  }
}

export function periodStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Effective plan: active subscription wins over the workspace's stored plan. */
export async function getEffectivePlan(workspace: Pick<Workspace, "id" | "plan">): Promise<Plan> {
  const rows = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status, end: subscriptions.currentPeriodEnd })
    .from(subscriptions)
    .where(and(eq(subscriptions.workspaceId, workspace.id)))
    .orderBy(sql`${subscriptions.createdAt} desc`)
    .limit(1);
  const sub = rows[0];
  if (sub && (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due")) {
    if (!sub.end || sub.end > new Date()) return sub.plan;
  }
  return workspace.plan;
}

export async function getUsageSummary(workspaceId: string) {
  const since = periodStart();
  const rows = await db
    .select({ kind: usageEvents.kind, total: sql<number>`coalesce(sum(${usageEvents.quantity}), 0)::bigint` })
    .from(usageEvents)
    .where(and(eq(usageEvents.workspaceId, workspaceId), gte(usageEvents.createdAt, since)))
    .groupBy(usageEvents.kind);
  const used: Record<UsageKind, number> = { ai_request: 0, ai_tokens: 0, runtime_minutes: 0, deployment: 0, storage_bytes: 0 };
  for (const r of rows) used[r.kind as UsageKind] = Number(r.total);
  return { periodStart: since, used };
}

const limitFor: Record<UsageKind, (l: PlanLimits) => number> = {
  ai_request: (l) => l.aiRequestsPerMonth,
  ai_tokens: (l) => l.aiTokensPerMonth,
  runtime_minutes: (l) => l.runtimeMinutesPerMonth,
  deployment: (l) => l.deploymentsPerMonth,
  storage_bytes: (l) => l.storageMb * 1024 * 1024,
};

/** Throws QuotaExceededError if adding `quantity` would exceed the plan limit. */
export async function assertQuota(workspaceId: string, kind: UsageKind, quantity = 1) {
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!ws) throw new ApiError(404, "Workspace not found", "not_found");
  const plan = await getEffectivePlan(ws);
  const limit = limitFor[kind](PLANS[plan].limits);
  if (isUnlimited(limit)) return { plan, limit, used: 0 };
  const { used } = await getUsageSummary(workspaceId);
  if (used[kind] + quantity > limit) throw new QuotaExceededError(kind, used[kind], limit);
  return { plan, limit, used: used[kind] };
}

export async function recordUsage(input: {
  workspaceId: string;
  projectId?: string | null;
  userId?: string | null;
  kind: UsageKind;
  quantity: number;
  metadata?: Record<string, unknown>;
}) {
  if (input.quantity <= 0) return;
  await db.insert(usageEvents).values({
    workspaceId: input.workspaceId,
    projectId: input.projectId ?? null,
    userId: input.userId ?? null,
    kind: input.kind,
    quantity: Math.round(input.quantity),
    metadata: input.metadata ?? {},
  });
}

export async function getWorkspaceEntitlements(workspace: Workspace) {
  const plan = await getEffectivePlan(workspace);
  const { used, periodStart: ps } = await getUsageSummary(workspace.id);
  const limits = PLANS[plan].limits;
  return {
    plan,
    periodStart: ps,
    limits,
    used,
    remaining: {
      ai_request: isUnlimited(limits.aiRequestsPerMonth) ? -1 : Math.max(0, limits.aiRequestsPerMonth - used.ai_request),
      ai_tokens: isUnlimited(limits.aiTokensPerMonth) ? -1 : Math.max(0, limits.aiTokensPerMonth - used.ai_tokens),
      runtime_minutes: isUnlimited(limits.runtimeMinutesPerMonth) ? -1 : Math.max(0, limits.runtimeMinutesPerMonth - used.runtime_minutes),
      deployment: isUnlimited(limits.deploymentsPerMonth) ? -1 : Math.max(0, limits.deploymentsPerMonth - used.deployment),
    },
  };
}
