import "server-only";
import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/db";
import { deployments, generationRuns, projectActivity, projects, runtimeSessions, users, type Project } from "@/db/schema";

/**
 * Read models for the signed-in app chrome: the dashboard cockpit ("Continue building", the
 * Activity river, the first-run checklist), the sidebar's Recent list and the project cards.
 *
 * Every status here comes from a database row; nothing is inferred or invented:
 * - preview: a `runtime_sessions` row with status "running" whose heartbeat is recent enough that
 *   the runner cannot have idled it out yet (the runner stops idle sandboxes after 30 minutes);
 * - live: the deployment row currently marked "live" (one per provider);
 * - lastDeploy: the newest deployment row, whatever its status (to show "Deploy failed" / building);
 * - lastRun: the newest `generation_runs` row (first plan line, files changed, finish time).
 *
 * Callers pass only workspace ids the user belongs to (from getCurrentWorkspace / listUserWorkspaces),
 * so every query is scoped to the user's workspaces. ID lists are split so a statement never binds
 * more than D1's 100 parameters, and only portable SQLite is used (correlated max() subqueries, no
 * window functions or Postgres casts).
 */

/** D1 binds at most 100 parameters per statement; leave room for the other values in each query. */
const ID_BATCH = 90;
/** A "running" row older than this (no heartbeat) has been idled out by the runner (30 min default). */
const RUNNING_FRESH_MS = 35 * 60_000;

function idBatches(ids: string[], size = ID_BATCH): string[][] {
  const unique = [...new Set(ids)];
  const out: string[][] = [];
  for (let i = 0; i < unique.length; i += size) out.push(unique.slice(i, i + size));
  return out;
}

async function inBatches<T>(ids: string[], run: (batch: string[]) => Promise<T[]>): Promise<T[]> {
  const batches = idBatches(ids);
  if (!batches.length) return [];
  return (await Promise.all(batches.map(run))).flat();
}

export type DeployStatus = (typeof deployments.$inferSelect)["status"];

export type ProjectStatus = {
  /** The preview sandbox is running right now (fresh "running" row). */
  preview: { startedAt: Date } | null;
  /** The deployment currently serving traffic. */
  live: { url: string; host: string; provider: string; at: Date } | null;
  /** The newest deployment, whatever its outcome. */
  lastDeploy: { status: DeployStatus; at: Date; error: string | null } | null;
};

export type LastRun = {
  id: string;
  status: (typeof generationRuns.$inferSelect)["status"];
  stage: string;
  /** The first line of the agent's plan, when it made one. */
  summary: string | null;
  changedFiles: number;
  finishedAt: Date | null;
  createdAt: Date;
};

export type ActivityItem = {
  id: string;
  projectId: string;
  projectName: string;
  workspaceId: string;
  kind: string;
  message: string;
  actorId: string | null;
  actorName: string;
  /** Avatar colour seed: the same one every other avatar of this person uses (name, else email). */
  actorSeed: string;
  actorAvatarUrl: string | null;
  createdAt: Date;
  /** Consecutive edits by the same person to the same project are folded into one row. */
  count: number;
};

export type Milestones = { project: boolean; preview: boolean; deploy: boolean };

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

/** Preview / live / last-deploy state for each project id (missing ids have no rows). */
export async function getProjectStatuses(projectIds: string[], now = new Date()): Promise<Map<string, ProjectStatus>> {
  const out = new Map<string, ProjectStatus>();
  if (!projectIds.length) return out;
  const fresh = new Date(now.getTime() - RUNNING_FRESH_MS);
  const latest = alias(deployments, "latest_d");

  const [running, live, newest] = await Promise.all([
    inBatches(projectIds, (batch) =>
      db
        .select({ projectId: runtimeSessions.projectId, startedAt: runtimeSessions.startedAt })
        .from(runtimeSessions)
        .where(and(inArray(runtimeSessions.projectId, batch), eq(runtimeSessions.status, "running"), gte(runtimeSessions.lastHeartbeatAt, fresh))),
    ),
    inBatches(projectIds, (batch) =>
      db
        .select({ projectId: deployments.projectId, url: deployments.url, provider: deployments.provider, finishedAt: deployments.finishedAt, createdAt: deployments.createdAt })
        .from(deployments)
        .where(and(inArray(deployments.projectId, batch), eq(deployments.status, "live")))
        .orderBy(desc(deployments.createdAt)),
    ),
    inBatches(projectIds, (batch) =>
      db
        .select({ projectId: deployments.projectId, status: deployments.status, createdAt: deployments.createdAt, error: deployments.error })
        .from(deployments)
        .where(
          and(
            inArray(deployments.projectId, batch),
            eq(deployments.createdAt, db.select({ at: sql`max(${latest.createdAt})` }).from(latest).where(eq(latest.projectId, deployments.projectId))),
          ),
        ),
    ),
  ]);

  const entry = (id: string) => {
    let s = out.get(id);
    if (!s) {
      s = { preview: null, live: null, lastDeploy: null };
      out.set(id, s);
    }
    return s;
  };
  for (const r of running) {
    const s = entry(r.projectId);
    if (!s.preview || r.startedAt > s.preview.startedAt) s.preview = { startedAt: r.startedAt };
  }
  for (const r of live) {
    const s = entry(r.projectId);
    if (!s.live && r.url) s.live = { url: r.url, host: hostOf(r.url), provider: r.provider, at: r.finishedAt ?? r.createdAt };
  }
  for (const r of newest) entry(r.projectId).lastDeploy = { status: r.status, at: r.createdAt, error: r.error };
  return out;
}

/** Ids (of those given) whose preview sandbox is running right now. */
export async function getRunningProjectIds(projectIds: string[], now = new Date()): Promise<Set<string>> {
  const fresh = new Date(now.getTime() - RUNNING_FRESH_MS);
  const rows = await inBatches(projectIds, (batch) =>
    db
      .select({ projectId: runtimeSessions.projectId })
      .from(runtimeSessions)
      .where(and(inArray(runtimeSessions.projectId, batch), eq(runtimeSessions.status, "running"), gte(runtimeSessions.lastHeartbeatAt, fresh))),
  );
  return new Set(rows.map((r) => r.projectId));
}

/** The newest AI run of each project. */
export async function getLatestRuns(projectIds: string[]): Promise<Map<string, LastRun>> {
  const newer = alias(generationRuns, "newer_run");
  const rows = await inBatches(projectIds, (batch) =>
    db
      .select({
        id: generationRuns.id,
        projectId: generationRuns.projectId,
        status: generationRuns.status,
        stage: generationRuns.stage,
        plan: generationRuns.plan,
        changedFiles: generationRuns.changedFiles,
        finishedAt: generationRuns.finishedAt,
        createdAt: generationRuns.createdAt,
      })
      .from(generationRuns)
      .where(
        and(
          inArray(generationRuns.projectId, batch),
          eq(generationRuns.createdAt, db.select({ at: sql`max(${newer.createdAt})` }).from(newer).where(eq(newer.projectId, generationRuns.projectId))),
        ),
      ),
  );
  const out = new Map<string, LastRun>();
  for (const r of rows) {
    if (out.has(r.projectId)) continue;
    const first = (Array.isArray(r.plan) ? r.plan : []).find((l) => typeof l === "string" && l.trim());
    out.set(r.projectId, {
      id: r.id,
      status: r.status,
      stage: r.stage,
      summary: first ? first.trim().replace(/^[-*\d.)\s]+/, "").slice(0, 140) || null : null,
      changedFiles: Array.isArray(r.changedFiles) ? r.changedFiles.length : 0,
      finishedAt: r.finishedAt,
      createdAt: r.createdAt,
    });
  }
  return out;
}

const FOLDABLE = new Set(["file.updated", "file.created", "file.deleted", "file.renamed"]);

/** The newest project_activity rows across the given workspaces (live projects only), edits folded. */
export async function getRecentActivity(workspaceIds: string[], limit = 10): Promise<ActivityItem[]> {
  // Fetch a few extra rows so folding consecutive file edits still leaves `limit` items.
  const fetchN = limit * 4;
  const rows = await inBatches(workspaceIds, (batch) =>
    db
      .select({
        id: projectActivity.id,
        projectId: projectActivity.projectId,
        kind: projectActivity.kind,
        message: projectActivity.message,
        actorId: projectActivity.actorId,
        createdAt: projectActivity.createdAt,
        projectName: projects.name,
        workspaceId: projects.workspaceId,
        actorName: users.name,
        actorEmail: users.email,
        actorAvatarUrl: users.avatarUrl,
      })
      .from(projectActivity)
      .innerJoin(projects, eq(projects.id, projectActivity.projectId))
      .leftJoin(users, eq(users.id, projectActivity.actorId))
      .where(and(inArray(projects.workspaceId, batch), isNull(projects.deletedAt)))
      .orderBy(desc(projectActivity.createdAt))
      .limit(fetchN),
  );
  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const out: ActivityItem[] = [];
  for (const r of rows.slice(0, fetchN)) {
    const prev = out.at(-1);
    if (prev && FOLDABLE.has(r.kind) && FOLDABLE.has(prev.kind) && prev.projectId === r.projectId && prev.actorId === r.actorId) {
      prev.count += 1;
      continue;
    }
    if (out.length >= limit) break;
    out.push({
      id: r.id,
      projectId: r.projectId,
      projectName: r.projectName,
      workspaceId: r.workspaceId,
      kind: r.kind,
      message: r.message,
      actorId: r.actorId,
      actorName: r.actorName?.trim() || r.actorEmail?.split("@")[0] || "Someone",
      actorSeed: r.actorName?.trim() || r.actorEmail || r.actorId || "Someone",
      actorAvatarUrl: r.actorAvatarUrl ?? null,
      createdAt: r.createdAt,
      count: 1,
    });
  }
  return out;
}

/** First-run checklist: has anything in these workspaces ever been created, previewed or deployed? */
export async function getMilestones(workspaceIds: string[]): Promise<Milestones> {
  if (!workspaceIds.length) return { project: false, preview: false, deploy: false };
  const [project, preview, deploy] = await Promise.all([
    inBatches(workspaceIds, (batch) => db.select({ id: projects.id }).from(projects).where(and(inArray(projects.workspaceId, batch), isNull(projects.deletedAt))).limit(1)),
    inBatches(workspaceIds, (batch) =>
      db.select({ id: runtimeSessions.id }).from(runtimeSessions).innerJoin(projects, eq(projects.id, runtimeSessions.projectId)).where(inArray(projects.workspaceId, batch)).limit(1),
    ),
    inBatches(workspaceIds, (batch) =>
      db.select({ id: deployments.id }).from(deployments).innerJoin(projects, eq(projects.id, deployments.projectId)).where(inArray(projects.workspaceId, batch)).limit(1),
    ),
  ]);
  return { project: project.length > 0, preview: preview.length > 0, deploy: deploy.length > 0 };
}

export type OverviewProject = { project: Project; status: ProjectStatus; lastRun: LastRun | null };

export type DashboardOverview = {
  /** The user's most recently opened projects, newest first, with their real state. */
  projects: OverviewProject[];
  activity: ActivityItem[];
  milestones: Milestones;
};

/**
 * Everything the dashboard cockpit shows about the user's work, scoped to `workspaceIds`
 * (the workspaces the user belongs to): the `recent` most recently opened projects with their
 * latest deployment, running preview and latest AI run; the last `activity` events; and the
 * first-run milestones.
 */
export async function getDashboardOverview(workspaceIds: string[], { recent = 4, activity = 10 }: { recent?: number; activity?: number } = {}): Promise<DashboardOverview> {
  if (!workspaceIds.length) return { projects: [], activity: [], milestones: { project: false, preview: false, deploy: false } };
  const recentRows = (
    await inBatches(workspaceIds, (batch) =>
      db
        .select()
        .from(projects)
        .where(and(inArray(projects.workspaceId, batch), isNull(projects.deletedAt)))
        .orderBy(desc(sql`coalesce(${projects.lastOpenedAt}, ${projects.updatedAt})`))
        .limit(recent),
    )
  )
    .sort((a, b) => (b.lastOpenedAt ?? b.updatedAt).getTime() - (a.lastOpenedAt ?? a.updatedAt).getTime())
    .slice(0, recent);
  const ids = recentRows.map((p) => p.id);
  const [statuses, runs, events, milestones] = await Promise.all([getProjectStatuses(ids), getLatestRuns(ids), getRecentActivity(workspaceIds, activity), getMilestones(workspaceIds)]);
  return {
    projects: recentRows.map((project) => ({ project, status: statuses.get(project.id) ?? { preview: null, live: null, lastDeploy: null }, lastRun: runs.get(project.id) ?? null })),
    activity: events,
    milestones,
  };
}
