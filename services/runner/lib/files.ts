import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { resolveInside, safeRelativePath, PathError } from "./paths";
import { SANDBOX_PATHS } from "../sandbox/types";

export type FileMap = Record<string, string>;

export class FilesError extends Error {
  status = 400;
}

export function validateFileMap(files: unknown, limits: { maxFiles: number; maxFileBytes: number }): FileMap {
  if (!files || typeof files !== "object" || Array.isArray(files)) throw new FilesError("files must be an object of path → content");
  const entries = Object.entries(files as Record<string, unknown>);
  if (entries.length > limits.maxFiles) throw new FilesError(`Too many files (max ${limits.maxFiles})`);
  const out: FileMap = {};
  for (const [p, content] of entries) {
    if (typeof content !== "string") throw new FilesError(`File ${p} must be a string`);
    if (Buffer.byteLength(content, "utf8") > limits.maxFileBytes) throw new FilesError(`File ${p} exceeds ${limits.maxFileBytes} bytes`);
    let safe: string;
    try {
      safe = safeRelativePath(p);
    } catch (err) {
      throw new FilesError(`${p}: ${err instanceof PathError ? err.message : "invalid path"}`);
    }
    out[safe] = content;
  }
  return out;
}

/** Write one file atomically (temp file + rename) and create parent directories. */
export async function writeFileAtomic(root: string, rel: string, content: string, owner?: { uid: number; gid: number }): Promise<boolean> {
  const abs = resolveInside(root, rel);
  // Skip identical content so a full sync does not trigger spurious dev-server restarts.
  const existing = await fs.readFile(abs, "utf8").catch(() => null);
  if (existing === content) return false;
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  await fs.writeFile(tmp, content, "utf8");
  if (owner) await fs.chown(tmp, owner.uid, owner.gid).catch(() => {});
  await fs.rename(tmp, abs);
  if (owner) {
    // Parent directories created above are root-owned; hand them to the sandbox uid.
    let dir = path.dirname(abs);
    const rootAbs = path.resolve(root);
    while (dir.startsWith(rootAbs) && dir !== rootAbs) {
      await fs.chown(dir, owner.uid, owner.gid).catch(() => {});
      dir = path.dirname(dir);
    }
  }
  return true;
}

/** Write every file; returns how many actually changed on disk. */
export async function materialize(root: string, files: FileMap, owner?: { uid: number; gid: number }): Promise<number> {
  await fs.mkdir(root, { recursive: true });
  let changed = 0;
  for (const [rel, content] of Object.entries(files)) if (await writeFileAtomic(root, rel, content, owner)) changed++;
  return changed;
}

export async function deleteFiles(root: string, paths: string[]) {
  for (const rel of paths) {
    const abs = resolveInside(root, rel);
    await fs.rm(abs, { recursive: true, force: true });
  }
}

/**
 * Link the prebuilt base dependency set into <project>/node_modules as one
 * symlink per package (and the .bin directory). Per-package links (instead of
 * a single node_modules symlink) keep node_modules itself writable so tools
 * can create caches such as node_modules/.vite. The link targets are the
 * in-sandbox paths (/work/base/...), identical for every driver.
 */
export async function linkBaseNodeModules(projectDir: string, hostBaseDir: string, framework: string, owner: { uid: number; gid: number }): Promise<boolean> {
  const hostNm = path.join(hostBaseDir, framework, "node_modules");
  let entries: string[];
  try {
    entries = await fs.readdir(hostNm);
  } catch {
    return false;
  }
  const nm = path.join(projectDir, "node_modules");
  await fs.rm(nm, { recursive: true, force: true });
  await fs.mkdir(nm, { recursive: true });
  const target = `${SANDBOX_PATHS.base}/${framework}/node_modules`;
  for (const name of entries) {
    if (name === ".package-lock.json") continue;
    await fs.symlink(`${target}/${name}`, path.join(nm, name));
  }
  await fs.writeFile(path.join(nm, ".codexa-linked"), `${framework}\n`);
  await fs.chown(nm, owner.uid, owner.gid).catch(() => {});
  for (const name of entries) await fs.lchown(path.join(nm, name), owner.uid, owner.gid).catch(() => {});
  return true;
}

export async function readPackageScripts(projectDir: string): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(path.join(projectDir, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { scripts?: Record<string, unknown> };
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(pkg.scripts ?? {})) if (typeof v === "string") out[k] = v;
    return out;
  } catch {
    return {};
  }
}

/** Recursively copy a directory, skipping node_modules and VCS metadata. Returns file count. */
export async function copyTree(src: string, dest: string, opts: { skip?: (name: string) => boolean } = {}): Promise<number> {
  const skip = opts.skip ?? ((n) => n === "node_modules" || n === ".git");
  let count = 0;
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    if (skip(e.name)) continue;
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) count += await copyTree(s, d, opts);
    else if (e.isFile()) {
      await fs.copyFile(s, d);
      count++;
    }
    // symlinks are deliberately not copied into deployed sites
  }
  return count;
}

/**
 * True when every dependency named in the project's package.json exists in
 * the framework's prebuilt base set, i.e. no `npm install` is needed before
 * running or building. Version ranges are not compared: the base set is
 * installed from the template's own package.json, and projects that pin
 * other versions should run `install`, which gives them a private copy.
 */
export async function depsCoveredByBase(projectDir: string, hostBaseDir: string, framework: string): Promise<{ covered: boolean; missing: string[] }> {
  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } = {};
  try {
    pkg = JSON.parse(await fs.readFile(path.join(projectDir, "package.json"), "utf8"));
  } catch {
    return { covered: true, missing: [] };
  }
  const names = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
  const missing: string[] = [];
  for (const name of names) {
    if (!/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name)) {
      missing.push(name);
      continue;
    }
    const ok = await fs.stat(path.join(hostBaseDir, framework, "node_modules", name, "package.json")).then((s) => s.isFile()).catch(() => false);
    if (!ok) missing.push(name);
  }
  return { covered: missing.length === 0, missing };
}
