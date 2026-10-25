/**
 * Runner service configuration. Read once from the environment (the repo's
 * .env is loaded by index.ts / prepare.ts before this module is imported).
 *
 * The runner never imports Next.js code: it is a standalone Node process
 * started with `tsx` (npm run runner:dev / runner:start).
 */
import path from "node:path";

export type SandboxDriverName = "local" | "docker" | "e2b";

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number, got "${raw}"`);
  return n;
}

function stripPort(host: string): string {
  return host.replace(/:\d+$/, "").toLowerCase();
}

export type RunnerConfig = {
  port: number;
  previewPort: number;
  token: string;
  dataDir: string;
  sandboxesDir: string;
  sitesDir: string;
  baseDir: string;
  binDir: string;
  driver: SandboxDriverName;
  uid: number;
  gid: number;
  /** Host (without port) previews are served on, e.g. preview.localhost */
  previewHost: string;
  /** Host (without port) deployed sites are served on, e.g. sites.localhost */
  deployHost: string;
  previewProtocol: "http" | "https";
  /** Public port browsers use to reach the proxy (part of the preview URL). */
  publicPreviewPort: number | null;
  portRange: [number, number];
  limits: {
    memoryBytes: number;
    pidsMax: number;
    cpuSeconds: number;
    fsizeBytes: number;
    nofile: number;
    execTimeoutMs: number;
    buildTimeoutMs: number;
    idleTimeoutMs: number;
    maxSessionAgeMs: number;
    maxFiles: number;
    maxFileBytes: number;
    logLines: number;
    outputBytes: number;
  };
  nodeBin: string;
};

export function loadConfig(): RunnerConfig {
  const dataDir = process.env.RUNNER_DATA_DIR || "/var/codexa";
  const previewHostRaw = process.env.PREVIEW_HOST || "preview.localhost:4100";
  const deployHostRaw = process.env.DEPLOY_HOST || "sites.localhost:4100";
  const previewPort = int("RUNNER_PREVIEW_PORT", 4100);
  const m = previewHostRaw.match(/:(\d+)$/);
  const driver = (process.env.RUNNER_SANDBOX_DRIVER || "local") as SandboxDriverName;
  if (!["local", "docker", "e2b"].includes(driver)) throw new Error(`Unknown RUNNER_SANDBOX_DRIVER "${driver}"`);
  const token = process.env.RUNNER_TOKEN || "";
  if (!token) throw new Error("RUNNER_TOKEN is required (the Next.js app authenticates to the runner with it)");
  return {
    port: int("RUNNER_PORT", 4000),
    previewPort,
    token,
    dataDir,
    sandboxesDir: path.join(dataDir, "sandboxes"),
    sitesDir: path.join(dataDir, "sites"),
    baseDir: path.join(dataDir, "base"),
    binDir: path.join(dataDir, "bin"),
    driver,
    uid: int("RUNNER_SANDBOX_UID", 65534),
    gid: int("RUNNER_SANDBOX_GID", 65534),
    previewHost: stripPort(previewHostRaw),
    deployHost: stripPort(deployHostRaw),
    previewProtocol: process.env.PREVIEW_PROTOCOL === "https" ? "https" : "http",
    publicPreviewPort: m ? Number(m[1]) : null,
    portRange: [int("RUNNER_PORT_RANGE_START", 20000), int("RUNNER_PORT_RANGE_END", 29999)],
    limits: {
      memoryBytes: int("RUNNER_MEMORY_BYTES", 1024 * 1024 * 1024),
      pidsMax: int("RUNNER_PIDS_MAX", 256),
      cpuSeconds: int("RUNNER_CPU_SECONDS", 3600),
      fsizeBytes: int("RUNNER_FSIZE_BYTES", 256 * 1024 * 1024),
      nofile: int("RUNNER_NOFILE", 4096),
      execTimeoutMs: int("RUNNER_EXEC_TIMEOUT_MS", 120_000),
      buildTimeoutMs: int("RUNNER_BUILD_TIMEOUT_MS", 600_000),
      idleTimeoutMs: int("RUNNER_IDLE_TIMEOUT_MS", 30 * 60_000),
      maxSessionAgeMs: int("RUNNER_MAX_SESSION_AGE_MS", 6 * 60 * 60_000),
      maxFiles: int("RUNNER_MAX_FILES", 2000),
      maxFileBytes: int("RUNNER_MAX_FILE_BYTES", 1_000_000),
      logLines: int("RUNNER_LOG_LINES", 2000),
      outputBytes: int("RUNNER_OUTPUT_BYTES", 64 * 1024),
    },
    nodeBin: process.env.RUNNER_NODE_BIN || "/opt/node22/bin/node",
  };
}

/** Frameworks with a prebuilt shared dependency set (see prepare.ts). */
export const PREBUILT_FRAMEWORKS = ["vite-react", "node-express"] as const;
export type PrebuiltFramework = (typeof PREBUILT_FRAMEWORKS)[number];
export const KNOWN_FRAMEWORKS = ["vite-react", "static", "node-express", "nextjs"] as const;
export type Framework = (typeof KNOWN_FRAMEWORKS)[number];
