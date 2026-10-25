import "server-only";

/**
 * Contract used by the AI engine to run allowlisted commands inside a
 * project's sandbox. The runner agent replaces this stub with a real client
 * for services/runner. Until then, callers receive `available: false`.
 */
export type ExecCommand = "install" | "build" | "test" | "typecheck" | "lint";
export type ExecResult = { exitCode: number; output: string; timedOut: boolean; durationMs: number; available: boolean };

export async function execInProject(_projectId: string, _command: ExecCommand, _opts?: { timeoutMs?: number }): Promise<ExecResult> {
  return { exitCode: -1, output: "Runner service is not available in this environment.", timedOut: false, durationMs: 0, available: false };
}

export async function getRuntimeStatus(_projectId: string): Promise<{ available: boolean; status: "running" | "stopped" | "starting" | "error" | "unavailable"; previewUrl: string | null }> {
  return { available: false, status: "unavailable", previewUrl: null };
}

export async function getRuntimeLogs(_projectId: string, _opts?: { lines?: number }): Promise<{ available: boolean; lines: { ts: string; stream: "stdout" | "stderr" | "system"; line: string }[] }> {
  return { available: false, lines: [] };
}
