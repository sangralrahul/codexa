import "server-only";
import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { deployments, projectFiles, projectSnapshots, projects, usageEvents } from "@/db/schema";

/**
 * Small aggregation read models for the dashboard's "richer" cards. Every number is counted from
 * rows (usage_events, projects, deployments, project_files, project_snapshots); days without rows
 * are zero-filled because they really had nothing, never interpolated. Portable SQLite only, and
 * every IN (...) list is batched under D1's 100-parameter limit.
 */

const ID_BATCH = 90;
function batches(ids: string[]): string[][] {
  const unique = [...new Set(ids)];
  const out: string[][] = [];
  for (let i = 0; i < unique.length; i += ID_BATCH) out.push(unique.slice(i, i + ID_BATCH));
  return out;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** One row per UTC day, oldest first. */
export type DailyPoint = { day: string; ai: number; minutes: number; deploys: number; projects: number };
export type DailySeries = { days: DailyPoint[]; from: string; to: string };

/**
 * The last `days` UTC days of workspace activity: AI requests, preview minutes and deployments
 * from usage_events, plus projects created per day from the projects table.
 */
export async function getDailySeries(workspaceId: string, days = 14, now = new Date()): Promise<DailySeries> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)));
  const dayOf = sql<string>`date(${usageEvents.createdAt} / 1000, 'unixepoch')`;
  const sumOf = (kind: string) => sql<number>`coalesce(sum(case when ${usageEvents.kind} = ${kind} then ${usageEvents.quantity} else 0 end), 0)`;
  const createdDay = sql<string>`date(${projects.createdAt} / 1000, 'unixepoch')`;
  const [usage, created] = await Promise.all([
    db
      .select({ day: dayOf, ai: sumOf("ai_request"), minutes: sumOf("runtime_minutes"), deploys: sumOf("deployment") })
      .from(usageEvents)
      .where(and(eq(usageEvents.workspaceId, workspaceId), gte(usageEvents.createdAt, start), inArray(usageEvents.kind, ["ai_request", "runtime_minutes", "deployment"])))
      .groupBy(dayOf)
      .limit(days + 1),
    db
      .select({ day: createdDay, n: sql<number>`count(*)` })
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), gte(projects.createdAt, start), isNull(projects.deletedAt)))
      .groupBy(createdDay)
      .limit(days + 1),
  ]);
  const byDay = new Map(usage.map((r) => [r.day, r]));
  const madeByDay = new Map(created.map((r) => [r.day, Number(r.n)]));
  const out: DailyPoint[] = [];
  for (let i = 0; i < days; i++) {
    const key = isoDay(new Date(start.getTime() + i * 86_400_000));
    const r = byDay.get(key);
    out.push({ day: key, ai: Number(r?.ai ?? 0), minutes: Number(r?.minutes ?? 0), deploys: Number(r?.deploys ?? 0), projects: madeByDay.get(key) ?? 0 });
  }
  return { days: out, from: out[0]?.day ?? isoDay(start), to: out[out.length - 1]?.day ?? isoDay(now) };
}

export type RecentDeployment = {
  id: string;
  projectId: string;
  projectName: string;
  provider: string;
  status: (typeof deployments.$inferSelect)["status"];
  url: string | null;
  error: string | null;
  createdAt: Date;
  finishedAt: Date | null;
};

/** The newest `limit` deployments across the given projects (any status), newest first. */
export async function getRecentDeployments(projectIds: string[], limit = 5): Promise<RecentDeployment[]> {
  if (!projectIds.length) return [];
  const rows = (
    await Promise.all(
      batches(projectIds).map((batch) =>
        db
          .select({
            id: deployments.id,
            projectId: deployments.projectId,
            projectName: projects.name,
            provider: deployments.provider,
            status: deployments.status,
            url: deployments.url,
            error: deployments.error,
            createdAt: deployments.createdAt,
            finishedAt: deployments.finishedAt,
          })
          .from(deployments)
          .innerJoin(projects, eq(projects.id, deployments.projectId))
          .where(inArray(deployments.projectId, batch))
          .orderBy(desc(deployments.createdAt))
          .limit(limit),
      ),
    )
  ).flat();
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
}

export type ProjectExtras = { fileCount: number; lastCheckpointAt: Date | null; lastCheckpointId: string | null; checkpointCount: number };

/** File counts and the newest checkpoint of each project (from project_files and project_snapshots). */
export async function getProjectExtras(projectIds: string[]): Promise<Map<string, ProjectExtras>> {
  const out = new Map<string, ProjectExtras>();
  if (!projectIds.length) return out;
  const [files, snaps] = await Promise.all([
    Promise.all(
      batches(projectIds).map((batch) =>
        db
          .select({ projectId: projectFiles.projectId, n: sql<number>`count(*)` })
          .from(projectFiles)
          .where(inArray(projectFiles.projectId, batch))
          .groupBy(projectFiles.projectId),
      ),
    ),
    Promise.all(
      batches(projectIds).map((batch) =>
        db
          // SQLite returns the bare `id` column from the row holding max(created_at): the newest checkpoint's id.
          .select({ projectId: projectSnapshots.projectId, lastId: projectSnapshots.id, last: sql<number>`max(${projectSnapshots.createdAt})`, n: sql<number>`count(*)` })
          .from(projectSnapshots)
          .where(inArray(projectSnapshots.projectId, batch))
          .groupBy(projectSnapshots.projectId),
      ),
    ),
  ]);
  const entry = (id: string) => {
    let e = out.get(id);
    if (!e) {
      e = { fileCount: 0, lastCheckpointAt: null, lastCheckpointId: null, checkpointCount: 0 };
      out.set(id, e);
    }
    return e;
  };
  for (const r of files.flat()) entry(r.projectId).fileCount = Number(r.n);
  for (const r of snaps.flat()) {
    const e = entry(r.projectId);
    e.checkpointCount = Number(r.n);
    // max() of a timestamp_ms column comes back as the raw integer.
    e.lastCheckpointAt = r.last ? new Date(Number(r.last)) : null;
    e.lastCheckpointId = r.lastId ?? null;
  }
  return out;
}
