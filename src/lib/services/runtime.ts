import "server-only";
import { capabilities } from "@/lib/env";
import crypto from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { projects, runtimeSessions, type Project, type RuntimeSession, type User, type Workspace } from "@/db/schema";
import { ApiError, conflict, notFound } from "@/lib/api";
import { PLANS } from "@/config/plans";
import { logger } from "@/lib/logger";
import { getAllFiles, logActivity, readFile } from "@/lib/services/projects";
import { getEnvVarsDecrypted } from "@/lib/services/env-vars";
import { assertQuota, getEffectivePlan, recordUsage } from "@/lib/services/usage";
import { runnerFor, runnerHealth, RunnerRequestError, RunnerUnavailableError } from "@/lib/runtime/client";
import type { ExecCommand, RunnerExecResult, RunnerSessionView, RuntimeSessionDto, RuntimeStateDto } from "@/lib/runtime/types";

/**
 * Runtime sessions: one live sandbox per project, backed by the runner
 * service. This module is the only place that talks to the runner about
 * sessions, and the only place that sees decrypted project env vars (they are
 * passed to the runner and never returned to the browser).
 *
 * Usage accounting: `lastHeartbeatAt` doubles as the "runtime minutes
 * accounted up to" marker. Whole minutes are recorded on every heartbeat
 * (the preview panel polls GET /runtime), and the remainder is recorded on stop.
 */

const ACTIVE = ["starting", "running"] as const;
const HEARTBEAT_ACCOUNT_MS = 5 * 60_000;

export function toSessionDto(row: RuntimeSession): RuntimeSessionDto {
  return {
    id: row.id,
    status: row.status,
    previewUrl: row.previewUrl,
    error: row.error,
    startedAt: row.startedAt.toISOString(),
    stoppedAt: row.stoppedAt?.toISOString() ?? null,
    lastHeartbeatAt: row.lastHeartbeatAt.toISOString(),
  };
}

export async function getActiveSession(projectId: string): Promise<RuntimeSession | null> {
  const rows = await db
    .select()
    .from(runtimeSessions)
    .where(and(eq(runtimeSessions.projectId, projectId), inArray(runtimeSessions.status, [...ACTIVE])))
    .orderBy(desc(runtimeSessions.startedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLatestSession(projectId: string): Promise<RuntimeSession | null> {
  const rows = await db.select().from(runtimeSessions).where(eq(runtimeSessions.projectId, projectId)).orderBy(desc(runtimeSessions.startedAt)).limit(1);
  return rows[0] ?? null;
}

async function countActiveInWorkspace(workspaceId: string): Promise<number> {
  const rows = await db
    .select({ id: runtimeSessions.id })
    .from(runtimeSessions)
    .innerJoin(projects, eq(projects.id, runtimeSessions.projectId))
    .where(and(eq(projects.workspaceId, workspaceId), inArray(runtimeSessions.status, [...ACTIVE])));
  return rows.length;
}

/** Record elapsed runtime minutes since the last accounting mark. `final` rounds the remainder up. */
async function accrueMinutes(row: RuntimeSession, workspaceId: string, final: boolean, now = new Date()) {
  const elapsedMs = now.getTime() - row.lastHeartbeatAt.getTime();
  if (!final && elapsedMs < HEARTBEAT_ACCOUNT_MS) return row;
  const minutes = final ? Math.ceil(elapsedMs / 60_000) : Math.floor(elapsedMs / 60_000);
  const mark = final ? now : new Date(row.lastHeartbeatAt.getTime() + minutes * 60_000);
  if (minutes > 0) {
    await recordUsage({ workspaceId, projectId: row.projectId, userId: row.startedBy, kind: "runtime_minutes", quantity: minutes, metadata: { sessionId: row.id } });
  }
  const [updated] = await db.update(runtimeSessions).set({ lastHeartbeatAt: mark }).where(eq(runtimeSessions.id, row.id)).returning();
  return updated ?? row;
}

async function markStopped(row: RuntimeSession, workspaceId: string, patch: { status: "stopped" | "error"; error?: string | null }) {
  await accrueMinutes(row, workspaceId, true);
  const [updated] = await db
    .update(runtimeSessions)
    .set({ status: patch.status, error: patch.error ?? null, stoppedAt: new Date() })
    .where(eq(runtimeSessions.id, row.id))
    .returning();
  return updated;
}

function mapRunnerStatus(view: RunnerSessionView): { status: "starting" | "running" | "stopped" | "error"; error: string | null } {
  switch (view.status) {
    case "starting":
      return { status: "starting", error: null };
    case "running":
      return { status: "running", error: null };
    case "exited":
      return { status: "stopped", error: view.error };
    case "error":
      return { status: "error", error: view.error ?? "The dev server failed" };
    case "stopped":
      return { status: "stopped", error: null };
  }
}

export type StartRuntimeInput = { project: Project; workspace: Pick<Workspace, "id" | "plan">; user: Pick<User, "id"> | null };

/**
 * Start (or return the already running) runtime for a project. Enforces one
 * runtime per project, the plan's concurrentRuntimes limit and the
 * runtime_minutes quota.
 */
export async function startRuntime({ project, workspace, user }: StartRuntimeInput): Promise<RuntimeSession> {
  const existing = await getActiveSession(project.id);
  if (existing) {
    const reconciled = await reconcile(existing, workspace.id);
    if (reconciled && ACTIVE.includes(reconciled.status as (typeof ACTIVE)[number])) return reconciled;
  }
  const health = await runnerHealth();
  if (!health.ok) throw new RunnerUnavailableError(health.error ?? undefined);

  const plan = await getEffectivePlan(workspace);
  const limit = PLANS[plan].limits.concurrentRuntimes;
  const active = await countActiveInWorkspace(workspace.id);
  if (limit >= 0 && active >= limit) {
    throw new ApiError(402, `Your ${PLANS[plan].name} plan allows ${limit} running preview${limit === 1 ? "" : "s"} at a time (${active}/${limit} in use). Stop another project's preview or upgrade.`, "quota_exceeded", {
      kind: "concurrent_runtimes",
      used: active,
      limit,
      plan,
    });
  }
  await assertQuota(workspace.id, "runtime_minutes", 1);

  const previewToken = crypto.randomBytes(12).toString("hex"); // 24 chars, DNS-safe, 96 bits of entropy
  const [row] = await db
    .insert(runtimeSessions)
    .values({ projectId: project.id, status: "starting", previewToken, startedBy: user?.id ?? null })
    .returning();
  try {
    const [files, envVars] = await Promise.all([getAllFiles(project.id), getEnvVarsDecrypted(project.id)]);
    const created = await runnerFor(project.id).createSession({
      projectId: project.id,
      framework: project.framework,
      settings: project.settings ?? {},
      files,
      env: envVars,
      previewToken,
    });
    const [updated] = await db
      .update(runtimeSessions)
      .set({ runnerSessionId: created.id, previewUrl: created.previewUrl, status: created.session.status === "running" ? "running" : "starting" })
      .where(eq(runtimeSessions.id, row.id))
      .returning();
    await logActivity(project.id, user?.id ?? null, "runtime.started", "Started the preview runtime", { sessionId: row.id, framework: project.framework });
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(runtimeSessions).set({ status: "error", error: message, stoppedAt: new Date() }).where(eq(runtimeSessions.id, row.id));
    logger.warn("runtime start failed", { projectId: project.id, error: message });
    throw err;
  }
}

/** Ask the runner about a session we believe is active and update our row accordingly. */
async function reconcile(row: RuntimeSession, workspaceId: string): Promise<RuntimeSession | null> {
  if (!row.runnerSessionId) {
    // Insert happened but the runner call never completed (crash mid-start): close it out.
    if (Date.now() - row.startedAt.getTime() > 60_000) return markStopped(row, workspaceId, { status: "error", error: "Start did not complete" });
    return row;
  }
  const health = await runnerHealth();
  if (!health.ok) return row; // leave as-is; the caller reports runnerAvailable=false
  try {
    const { session } = await runnerFor(row.projectId).getSession(row.runnerSessionId, true);
    const mapped = mapRunnerStatus(session);
    if (mapped.status === "starting" || mapped.status === "running") {
      const accrued = await accrueMinutes(row, workspaceId, false);
      if (accrued.status !== mapped.status || accrued.previewUrl !== session.previewUrl) {
        const [updated] = await db.update(runtimeSessions).set({ status: mapped.status, previewUrl: session.previewUrl, error: null }).where(eq(runtimeSessions.id, row.id)).returning();
        return updated;
      }
      return accrued;
    }
    return markStopped(row, workspaceId, { status: mapped.status, error: mapped.error });
  } catch (err) {
    if (err instanceof RunnerRequestError && err.status === 404) {
      return markStopped(row, workspaceId, { status: "stopped", error: "The sandbox was stopped by the runner (idle timeout or restart)" });
    }
    if (err instanceof RunnerUnavailableError) return row;
    throw err;
  }
}

export async function getRuntime(project: Pick<Project, "id" | "workspaceId">): Promise<RuntimeStateDto> {
  const health = await runnerHealth();
  const active = await getActiveSession(project.id);
  if (!active) {
    const latest = await getLatestSession(project.id);
    return { session: latest ? toSessionDto(latest) : null, runnerAvailable: health.ok, runnerError: health.error, runnerConfigured: capabilities.runner };
  }
  const row = (await reconcile(active, project.workspaceId)) ?? active;
  return { session: toSessionDto(row), runnerAvailable: health.ok, runnerError: health.error, runnerConfigured: capabilities.runner };
}

export async function stopRuntime(project: Pick<Project, "id" | "workspaceId">, userId: string | null): Promise<RuntimeSession | null> {
  const active = await getActiveSession(project.id);
  if (!active) return null;
  if (active.runnerSessionId) {
    try {
      await runnerFor(project.id).stopSession(active.runnerSessionId);
    } catch (err) {
      if (!(err instanceof RunnerUnavailableError) && !(err instanceof RunnerRequestError && err.status === 404)) throw err;
    }
  }
  const row = await markStopped(active, project.workspaceId, { status: "stopped" });
  await logActivity(project.id, userId, "runtime.stopped", "Stopped the preview runtime", { sessionId: active.id });
  return row;
}

/** Push the current DB content of `paths` (or every file) into the running sandbox. */
export async function syncRuntime(project: Pick<Project, "id" | "workspaceId">, paths?: string[]): Promise<{ written: number; deleted: number; session: RuntimeSession } | null> {
  const active = await getActiveSession(project.id);
  if (!active?.runnerSessionId) return null;
  let files: Record<string, string> = {};
  const deletes: string[] = [];
  if (paths && paths.length) {
    for (const p of paths) {
      const file = await readFile(project.id, p);
      if (file) files[file.path] = file.content;
      else deletes.push(p);
    }
  } else {
    files = await getAllFiles(project.id);
  }
  const res = await runnerFor(project.id).syncFiles(active.runnerSessionId, files, deletes);
  return { ...res, session: active };
}

export async function execRuntime(project: Pick<Project, "id" | "workspaceId">, command: ExecCommand, opts: { timeoutMs?: number } = {}): Promise<RunnerExecResult> {
  const active = await getActiveSession(project.id);
  if (!active?.runnerSessionId) throw conflict("Start the preview runtime before running commands");
  try {
    return await runnerFor(project.id).exec(active.runnerSessionId, command, opts.timeoutMs);
  } catch (err) {
    if (err instanceof RunnerRequestError && err.status === 404) {
      await markStopped(active, project.workspaceId, { status: "stopped", error: "The sandbox was stopped by the runner" });
      throw conflict("The preview runtime is no longer running; start it again");
    }
    throw err;
  }
}

export async function runtimeLogsTail(project: Pick<Project, "id">, lines = 200) {
  const active = await getActiveSession(project.id);
  if (!active?.runnerSessionId) return null;
  return runnerFor(project.id).logsTail(active.runnerSessionId, lines);
}

export async function runtimeLogsStream(project: Pick<Project, "id">, signal?: AbortSignal): Promise<Response | null> {
  const active = await getActiveSession(project.id);
  if (!active?.runnerSessionId) return null;
  return runnerFor(project.id).logsStream(active.runnerSessionId, signal);
}

/** Internal helper for server-side callers (AI engine) that only know the project id. */
export async function loadProjectForRuntime(projectId: string): Promise<{ project: Project; workspaceId: string }> {
  const rows = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  const project = rows[0];
  if (!project || project.deletedAt) throw notFound("Project");
  return { project, workspaceId: project.workspaceId };
}
