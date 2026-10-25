/**
 * Process driver: runs commands directly as an unprivileged user, with no
 * namespaces or cgroups of its own. Used inside a Cloudflare Container, where
 * the container (a dedicated VM per project) is the isolation boundary and
 * its instance type sets CPU, memory and disk limits.
 *
 * The container holds exactly one project, so the driver exposes it at the
 * same in-sandbox paths every driver uses (/work/project, /work/base,
 * /work/bin) by symlinking them to the runner's data directory.
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { truncateOutput } from "../lib/ring-buffer";
import { chownR } from "./local";
import { SANDBOX_PATHS, type ExecOptions, type ExecResult, type SandboxDriver, type SandboxProcess, type SandboxSpec, type SpawnOptions } from "./types";

export type ProcessDriverOptions = { outputBytes: number; uid: number; gid: number; nodeDir: string };

async function relink(link: string, target: string) {
  await fs.rm(link, { force: true, recursive: false }).catch(() => {});
  await fs.symlink(target, link);
}

export class ProcessDriver implements SandboxDriver {
  readonly name = "process" as const;
  private current: string | null = null;
  private procs = new Map<string, Set<number>>();

  constructor(private readonly opts: ProcessDriverOptions) {}

  async init() {
    if (process.platform !== "linux") throw new Error("The process driver is meant for Linux containers");
    await fs.mkdir(SANDBOX_PATHS.work, { recursive: true });
  }

  describe() {
    return { driver: "process", isolation: "one project per Cloudflare Container (VM); commands run as an unprivileged user", network: "container", uid: this.opts.uid };
  }

  async prepare(spec: SandboxSpec) {
    await chownR(spec.dir, spec.uid, spec.gid);
    await relink(SANDBOX_PATHS.project, spec.projectDir);
    await relink(SANDBOX_PATHS.base, spec.baseDir);
    await relink(SANDBOX_PATHS.bin, spec.binDir);
    this.current = spec.id;
  }

  private env(env: Record<string, string>): NodeJS.ProcessEnv {
    // Explicit allowlist: nothing from the runner's own environment (tokens) leaks in.
    return {
      ...env,
      HOME: SANDBOX_PATHS.home,
      PATH: `${SANDBOX_PATHS.project}/node_modules/.bin:${this.opts.nodeDir}/bin:/usr/local/bin:/usr/bin:/bin`,
    } as unknown as NodeJS.ProcessEnv;
  }

  async spawn(spec: SandboxSpec, opts: SpawnOptions): Promise<SandboxProcess> {
    if (this.current !== spec.id) await this.prepare(spec);
    const child = spawn("sh", ["-c", opts.command], {
      cwd: SANDBOX_PATHS.project,
      env: this.env(opts.env),
      uid: spec.uid,
      gid: spec.gid,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });
    child.stdout?.setEncoding("utf8").on("data", (d: string) => opts.onOutput("stdout", d));
    child.stderr?.setEncoding("utf8").on("data", (d: string) => opts.onOutput("stderr", d));
    const pid = child.pid ?? null;
    if (pid) {
      const set = this.procs.get(spec.id) ?? new Set<number>();
      set.add(pid);
      this.procs.set(spec.id, set);
    }
    const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
      child.once("error", (err) => {
        opts.onOutput("stderr", `[runner] failed to start: ${err.message}\n`);
        resolve({ code: 127, signal: null });
      });
      child.once("exit", (code, signal) => {
        if (pid) this.procs.get(spec.id)?.delete(pid);
        resolve({ code, signal });
      });
    });
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
    for (const pid of this.procs.get(spec.id) ?? []) {
      try {
        process.kill(-pid, "SIGKILL");
      } catch {
        /* gone */
      }
    }
    this.procs.delete(spec.id);
    if (this.current === spec.id) this.current = null;
  }
}
