/**
 * One-time host preparation for the runner:
 *   - creates the RUNNER_DATA_DIR layout (sandboxes/, sites/, base/, bin/)
 *   - installs the prebuilt base dependency sets that sandboxes link to
 *     (base/vite-react and base/node-express), using the exact package.json
 *     of the corresponding project template so templates run without a
 *     per-project `npm install`
 *   - chowns everything to the sandbox uid and writes base/manifest.json
 *
 * Run with: npm run runner:prepare   (needs network access to the npm registry)
 */
import { config as loadDotenv } from "dotenv";
import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(here, "../../.env") });

import { loadConfig, PREBUILT_FRAMEWORKS, type PrebuiltFramework } from "./config";
import { ensureLayout } from "./lib/layout";
import { viteReactTemplates } from "../../src/templates/vite-react";
import { nodeExpressTemplates } from "../../src/templates/node-express";

type PackageJson = { name?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

function templatePackageJson(framework: PrebuiltFramework): PackageJson {
  const list = framework === "vite-react" ? viteReactTemplates : nodeExpressTemplates;
  const raw = list[0]?.files["package.json"];
  if (!raw) throw new Error(`Template for ${framework} has no package.json`);
  const parsed = JSON.parse(raw) as PackageJson;
  return { dependencies: parsed.dependencies ?? {}, devDependencies: parsed.devDependencies ?? {} };
}

function run(cmd: string, args: string[], cwd: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit", env: process.env });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function installedVersions(nodeModules: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  let entries: string[] = [];
  try {
    entries = await fs.readdir(nodeModules);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name.startsWith(".")) continue;
    const dirs = name.startsWith("@") ? (await fs.readdir(path.join(nodeModules, name))).map((n) => `${name}/${n}`) : [name];
    for (const pkg of dirs) {
      try {
        const pj = JSON.parse(await fs.readFile(path.join(nodeModules, pkg, "package.json"), "utf8")) as { version?: string };
        if (pj.version) out[pkg] = pj.version;
      } catch {
        /* not a package dir */
      }
    }
  }
  return out;
}

async function chownRecursive(dir: string, uid: number, gid: number) {
  // chown -R is dramatically faster than walking node_modules from Node.
  const code = await run("chown", ["-R", `${uid}:${gid}`, dir], dir);
  if (code !== 0) throw new Error(`chown -R failed with code ${code}`);
}

async function main() {
  const cfg = loadConfig();
  await ensureLayout(cfg);
  const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const frameworks = (only.length ? only : [...PREBUILT_FRAMEWORKS]) as PrebuiltFramework[];
  const manifest: Record<string, { installedAt: string; nodeVersion: string; packages: Record<string, string> }> = {};
  const manifestPath = path.join(cfg.baseDir, "manifest.json");
  try {
    Object.assign(manifest, JSON.parse(await fs.readFile(manifestPath, "utf8")));
  } catch {
    /* fresh */
  }

  for (const fw of frameworks) {
    if (!PREBUILT_FRAMEWORKS.includes(fw)) throw new Error(`Unknown framework ${fw}`);
    const dir = path.join(cfg.baseDir, fw);
    await fs.mkdir(dir, { recursive: true });
    const pkg = { name: `codexa-base-${fw}`, private: true, version: "0.0.0", ...templatePackageJson(fw) };
    await fs.writeFile(path.join(dir, "package.json"), JSON.stringify(pkg, null, 2));
    console.log(`[prepare] installing base dependencies for ${fw} in ${dir}`);
    const code = await run("npm", ["install", "--include=dev", "--no-audit", "--no-fund", "--loglevel=warn"], dir);
    if (code !== 0) throw new Error(`npm install for ${fw} failed with exit code ${code}`);
    await chownRecursive(dir, cfg.uid, cfg.gid);
    manifest[fw] = {
      installedAt: new Date().toISOString(),
      nodeVersion: process.version,
      packages: await installedVersions(path.join(dir, "node_modules")),
    };
    console.log(`[prepare] ${fw}: ${Object.keys(manifest[fw].packages).length} packages`);
  }
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  await fs.chown(manifestPath, cfg.uid, cfg.gid);
  console.log(`[prepare] done. manifest: ${manifestPath}`);
}

main().catch((err) => {
  console.error("[prepare] failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
