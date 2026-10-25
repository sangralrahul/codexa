/** Types shared between the runner client, services, API routes and panels. */

export type RunnerSessionStatus = "starting" | "running" | "exited" | "error" | "stopped";

export type RunnerSessionView = {
  id: string;
  projectId: string;
  framework: string;
  status: RunnerSessionStatus;
  port: number;
  previewUrl: string;
  startedAt: string;
  readyAt: string | null;
  lastActivityAt: string;
  exitCode: number | null;
  error: string | null;
  uptimeMs: number;
};

export type RunnerHealth = {
  ok: boolean;
  version: number;
  uptimeMs: number;
  driver: Record<string, unknown>;
  cgroups: { memory: boolean; pids: boolean };
  baseSets: Record<string, string>;
  sessions: { total: number; counts: Record<RunnerSessionStatus, number>; portsInUse: number };
  previewHost: string;
  deployHost: string;
};

export type LogLine = { ts: string; stream: "stdout" | "stderr" | "system"; line: string };

export type ExecCommand = "install" | "build" | "test" | "typecheck" | "lint";

export type RunnerExecResult = { exitCode: number; output: string; timedOut: boolean; durationMs: number; skipped: boolean };

export type RunnerDeployResult = { url: string; log: string; fileCount: number; durationMs: number };

/** Shape returned to the browser for a project's runtime session (never includes env vars). */
export type RuntimeSessionDto = {
  id: string;
  status: "starting" | "running" | "stopped" | "error";
  previewUrl: string | null;
  error: string | null;
  startedAt: string;
  stoppedAt: string | null;
  lastHeartbeatAt: string;
};

export type RuntimeStateDto = { session: RuntimeSessionDto | null; runnerAvailable: boolean; runnerError?: string | null };

export type DeploymentDto = {
  id: string;
  projectId: string;
  provider: "codexa" | "vercel";
  status: "queued" | "building" | "deploying" | "live" | "failed" | "rolled_back";
  url: string | null;
  providerDeploymentId: string | null;
  snapshotId: string | null;
  error: string | null;
  config: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  finishedAt: string | null;
  buildLog?: string;
};
