import "server-only";
import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { chunked, db } from "@/db";
import { projects, usageEvents, type User } from "@/db/schema";
import { assertWorkspaceRole } from "./access";
import { periodStart as currentPeriodStart } from "./usage";
import { listMembers } from "./workspaces";

/**
 * Real usage history for the settings Usage page, read from `usage_events` only:
 * - `days`: one row per calendar day (UTC) of the current billing period, GROUP BY date(created_at)
 *   pivoted by kind in SQL, so the query returns at most 31 rows; days without events are filled with
 *   zeros here (they really had no events), never interpolated;
 * - `projects` / `members`: the top contributors this period.
 * Workspace-scoped through assertWorkspaceRole (viewer or above). Name lookups go through chunked()
 * so no statement binds more than D1's 100 parameters.
 */

export type UsageDay = { day: string; ai: number; tokens: number; minutes: number; deploys: number };
export type UsageContributor = {
  id: string | null;
  name: string;
  detail?: string;
  avatarUrl?: string | null;
  /** The project was deleted or the person has left the workspace. */
  gone?: boolean;
  ai: number;
  tokens: number;
  minutes: number;
  deploys: number;
};
export type UsageHistory = {
  periodStart: string;
  today: string;
  days: UsageDay[];
  totals: { ai: number; tokens: number; minutes: number; deploys: number };
  projects: UsageContributor[];
  members: UsageContributor[];
};

const TOP = 6;

const sumOf = (kind: string) => sql<number>`coalesce(sum(case when ${usageEvents.kind} = ${kind} then ${usageEvents.quantity} else 0 end), 0)`;
const dayOf = sql<string>`date(${usageEvents.createdAt} / 1000, 'unixepoch')`;
const KINDS = ["ai_request", "ai_tokens", "runtime_minutes", "deployment"];

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getUsageHistory(user: Pick<User, "id" | "role">, workspaceId: string, now = new Date()): Promise<UsageHistory> {
  const { workspace } = await assertWorkspaceRole(user, workspaceId, "viewer");
  const since = currentPeriodStart(now);
  const scope = and(eq(usageEvents.workspaceId, workspace.id), gte(usageEvents.createdAt, since), inArray(usageEvents.kind, KINDS));

  const [dayRows, projectRows, memberRows, members] = await Promise.all([
    db
      .select({ day: dayOf, ai: sumOf("ai_request"), tokens: sumOf("ai_tokens"), minutes: sumOf("runtime_minutes"), deploys: sumOf("deployment") })
      .from(usageEvents)
      .where(scope)
      .groupBy(dayOf)
      .orderBy(dayOf)
      .limit(31),
    db
      .select({ id: usageEvents.projectId, ai: sumOf("ai_request"), tokens: sumOf("ai_tokens"), minutes: sumOf("runtime_minutes"), deploys: sumOf("deployment") })
      .from(usageEvents)
      .where(and(scope, isNotNull(usageEvents.projectId)))
      .groupBy(usageEvents.projectId)
      .orderBy(desc(sumOf("ai_request")), desc(sumOf("runtime_minutes")), desc(sumOf("deployment")))
      .limit(TOP),
    db
      .select({ id: usageEvents.userId, ai: sumOf("ai_request"), tokens: sumOf("ai_tokens"), minutes: sumOf("runtime_minutes"), deploys: sumOf("deployment") })
      .from(usageEvents)
      .where(and(scope, isNotNull(usageEvents.userId)))
      .groupBy(usageEvents.userId)
      .orderBy(desc(sumOf("ai_request")), desc(sumOf("runtime_minutes")), desc(sumOf("deployment")))
      .limit(TOP),
    listMembers(workspace.id),
  ]);

  // Zero-fill the period up to today (UTC). A missing day had no events.
  const byDay = new Map(dayRows.map((r) => [r.day, r]));
  const days: UsageDay[] = [];
  const end = isoDay(now);
  for (let d = new Date(since); isoDay(d) <= end && days.length < 31; d = new Date(d.getTime() + 86_400_000)) {
    const key = isoDay(d);
    const r = byDay.get(key);
    days.push({ day: key, ai: Number(r?.ai ?? 0), tokens: Number(r?.tokens ?? 0), minutes: Number(r?.minutes ?? 0), deploys: Number(r?.deploys ?? 0) });
  }
  const totals = days.reduce((t, d) => ({ ai: t.ai + d.ai, tokens: t.tokens + d.tokens, minutes: t.minutes + d.minutes, deploys: t.deploys + d.deploys }), { ai: 0, tokens: 0, minutes: 0, deploys: 0 });

  // Project names, only for projects of this workspace (deleted ones are labelled as such).
  const projectIds = projectRows.map((r) => r.id).filter((id): id is string => Boolean(id));
  const names = new Map<string, { name: string; deleted: boolean }>();
  for (const group of chunked(projectIds.map((id) => ({ id })))) {
    const rows = await db
      .select({ id: projects.id, name: projects.name, deletedAt: projects.deletedAt })
      .from(projects)
      .where(and(eq(projects.workspaceId, workspace.id), inArray(projects.id, group.map((g) => g.id))));
    for (const p of rows) names.set(p.id, { name: p.name, deleted: Boolean(p.deletedAt) });
  }

  // People: current members get their name and photo; anyone who has left is not named.
  const people = new Map(members.map((m) => [m.userId, m]));

  const num = (r: { ai: number; tokens: number; minutes: number; deploys: number }) => ({ ai: Number(r.ai), tokens: Number(r.tokens), minutes: Number(r.minutes), deploys: Number(r.deploys) });
  const active = (r: { ai: number; minutes: number; deploys: number }) => Number(r.ai) + Number(r.minutes) + Number(r.deploys) > 0;

  return {
    periodStart: since.toISOString(),
    today: end,
    days,
    totals,
    projects: projectRows.filter(active).map((r) => {
      const p = r.id ? names.get(r.id) : undefined;
      return { id: r.id, name: p?.name ?? "Deleted project", gone: !p || p.deleted, detail: p?.deleted ? "Deleted" : undefined, ...num(r) };
    }),
    members: memberRows.filter(active).map((r) => {
      const m = r.id ? people.get(r.id) : undefined;
      return m
        ? { id: r.id, name: m.name || m.email, detail: m.email, avatarUrl: m.avatarUrl, ...num(r) }
        : { id: null, name: "Former member", gone: true, ...num(r) };
    }),
  };
}
