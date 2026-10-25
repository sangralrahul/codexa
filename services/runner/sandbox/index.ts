import type { RunnerConfig } from "../config";
import { LocalDriver } from "./local";
import { DockerDriver } from "./docker";
import { E2bDriver } from "./e2b";
import { ProcessDriver } from "./process";
import type { SandboxDriver } from "./types";

export type { SandboxDriver, SandboxSpec, SandboxProcess, ExecResult } from "./types";
export { SANDBOX_PATHS } from "./types";

export function createDriver(cfg: RunnerConfig): SandboxDriver {
  switch (cfg.driver) {
    case "local":
      return new LocalDriver({ binDir: cfg.binDir, nodeBin: cfg.nodeBin, outputBytes: cfg.limits.outputBytes, uid: cfg.uid, gid: cfg.gid, reapOrphans: cfg.reapOrphans });
    case "docker":
      return new DockerDriver({ image: process.env.RUNNER_DOCKER_IMAGE || "node:22-bookworm-slim", outputBytes: cfg.limits.outputBytes, cpus: Number(process.env.RUNNER_DOCKER_CPUS || 2) });
    case "e2b":
      return new E2bDriver(process.env.E2B_API_KEY);
    case "process":
      return new ProcessDriver({ outputBytes: cfg.limits.outputBytes, uid: cfg.uid, gid: cfg.gid, nodeDir: process.env.RUNNER_NODE_DIR || "/usr/local" });
  }
}
