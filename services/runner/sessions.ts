/**
 * Session manager: one sandbox per running preview. Owns the lifecycle
 * (materialise → link deps → spawn dev server → sync/exec → stop), the log
 * ring buffer, port allocation and the idle/age sweeper.
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { RunnerConfig } from "./config";
import { PREBUILT_FRAMEWORKS, KNOWN_FRAMEWORKS, type Framework } from "./config";
import { HttpError } from "./http";
import { hostFor } from "../../src/lib/hosts";
import { EXEC_COMMANDS, resolveExec, type ExecCommand } from "./lib/allowlist";
import { deleteFiles, linkBaseNodeModules, materialize, readPackageScripts, validateFileMap, FilesError, type FileMap } from "./lib/files";
import { isSafeLabel, PathError, safeRelativePath } from "./lib/paths";
import { PortAllocator, waitForPort } from "./lib/ports";
import { LogBuffer } from "./lib/ring-buffer";
import type { SandboxDriver, SandboxProcess, SandboxSpec } from "./sandbox/types";
import { SANDBOX_PATHS } from "./sandbox/types";

export type SessionStatus = "starting" | "running" | "exited" | "error" | "stopped";

export type ProjectSettings = { devCommand?: string; buildCommand?: string; installCommand?: string; outputDir?: string; port?: number };

export type Session = {
  id: string;
  projectId: string;
  framework: Framework;
  settings: ProjectSettings;
  previewToken: string;
  previewUrl: string;
  port: number;
  status: SessionStatus;
  startedAt: number;
  readyAt: number | null;
  lastActivityAt: number;
  exitCode: number | null;
  error: string | null;
  logs: LogBuffer;
  env: Record<string, string>;
  spec: SandboxSpec;
  proc: SandboxProcess | null;
  execRunning: boolean;
  stopping: boolean;
};

export type SessionView = {
  id: string;
  projectId: string;
  framework: Framework;
  status: SessionStatus;
  port: number;
  previewUrl: string;
  startedAt: string;
  readyAt: string | null;
  lastActivityAt: string;
  exitCode: number | null;
  error: string | null;
  uptimeMs: number;
};

export type CreateSessionInput = {
  projectId: string;
  framework: string;
  settings?: ProjectSettings;
  files: unknown;
  env?: Record<string, string>;
  previewToken: string;
};

const DEV_COMMANDS: Record<Framework, string> = {
  "vite-react": "npm run dev",
  static: `node ${SANDBOX_PATHS.bin}/static-server.cjs`,
  "node-express": "npm run dev",
  nextjs: "npm run dev",
};

export function newId(prefix = "s"): string {
  return `${prefix}${crypto.randomBytes(8).toString("hex")}`;
}

/** Only POSIX-style keys; values are strings; runner-controlled keys cannot be overridden. */
export function sanitizeEnv(env: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!env || typeof env !== "object") return out;
  for (const [k, v] of Object.entries(env as Record<string, unknown>)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(k)) continue;
    if (typeof v !== "string" || v.length > 10_000) continue;
    if (/^(PATH|HOME|PORT|HOST|CODEXA_|LD_|NODE_OPTIONS$)/.test(k)) continue;
    out[k] = v;
  }
  return out;
}

export class SessionManager {
  private sessions = new Map<string, Session>();
  private byToken = new Map<string, Session>();
  private ports: PortAllocator;
  private sweeper: NodeJS.Timeout | null = null;

  constructor(
    private readonly cfg: RunnerConfig,
    private readonly driver: SandboxDriver,
  ) {
    this.ports = new PortAllocator(cfg.portRange[0], cfg.portRange[1]);
  }

  list(): SessionView[] {
    return [...this.sessions.values()].map(view);
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  getByToken(token: string): Session | undefined {
    return this.byToken.get(token);
  }

  stats() {
    const counts: Record<SessionStatus, number> = { starting: 0, running: 0, exited: 0, error: 0, stopped: 0 };
    for (const s of this.sessions.values()) counts[s.status]++;
    return { total: this.sessions.size, counts, portsInUse: this.ports.inUse };
  }

  touch(session: Session) {
    session.lastActivityAt = Date.now();
  }

  async create(input: CreateSessionInput): Promise<Session> {
    if (!input.projectId || typeof input.projectId !== "string") throw new HttpError(400, "projectId is required");
    if (!KNOWN_FRAMEWORKS.includes(input.framework as Framework)) throw new HttpError(400, `Unsupported framework "${input.framework}"`);
    const framework = input.framework as Framework;
    if (framework === "nextjs") throw new HttpError(400, "Next.js projects are not supported by this runner build yet (no prebuilt base set)");
    if (!isSafeLabel(input.previewToken) || input.previewToken.length < 16) throw new HttpError(400, "previewToken must be a DNS-safe label of at least 16 characters");
    if (this.byToken.has(input.previewToken)) throw new HttpError(409, "previewToken already in use");
    let files: FileMap;
    try {
      files = validateFileMap(input.files, this.cfg.limits);
    } catch (err) {
      throw new HttpError(400, err instanceof FilesError ? err.message : "Invalid files");
    }
    const settings = input.settings && typeof input.settings === "object" ? input.settings : {};
    const id = newId("s");
    const dir = path.join(this.cfg.sandboxesDir, id);
    const projectDir = path.join(dir, "project");
    const owner = { uid: this.cfg.uid, gid: this.cfg.gid };
    const port = await this.ports.allocate();
    const logs = new LogBuffer(this.cfg.limits.logLines);
    const spec: SandboxSpec = {
      id,
      dir,
      projectDir,
      baseDir: this.cfg.baseDir,
      binDir: this.cfg.binDir,
      uid: this.cfg.uid,
      gid: this.cfg.gid,
      limits: this.cfg.limits,
      ports: [port],
    };
    const hostLabel = hostFor(input.previewToken, this.cfg.previewHost);
    const publicPort = this.cfg.publicPreviewPort;
    const previewUrl = `${this.cfg.previewProtocol}://${hostLabel}${publicPort && publicPort !== (this.cfg.previewProtocol === "https" ? 443 : 80) ? `:${publicPort}` : ""}/`;
    const env: Record<string, string> = {
      ...sanitizeEnv(input.env),
      ...proxyPassthrough(),
      PORT: String(port),
      HOST: "0.0.0.0",
      NODE_ENV: "development",
      CI: "1",
      BROWSER: "none",
      NO_COLOR: "1",
      CODEXA_PREVIEW_HOST: hostLabel,
      CODEXA_PREVIEW_PORT: String(publicPort ?? (this.cfg.previewProtocol === "https" ? 443 : 80)),
      CODEXA_PREVIEW_URL: previewUrl,
      STATIC_ROOT: SANDBOX_PATHS.project,
    };
    const session: Session = {
      id,
      projectId: input.projectId,
      framework,
      settings,
      previewToken: input.previewToken,
      previewUrl,
      port,
      status: "starting",
      startedAt: Date.now(),
      readyAt: null,
      lastActivityAt: Date.now(),
      exitCode: null,
      error: null,
      logs,
      env,
      spec,
      proc: null,
      execRunning: false,
      stopping: false,
    };
    this.sessions.set(id, session);
    this.byToken.set(input.previewToken, session);
    try {
      await fs.mkdir(projectDir, { recursive: true, mode: 0o755 });
      await materialize(projectDir, files, owner);
      logs.push("system", `Materialised ${Object.keys(files).length} files (${framework})`);
      if ((PREBUILT_FRAMEWORKS as readonly string[]).includes(framework)) {
        const linked = await linkBaseNodeModules(projectDir, this.cfg.baseDir, framework, owner);
        logs.push("system", linked ? `Linked prebuilt ${framework} dependencies (run "install" to add custom packages)` : `No prebuilt dependency set for ${framework}: run "npm run runner:prepare" on the host`);
      }
      await this.driver.prepare(spec);
      const command = framework === "static" ? DEV_COMMANDS.static : settings.devCommand?.trim() || DEV_COMMANDS[framework];
      logs.push("system", `$ ${command}   (PORT=${port})`);
      const proc = await this.driver.spawn(spec, { command, env, onOutput: (stream, chunk) => logs.write(stream, chunk) });
      session.proc = proc;
      void proc.exited.then(({ code, signal }) => {
        logs.flush();
        if (session.stopping) return;
        session.exitCode = code;
        session.status = code === 0 ? "exited" : "error";
        session.error = code === 0 ? null : `Dev server exited with ${signal ? `signal ${signal}` : `code ${code}`}`;
        logs.push("system", session.error ?? "Dev server exited");
      });
      void waitForPort(port, 120_000, { get aborted() { return session.status !== "starting"; } }).then((ok) => {
        if (session.status !== "starting") return;
        if (ok) {
          session.status = "running";
          session.readyAt = Date.now();
          logs.push("system", `Preview ready at ${previewUrl}`);
        } else {
          session.status = "error";
          session.error = `Dev server did not open port ${port} within 120s`;
          logs.push("system", session.error);
        }
      });
      return session;
    } catch (err) {
      session.status = "error";
      session.error = err instanceof Error ? err.message : String(err);
      logs.push("system", `Failed to start: ${session.error}`);
      await this.stop(id).catch(() => {});
      throw err instanceof HttpError ? err : new HttpError(500, session.error);
    }
  }

  async sync(id: string, input: { files?: unknown; deletes?: unknown }): Promise<{ written: number; deleted: number }> {
    const s = this.mustGet(id);
    const owner = { uid: this.cfg.uid, gid: this.cfg.gid };
    let files: FileMap = {};
    if (input.files !== undefined) {
      try {
        files = validateFileMap(input.files, this.cfg.limits);
      } catch (err) {
        throw new HttpError(400, err instanceof FilesError ? err.message : "Invalid files");
      }
    }
    const deletes: string[] = [];
    if (input.deletes !== undefined) {
      if (!Array.isArray(input.deletes)) throw new HttpError(400, "deletes must be an array of paths");
      for (const p of input.deletes) {
        try {
          deletes.push(safeRelativePath(String(p)));
        } catch (err) {
          throw new HttpError(400, `${p}: ${err instanceof PathError ? err.message : "invalid path"}`);
        }
      }
    }
    const written = await materialize(s.spec.projectDir, files, owner);
    await deleteFiles(s.spec.projectDir, deletes);
    this.touch(s);
    if (written || deletes.length) s.logs.push("system", `Synced ${written} changed file(s)${deletes.length ? `, deleted ${deletes.length}` : ""}`);
    return { written, deleted: deletes.length };
  }

  async exec(id: string, command: unknown, opts: { timeoutMs?: number } = {}) {
    const s = this.mustGet(id);
    if (!EXEC_COMMANDS.includes(command as ExecCommand)) throw new HttpError(400, `command must be one of ${EXEC_COMMANDS.join(", ")}`);
    if (s.execRunning) throw new HttpError(409, "Another command is already running in this sandbox");
    const scripts = await readPackageScripts(s.spec.projectDir);
    const base = (PREBUILT_FRAMEWORKS as readonly string[]).includes(s.framework) ? `${SANDBOX_PATHS.base}/${s.framework}/node_modules` : null;
    const spec = resolveExec(command as ExecCommand, {
      framework: s.framework,
      settings: s.settings,
      scripts,
      execTimeoutMs: this.cfg.limits.execTimeoutMs,
      buildTimeoutMs: this.cfg.limits.buildTimeoutMs,
      baseNodeModules: base,
      hasTsconfig: await fs.stat(path.join(s.spec.projectDir, "tsconfig.json")).then((st) => st.isFile()).catch(() => false),
    });
    if (!spec) {
      return { exitCode: 0, output: `Nothing to do: "${command}" does not apply to this ${s.framework} project.`, timedOut: false, durationMs: 0, skipped: true };
    }
    const timeoutMs = Math.min(Math.max(opts.timeoutMs ?? spec.timeoutMs, 1000), this.cfg.limits.buildTimeoutMs);
    s.execRunning = true;
    this.touch(s);
    s.logs.push("system", `$ ${spec.shell}`);
    try {
      const result = await this.driver.exec(s.spec, {
        command: spec.shell,
        env: { ...s.env, NODE_ENV: command === "build" ? "production" : "development" },
        timeoutMs,
        onOutput: (stream, chunk) => s.logs.write(stream, chunk),
      });
      s.logs.flush();
      s.logs.push("system", result.timedOut ? `${spec.description} timed out after ${Math.round(timeoutMs / 1000)}s` : `${spec.description} finished with exit code ${result.exitCode} in ${result.durationMs}ms`);
      this.touch(s);
      return { ...result, skipped: false };
    } finally {
      s.execRunning = false;
    }
  }

  async stop(id: string): Promise<boolean> {
    const s = this.sessions.get(id);
    if (!s) return false;
    if (s.stopping) return true;
    s.stopping = true;
    s.status = "stopped";
    s.logs.push("system", "Stopping sandbox");
    try {
      await s.proc?.kill();
    } catch {
      /* ignore */
    }
    await this.driver.destroy(s.spec).catch((err) => console.error("[runner] destroy failed", err));
    await fs.rm(s.spec.dir, { recursive: true, force: true }).catch((err) => console.error("[runner] rm failed", err));
    this.ports.release(s.port);
    this.sessions.delete(id);
    this.byToken.delete(s.previewToken);
    return true;
  }

  async stopAll() {
    await Promise.all([...this.sessions.keys()].map((id) => this.stop(id)));
  }

  startSweeper(intervalMs = 60_000) {
    this.sweeper = setInterval(() => void this.sweep(), intervalMs);
    this.sweeper.unref();
  }

  stopSweeper() {
    if (this.sweeper) clearInterval(this.sweeper);
  }

  async sweep(now = Date.now()) {
    const stopped: string[] = [];
    for (const s of [...this.sessions.values()]) {
      const idle = now - s.lastActivityAt;
      const age = now - s.startedAt;
      let reason: string | null = null;
      if (idle > this.cfg.limits.idleTimeoutMs) reason = `idle for ${Math.round(idle / 60_000)} min`;
      else if (age > this.cfg.limits.maxSessionAgeMs) reason = `older than ${Math.round(this.cfg.limits.maxSessionAgeMs / 3_600_000)} h`;
      else if ((s.status === "exited" || s.status === "error") && now - s.lastActivityAt > 10 * 60_000) reason = "dev server exited";
      if (reason) {
        s.logs.push("system", `Sweeper stopping session (${reason})`);
        await this.stop(s.id);
        stopped.push(s.id);
      }
    }
    // Orphaned sandbox directories from a previous runner process.
    try {
      for (const name of await fs.readdir(this.cfg.sandboxesDir)) {
        if (!this.sessions.has(name) && !name.startsWith("d")) await fs.rm(path.join(this.cfg.sandboxesDir, name), { recursive: true, force: true }).catch(() => {});
      }
    } catch {
      /* ignore */
    }
    return stopped;
  }

  private mustGet(id: string): Session {
    const s = this.sessions.get(id);
    if (!s) throw new HttpError(404, "Session not found", "not_found");
    return s;
  }
}

export function view(s: Session): SessionView {
  return {
    id: s.id,
    projectId: s.projectId,
    framework: s.framework,
    status: s.status,
    port: s.port,
    previewUrl: s.previewUrl,
    startedAt: new Date(s.startedAt).toISOString(),
    readyAt: s.readyAt ? new Date(s.readyAt).toISOString() : null,
    lastActivityAt: new Date(s.lastActivityAt).toISOString(),
    exitCode: s.exitCode,
    error: s.error,
    uptimeMs: Date.now() - s.startedAt,
  };
}

/**
 * Development convenience: when the runner host itself must reach the npm
 * registry through an HTTP proxy with a private CA (as in CI containers),
 * forward those settings so `install` works inside the sandbox too. Only
 * proxy-related variables are forwarded, never arbitrary host env.
 */
export function proxyPassthrough(): Record<string, string> {
  if (process.env.RUNNER_FORWARD_PROXY_ENV !== "1") return {};
  const out: Record<string, string> = {};
  for (const k of ["HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy"]) {
    const v = process.env[k];
    if (v) out[k] = v;
  }
  if (process.env.RUNNER_SANDBOX_CA_FILE) {
    out.NODE_EXTRA_CA_CERTS = process.env.RUNNER_SANDBOX_CA_FILE;
    out.npm_config_cafile = process.env.RUNNER_SANDBOX_CA_FILE;
    out.SSL_CERT_FILE = process.env.RUNNER_SANDBOX_CA_FILE;
  }
  return out;
}
