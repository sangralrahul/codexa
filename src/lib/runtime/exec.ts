import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { logger } from "@/lib/logger";
import { runnerHealth, RunnerUnavailableError } from "./client";
import { execRuntime, getActiveSession, getRuntime, loadProjectForRuntime, runtimeLogsTail, startRuntime, syncRuntime } from "@/lib/services/runtime";
import type { LogLine } from "./types";

/**
 * Contract used by the AI engine (and other server-side callers) to run
 * allowlisted commands inside a project's sandbox. Starts a runtime when none
 * is running, syncs the project's files first, then runs the command.
 */
export type ExecCommand = "install" | "build" | "test" | "typecheck" | "lint";
export type ExecResult = { exitCode: number; output: string; timedOut: boolean; durationMs: number; available: boolean };

const UNAVAILABLE = (detail?: string | null): ExecResult => ({
  exitCode: -1,
  output: `Runner service is not available${detail ? ` (${detail})` : ""}. Start it with "npm run runner:dev".`,
  timedOut: false,
  durationMs: 0,
  available: false,
});

async function waitForRunning(projectId: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  const { project } = await loadProjectForRuntime(projectId);
  while (Date.now() < deadline) {
    const state = await getRuntime(project);
    if (state.session?.status === "running") return true;
    if (!state.session || state.session.status === "error" || state.session.status === "stopped") return false;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

export async function execInProject(projectId: string, command: ExecCommand, opts?: { timeoutMs?: number; userId?: string | null }): Promise<ExecResult> {
  const health = await runnerHealth();
  if (!health.ok) return UNAVAILABLE(health.error);
  try {
    const { project } = await loadProjectForRuntime(projectId);
    let active = await getActiveSession(project.id);
    if (!active) {
      const [ws] = await db.select({ id: workspaces.id, plan: workspaces.plan }).from(workspaces).where(eq(workspaces.id, project.workspaceId)).limit(1);
      if (!ws) return UNAVAILABLE("workspace not found");
      await startRuntime({ project, workspace: ws, user: opts?.userId ? { id: opts.userId } : null });
      // Commands do not strictly need the dev server, but waiting a little lets
      // package linking finish and keeps logs in order. Timeouts are not fatal.
      await waitForRunning(project.id, 20_000);
      active = await getActiveSession(project.id);
      if (!active) return UNAVAILABLE("runtime failed to start");
    }
    await syncRuntime(project);
    const result = await execRuntime(project, command, { timeoutMs: opts?.timeoutMs });
    return { exitCode: result.exitCode, output: result.output, timedOut: result.timedOut, durationMs: result.durationMs, available: true };
  } catch (err) {
    if (err instanceof RunnerUnavailableError) return UNAVAILABLE(err.message);
    logger.warn("execInProject failed", { projectId, command, error: err instanceof Error ? err.message : String(err) });
    return { exitCode: -1, output: err instanceof Error ? err.message : String(err), timedOut: false, durationMs: 0, available: true };
  }
}

export async function getRuntimeStatus(projectId: string): Promise<{ available: boolean; status: "running" | "stopped" | "starting" | "error" | "unavailable"; previewUrl: string | null }> {
  const health = await runnerHealth();
  if (!health.ok) return { available: false, status: "unavailable", previewUrl: null };
  const { project } = await loadProjectForRuntime(projectId);
  const state = await getRuntime(project);
  if (!state.session) return { available: true, status: "stopped", previewUrl: null };
  return { available: true, status: state.session.status, previewUrl: state.session.status === "running" ? state.session.previewUrl : null };
}

export async function getRuntimeLogs(projectId: string, opts?: { lines?: number }): Promise<{ available: boolean; lines: LogLine[] }> {
  const health = await runnerHealth();
  if (!health.ok) return { available: false, lines: [] };
  try {
    const res = await runtimeLogsTail({ id: projectId }, opts?.lines ?? 200);
    return { available: true, lines: res?.lines ?? [] };
  } catch (err) {
    if (err instanceof RunnerUnavailableError) return { available: false, lines: [] };
    throw err;
  }
}
