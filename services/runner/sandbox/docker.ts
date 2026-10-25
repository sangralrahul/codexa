/**
 * Docker driver: one container per sandbox with memory/pids limits, dropped
 * capabilities and a bridge network. This driver is implemented against the
 * docker CLI but could NOT be verified in the authoring environment (no
 * daemon). Treat it as a boundary that needs a smoke test on a docker host.
 */
import { spawn } from "node:child_process";
import { truncateOutput } from "../lib/ring-buffer";
import { SANDBOX_PATHS, type ExecOptions, type ExecResult, type SandboxDriver, type SandboxProcess, type SandboxSpec, type SpawnOptions } from "./types";

export type DockerDriverOptions = { image: string; outputBytes: number; cpus: number };

export function containerName(id: string) {
  return `codexa-sbx-${id}`;
}

/** Pure: arguments for `docker run`. Unit-tested for the absence of privileged flags. */
export function dockerRunArgs(spec: SandboxSpec, opts: { image: string; cpus: number; command: string; env: Record<string, string>; detach: boolean }): string[] {
  const args = ["run", "--rm", opts.detach ? "-d" : "-i", "--name", containerName(spec.id)];
  args.push(`--memory=${spec.limits.memoryBytes}`, `--memory-swap=${spec.limits.memoryBytes}`, `--pids-limit=${spec.limits.pidsMax}`, `--cpus=${opts.cpus}`);
  args.push("--network=bridge", "--cap-drop=ALL", "--security-opt=no-new-privileges", `--user=${spec.uid}:${spec.gid}`);
  args.push("--tmpfs", "/tmp:rw,exec,mode=1777", "--read-only");
  args.push("-v", `${spec.projectDir}:${SANDBOX_PATHS.project}:rw`, "-v", `${spec.baseDir}:${SANDBOX_PATHS.base}:ro`, "-v", `${spec.binDir}:${SANDBOX_PATHS.bin}:ro`);
  args.push("-w", SANDBOX_PATHS.project);
  for (const port of spec.ports) args.push("-p", `127.0.0.1:${port}:${port}`);
  for (const [k, v] of Object.entries({ ...opts.env, HOME: SANDBOX_PATHS.home, PATH: `${SANDBOX_PATHS.project}/node_modules/.bin:/usr/local/bin:/usr/bin:/bin` })) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) continue;
    args.push("-e", `${k}=${v}`);
  }
  args.push(opts.image, "sh", "-c", opts.command);
  return args;
}

function run(args: string[], onOutput?: (stream: "stdout" | "stderr", chunk: string) => void) {
  const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.setEncoding("utf8").on("data", (d: string) => onOutput?.("stdout", d));
  child.stderr.setEncoding("utf8").on("data", (d: string) => onOutput?.("stderr", d));
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.once("error", () => resolve({ code: 127, signal: null }));
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  return { child, exited };
}

export class DockerDriver implements SandboxDriver {
  readonly name = "docker" as const;
  constructor(private readonly opts: DockerDriverOptions) {}

  async init() {
    const { exited } = run(["version", "--format", "{{.Server.Version}}"]);
    const { code } = await exited;
    if (code !== 0) throw new Error("docker daemon is not reachable (RUNNER_SANDBOX_DRIVER=docker)");
  }

  describe() {
    return { driver: "docker", image: this.opts.image, isolation: "container (cap-drop ALL, no-new-privileges, memory/pids limits, bridge network)", verified: false };
  }

  async prepare() {
    /* bind mounts are used as-is; files were chowned by the session manager */
  }

  async spawn(spec: SandboxSpec, opts: SpawnOptions): Promise<SandboxProcess> {
    const { child, exited } = run(dockerRunArgs(spec, { image: this.opts.image, cpus: this.opts.cpus, command: opts.command, env: opts.env, detach: false }), opts.onOutput);
    return {
      pid: child.pid ?? null,
      exited,
      kill: async () => {
        await run(["rm", "-f", containerName(spec.id)]).exited;
        await Promise.race([exited, new Promise((r) => setTimeout(r, 5000))]);
      },
    };
  }

  async exec(spec: SandboxSpec, opts: ExecOptions): Promise<ExecResult> {
    const started = Date.now();
    let output = "";
    let timedOut = false;
    const name = `${containerName(spec.id)}-exec-${Date.now().toString(36)}`;
    const args = dockerRunArgs({ ...spec, id: spec.id, ports: [] }, { image: this.opts.image, cpus: this.opts.cpus, command: opts.command, env: opts.env, detach: false });
    args[args.indexOf("--name") + 1] = name;
    const { exited } = run(args, (s, c) => {
      output += c;
      opts.onOutput(s, c);
    });
    const timer = setTimeout(() => {
      timedOut = true;
      void run(["rm", "-f", name]).exited;
    }, opts.timeoutMs);
    const { code } = await exited;
    clearTimeout(timer);
    return { exitCode: timedOut ? 124 : (code ?? 1), output: truncateOutput(output, this.opts.outputBytes).text, timedOut, durationMs: Date.now() - started };
  }

  async destroy(spec: SandboxSpec) {
    await run(["rm", "-f", containerName(spec.id)]).exited;
  }
}
