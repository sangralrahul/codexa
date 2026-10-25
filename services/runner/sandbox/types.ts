import type { LogStream } from "../lib/ring-buffer";

export type SandboxLimits = {
  memoryBytes: number;
  pidsMax: number;
  cpuSeconds: number;
  fsizeBytes: number;
  nofile: number;
};

/** Everything a driver needs to know about one isolated workspace. */
export type SandboxSpec = {
  /** Safe id (used in paths and cgroup names). */
  id: string;
  /** Host directory of the sandbox; contains project/. */
  dir: string;
  /** Host path of the writable project directory (bind-mounted at /work/project). */
  projectDir: string;
  /** Host path of prebuilt base dependency sets (read-only at /work/base). */
  baseDir: string;
  /** Host path of helper scripts (read-only at /work/bin). */
  binDir: string;
  uid: number;
  gid: number;
  limits: SandboxLimits;
  /** Ports the sandbox is expected to listen on (used by the docker driver for -p). */
  ports: number[];
};

/** Paths as seen from inside the sandbox; identical for every driver. */
export const SANDBOX_PATHS = {
  work: "/work",
  project: "/work/project",
  base: "/work/base",
  bin: "/work/bin",
  home: "/tmp",
} as const;

export type SandboxProcess = {
  pid: number | null;
  /** Resolves when the process (and, for the local driver, its whole pid namespace) is gone. */
  exited: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  kill(): Promise<void>;
};

export type SpawnOptions = {
  /** Shell command executed with `sh -c` inside /work/project. */
  command: string;
  env: Record<string, string>;
  onOutput: (stream: Exclude<LogStream, "system">, chunk: string) => void;
};

export type ExecOptions = SpawnOptions & { timeoutMs: number };

export type ExecResult = { exitCode: number; output: string; timedOut: boolean; durationMs: number };

export interface SandboxDriver {
  readonly name: "local" | "docker" | "e2b" | "process";
  /** Called once at startup; may throw to make the runner refuse to start. */
  init(): Promise<void>;
  /** Make a freshly materialised sandbox directory usable by the sandbox user. */
  prepare(spec: SandboxSpec): Promise<void>;
  /** Start a long-running process (dev server). */
  spawn(spec: SandboxSpec, opts: SpawnOptions): Promise<SandboxProcess>;
  /** Run a command to completion with a wall-clock timeout. */
  exec(spec: SandboxSpec, opts: ExecOptions): Promise<ExecResult>;
  /** Kill anything still running and release driver-level resources (not the directory). */
  destroy(spec: SandboxSpec): Promise<void>;
  /** Human-readable description for /health and docs. */
  describe(): Record<string, unknown>;
}
