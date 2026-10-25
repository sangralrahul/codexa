/**
 * Codexa static hosting pipeline: build inside a throwaway sandbox, validate
 * the output directory, copy it to <data>/sites/<deploymentId> and point the
 * <slug> alias at it. Aliases live in sites/aliases.json so a rollback is a
 * single atomic file write.
 */
import fs from "node:fs/promises";
import path from "node:path";
import type { RunnerConfig } from "./config";
import { PREBUILT_FRAMEWORKS, KNOWN_FRAMEWORKS, type Framework } from "./config";
import { HttpError } from "./http";
import { copyTree, depsCoveredByBase, linkBaseNodeModules, materialize, readPackageScripts, validateFileMap, FilesError } from "./lib/files";
import { installPrelude } from "./lib/allowlist";
import { isSafeId, isSafeLabel, resolveInside } from "./lib/paths";
import { LogBuffer } from "./lib/ring-buffer";
import { SANDBOX_PATHS, type SandboxDriver, type SandboxSpec } from "./sandbox/types";
import { proxyPassthrough, type ProjectSettings } from "./sessions";

export type DeployInput = {
  projectId: string;
  deploymentId: string;
  framework: string;
  settings?: ProjectSettings;
  files: unknown;
  slug: string;
};

export type DeployResult = { url: string; log: string; fileCount: number; durationMs: number };

const DEFAULT_BUILD: Record<Framework, { command: string | null; outputDir: string }> = {
  "vite-react": { command: "npm run build", outputDir: "dist" },
  static: { command: null, outputDir: "." },
  "node-express": { command: null, outputDir: "." }, // no static output; refused below
  nextjs: { command: null, outputDir: ".next" },
};

export class DeploymentManager {
  private aliasesPath: string;
  private writing: Promise<void> = Promise.resolve();

  constructor(
    private readonly cfg: RunnerConfig,
    private readonly driver: SandboxDriver,
  ) {
    this.aliasesPath = path.join(cfg.sitesDir, "aliases.json");
  }

  siteUrl(slug: string) {
    const port = this.cfg.publicPreviewPort;
    return `${this.cfg.previewProtocol}://${slug}.${this.cfg.deployHost}${port && port !== (this.cfg.previewProtocol === "https" ? 443 : 80) ? `:${port}` : ""}/`;
  }

  async readAliases(): Promise<Record<string, string>> {
    try {
      return JSON.parse(await fs.readFile(this.aliasesPath, "utf8")) as Record<string, string>;
    } catch {
      return {};
    }
  }

  async resolveSlug(slug: string): Promise<string | null> {
    if (!isSafeLabel(slug)) return null;
    const aliases = await this.readAliases();
    const target = aliases[slug];
    if (!target || !isSafeId(target)) return null;
    try {
      const st = await fs.stat(path.join(this.cfg.sitesDir, target));
      return st.isDirectory() ? target : null;
    } catch {
      return null;
    }
  }

  siteDir(deploymentId: string) {
    return path.join(this.cfg.sitesDir, deploymentId);
  }

  async setAlias(slug: string, deploymentId: string): Promise<{ slug: string; deploymentId: string; url: string }> {
    if (!isSafeLabel(slug)) throw new HttpError(400, "slug must be a DNS label (lowercase letters, digits, hyphens)");
    if (!isSafeId(deploymentId)) throw new HttpError(400, "Invalid deploymentId");
    const dir = this.siteDir(deploymentId);
    const exists = await fs.stat(dir).then((s) => s.isDirectory()).catch(() => false);
    if (!exists) throw new HttpError(404, "Deployment output not found on this runner", "not_found");
    // Serialise writers so concurrent deploys never clobber each other's alias.
    this.writing = this.writing.then(async () => {
      const aliases = await this.readAliases();
      aliases[slug] = deploymentId;
      const tmp = `${this.aliasesPath}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(aliases, null, 2));
      await fs.rename(tmp, this.aliasesPath);
    });
    await this.writing;
    return { slug, deploymentId, url: this.siteUrl(slug) };
  }

  async readLog(deploymentId: string): Promise<string | null> {
    if (!isSafeId(deploymentId)) return null;
    try {
      return await fs.readFile(path.join(this.cfg.sitesDir, `${deploymentId}.log`), "utf8");
    } catch {
      return null;
    }
  }

  async deploy(input: DeployInput): Promise<DeployResult> {
    const started = Date.now();
    if (!input.projectId || typeof input.projectId !== "string") throw new HttpError(400, "projectId is required");
    if (!isSafeId(input.deploymentId)) throw new HttpError(400, "deploymentId must be a safe identifier");
    if (!isSafeLabel(input.slug)) throw new HttpError(400, "slug must be a DNS label");
    if (!KNOWN_FRAMEWORKS.includes(input.framework as Framework)) throw new HttpError(400, `Unsupported framework "${input.framework}"`);
    const framework = input.framework as Framework;
    if (framework === "node-express" || framework === "nextjs") {
      throw new HttpError(400, `Codexa static hosting cannot serve ${framework} projects (they need a long-running server). Use the Vercel provider or export a static build.`);
    }
    let files;
    try {
      files = validateFileMap(input.files, this.cfg.limits);
    } catch (err) {
      throw new HttpError(400, err instanceof FilesError ? err.message : "Invalid files");
    }
    const settings = input.settings ?? {};
    const log = new LogBuffer(4000);
    const id = `d${input.deploymentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40)}`;
    const dir = path.join(this.cfg.sandboxesDir, id);
    const projectDir = path.join(dir, "project");
    const owner = { uid: this.cfg.uid, gid: this.cfg.gid };
    const spec: SandboxSpec = { id, dir, projectDir, baseDir: this.cfg.baseDir, binDir: this.cfg.binDir, uid: this.cfg.uid, gid: this.cfg.gid, limits: this.cfg.limits, ports: [] };
    const siteDir = this.siteDir(input.deploymentId);
    const persistLog = async () => {
      await fs.writeFile(path.join(this.cfg.sitesDir, `${input.deploymentId}.log`), log.text()).catch(() => {});
    };
    try {
      await fs.rm(dir, { recursive: true, force: true });
      await fs.mkdir(projectDir, { recursive: true, mode: 0o755 });
      await materialize(projectDir, files, owner);
      log.push("system", `Materialised ${Object.keys(files).length} files (${framework})`);
      const defaults = DEFAULT_BUILD[framework];
      const buildCommand = settings.buildCommand?.trim() || defaults.command;
      const outputDir = settings.outputDir?.trim() || defaults.outputDir;
      if (buildCommand) {
        const prebuilt = (PREBUILT_FRAMEWORKS as readonly string[]).includes(framework);
        let linked = false;
        if (prebuilt) {
          linked = await linkBaseNodeModules(projectDir, this.cfg.baseDir, framework, owner);
          log.push("system", linked ? `Linked prebuilt ${framework} dependencies` : `No prebuilt dependency set for ${framework}`);
        }
        await this.driver.prepare(spec);
        const scripts = await readPackageScripts(projectDir);
        // Install only when the project needs packages the base set does not have
        // (or there is no base set at all); otherwise the linked set is enough.
        const coverage = linked ? await depsCoveredByBase(projectDir, this.cfg.baseDir, framework) : { covered: false, missing: [] };
        let needsInstall: string | null = null;
        if (!coverage.covered) {
          needsInstall = installPrelude(linked ? `${SANDBOX_PATHS.base}/${framework}/node_modules` : null) + (settings.installCommand?.trim() || "npm install --no-audit --no-fund --loglevel=warn");
          if (coverage.missing.length) log.push("system", `Dependencies not in the prebuilt set: ${coverage.missing.join(", ")}`);
        } else {
          log.push("system", "All dependencies are covered by the prebuilt set; skipping install");
        }
        if (needsInstall) {
          log.push("system", `$ ${needsInstall}`);
          const r = await this.driver.exec(spec, { command: needsInstall, env: buildEnv(), timeoutMs: this.cfg.limits.buildTimeoutMs, onOutput: (s, c) => log.write(s, c) });
          log.flush();
          if (r.exitCode !== 0) throw new HttpError(422, `Install failed with exit code ${r.exitCode}`, "build_failed");
        }
        if (buildCommand === "npm run build" && !scripts.build) throw new HttpError(422, "package.json has no build script", "build_failed");
        log.push("system", `$ ${buildCommand}`);
        const r = await this.driver.exec(spec, { command: buildCommand, env: buildEnv(), timeoutMs: this.cfg.limits.buildTimeoutMs, onOutput: (s, c) => log.write(s, c) });
        log.flush();
        if (r.timedOut) throw new HttpError(422, `Build timed out after ${Math.round(this.cfg.limits.buildTimeoutMs / 1000)}s`, "build_failed");
        if (r.exitCode !== 0) throw new HttpError(422, `Build failed with exit code ${r.exitCode}`, "build_failed");
        log.push("system", `Build finished in ${r.durationMs}ms`);
      } else {
        log.push("system", "No build step: publishing project files as-is");
      }
      let outAbs: string;
      try {
        outAbs = outputDir === "." || outputDir === "" ? projectDir : resolveInside(projectDir, outputDir);
      } catch {
        throw new HttpError(422, `Invalid outputDir "${outputDir}"`, "build_failed");
      }
      const st = await fs.stat(outAbs).catch(() => null);
      if (!st?.isDirectory()) throw new HttpError(422, `Output directory "${outputDir}" was not produced by the build`, "build_failed");
      const hasIndex = await fs.stat(path.join(outAbs, "index.html")).then((s) => s.isFile()).catch(() => false);
      if (!hasIndex) throw new HttpError(422, `Output directory "${outputDir}" has no index.html`, "build_failed");
      await fs.rm(siteDir, { recursive: true, force: true });
      const fileCount = await copyTree(outAbs, siteDir);
      if (fileCount === 0) throw new HttpError(422, "Build produced no files", "build_failed");
      log.push("system", `Published ${fileCount} files`);
      const alias = await this.setAlias(input.slug, input.deploymentId);
      log.push("system", `Live at ${alias.url}`);
      await persistLog();
      return { url: alias.url, log: log.text(), fileCount, durationMs: Date.now() - started };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.push("system", `Deployment failed: ${msg}`);
      await persistLog();
      await fs.rm(siteDir, { recursive: true, force: true }).catch(() => {});
      if (err instanceof HttpError) {
        (err as HttpError & { log?: string }).log = log.text();
        throw err;
      }
      const wrapped = new HttpError(500, msg, "build_failed") as HttpError & { log?: string };
      wrapped.log = log.text();
      throw wrapped;
    } finally {
      await this.driver.destroy(spec).catch(() => {});
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

function buildEnv(): Record<string, string> {
  return { ...proxyPassthrough(), NODE_ENV: "production", CI: "1", NO_COLOR: "1", HOME: SANDBOX_PATHS.home };
}
