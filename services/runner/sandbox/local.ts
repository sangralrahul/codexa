/**
 * Local driver: unprivileged user/mount/pid namespaces + cgroup v1 limits +
 * prlimit, running as the sandbox uid (nobody by default). This is the driver
 * that is fully exercised in this repository. It shares the host network
 * namespace so the preview proxy can reach dev servers on 127.0.0.1.
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { createCgroup, destroyCgroup, cgroupPids, cgroupsAvailable, reapOrphanCgroups, type CgroupSet } from "../lib/cgroup";
import { truncateOutput } from "../lib/ring-buffer";
import { buildLocalCommand, SANDBOX_INIT_SCRIPT } from "./command";
import type { ExecOptions, ExecResult, SandboxDriver, SandboxProcess, SandboxSpec, SpawnOptions } from "./types";

export type LocalDriverOptions = { binDir: string; nodeBin: string; outputBytes: number; uid: number; gid: number; /** Kill sandboxes left behind by a crashed runner (never for in-process test runners). */ reapOrphans: boolean };

export class LocalDriver implements SandboxDriver {
  readonly name = "local" as const;
  private cgroups = new Map<string, CgroupSet>();
  private initScript: string;
  private nodeDir: string;
  private checks: Record<string, boolean> = {};

  constructor(private readonly opts: LocalDriverOptions) {
    this.initScript = path.join(opts.binDir, "sandbox-init.sh");
    this.nodeDir = path.dirname(path.dirname(opts.nodeBin)); // /opt/node22/bin/node -> /opt/node22
  }

  async init() {
    if (process.platform !== "linux") throw new Error("The local sandbox driver requires Linux namespaces (use RUNNER_SANDBOX_DRIVER=docker elsewhere)");
    await fs.writeFile(this.initScript, SANDBOX_INIT_SCRIPT, { mode: 0o755 });
    await fs.chmod(this.initScript, 0o755);
    for (const tool of ["setpriv", "unshare", "prlimit"]) {
      const found = await which(tool);
      this.checks[tool] = found;
      if (!found) throw new Error(`Required tool "${tool}" (util-linux) is missing from PATH`);
    }
    await fs.access(this.opts.nodeBin).catch(() => {
      throw new Error(`Node binary not found at ${this.opts.nodeBin} (set RUNNER_NODE_BIN)`);
    });
    const cg = cgroupsAvailable();
    this.checks["cgroup.memory"] = cg.memory;
    this.checks["cgroup.pids"] = cg.pids;
    if (typeof process.getuid === "function" && process.getuid() !== 0) {
      throw new Error("The local driver must run as root so it can drop to the sandbox uid, chown project files and manage cgroups");
    }
    if (this.opts.reapOrphans && (cg.memory || cg.pids)) {
      const reaped = await reapOrphanCgroups();
      if (reaped.cgroups || reaped.pids) console.log(`[runner] reaped ${reaped.pids} orphaned sandbox process(es) in ${reaped.cgroups} cgroup(s) from a previous run`);
    }
  }

  describe() {
    return { driver: "local", isolation: "user+mount+pid namespaces, pivot_root, cgroup v1, prlimit", network: "shared with host", checks: this.checks, uid: this.opts.uid };
  }

  async prepare(spec: SandboxSpec) {
    await chownR(spec.dir, spec.uid, spec.gid);
  }

  private cgroupFor(spec: SandboxSpec): CgroupSet {
    let cg = this.cgroups.get(spec.id);
    if (!cg) {
      cg = createCgroup(spec.id, spec.limits);
      this.cgroups.set(spec.id, cg);
    }
    return cg;
  }

  private envFor(spec: SandboxSpec, env: Record<string, string>): Record<string, string> {
    // Explicit allowlist: nothing from the runner's own environment leaks in.
    return {
      ...env,
      PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      CODEXA_PROJECT_DIR: spec.projectDir,
      CODEXA_BASE_DIR: spec.baseDir,
      CODEXA_BIN_DIR: spec.binDir,
      CODEXA_NODE_DIR: this.nodeDir,
      CODEXA_SANDBOX_UID: String(spec.uid),
      CODEXA_SANDBOX_GID: String(spec.gid),
    };
  }

  async spawn(spec: SandboxSpec, opts: SpawnOptions): Promise<SandboxProcess> {
    const cg = this.cgroupFor(spec);
    const cmd = buildLocalCommand({ spec, initScript: this.initScript, command: opts.command, cgroups: cg });
    const child = spawn(cmd.file, cmd.args, {
      cwd: spec.dir,
      env: this.envFor(spec, opts.env) as NodeJS.ProcessEnv,
      stdio: ["ignore", "pipe", "pipe"] as const,
      detached: true, // own process group so we can kill the whole tree
    });
    child.stdout.setEncoding("utf8").on("data", (d: string) => opts.onOutput("stdout", d));
    child.stderr.setEncoding("utf8").on("data", (d: string) => opts.onOutput("stderr", d));
    const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
      child.once("error", (err) => {
        opts.onOutput("stderr", `[runner] failed to start sandbox: ${err.message}\n`);
        resolve({ code: 127, signal: null });
      });
      child.once("exit", (code, signal) => resolve({ code, signal }));
    });
    const pid = child.pid ?? null;
    return {
      pid,
      exited,
      kill: async () => {
        if (pid) {
          try {
            process.kill(-pid, "SIGKILL");
          } catch {
            /* already gone */
          }
        }
        for (const p of cgroupPids(cg)) {
          try {
            process.kill(p, "SIGKILL");
          } catch {
            /* gone */
          }
        }
        await Promise.race([exited, new Promise((r) => setTimeout(r, 2000))]);
      },
    };
  }

  async exec(spec: SandboxSpec, opts: ExecOptions): Promise<ExecResult> {
    const started = Date.now();
    let output = "";
    let timedOut = false;
    const proc = await this.spawn(spec, {
      ...opts,
      onOutput: (stream, chunk) => {
        // Keep up to 4x the final budget in memory; truncateOutput keeps head and tail.
        if (output.length < this.opts.outputBytes * 4) output += chunk;
        opts.onOutput(stream, chunk);
      },
    });
    const timer = setTimeout(() => {
      timedOut = true;
      void proc.kill();
    }, opts.timeoutMs);
    const { code, signal } = await proc.exited;
    clearTimeout(timer);
    const exitCode = code ?? (signal ? 128 + 9 : 1);
    return { exitCode: timedOut ? 124 : exitCode, output: truncateOutput(output, this.opts.outputBytes).text, timedOut, durationMs: Date.now() - started };
  }

  async destroy(spec: SandboxSpec) {
    const cg = this.cgroups.get(spec.id);
    if (cg) {
      await destroyCgroup(cg);
      this.cgroups.delete(spec.id);
    }
  }
}

async function which(tool: string): Promise<boolean> {
  const dirs = (process.env.PATH || "/usr/bin:/bin").split(":");
  for (const d of dirs) {
    try {
      await fs.access(path.join(d, tool), 1);
      return true;
    } catch {
      /* next */
    }
  }
  return false;
}

export function chownR(dir: string, uid: number, gid: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("chown", ["-R", `${uid}:${gid}`, dir], { stdio: "ignore" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`chown failed (${code})`))));
  });
}
