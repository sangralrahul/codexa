import path from "node:path";

export class PathError extends Error {}

/**
 * Normalise a project-relative file path and reject anything that could
 * escape the project directory (absolute paths, `..`, NUL bytes, backslashes,
 * node_modules and dotfile directories we manage ourselves).
 */
export function safeRelativePath(input: string): string {
  if (typeof input !== "string" || input.length === 0 || input.length > 512) throw new PathError("Invalid path");
  if (input.includes("\0")) throw new PathError("Invalid path");
  const cleaned = input.replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/^\.\//, "");
  if (cleaned.startsWith("/")) throw new PathError("Absolute paths are not allowed");
  if (/^[a-zA-Z]:/.test(cleaned)) throw new PathError("Invalid path");
  const parts = cleaned.split("/");
  if (parts.some((p) => p === "" || p === "." || p === "..")) throw new PathError("Path segments may not be empty, '.' or '..'");
  if (parts[0] === "node_modules" || parts.includes("node_modules")) throw new PathError("node_modules is managed by the runner");
  return parts.join("/");
}

/** Resolve `rel` under `root` and assert the result stays inside `root`. */
export function resolveInside(root: string, rel: string): string {
  const safe = safeRelativePath(rel);
  const abs = path.resolve(root, safe);
  const rootAbs = path.resolve(root);
  if (abs !== rootAbs && !abs.startsWith(rootAbs + path.sep)) throw new PathError("Path escapes the project directory");
  return abs;
}

/** Sandbox/session ids come from us, but they also end up in filesystem paths and cgroup names. */
export function isSafeId(id: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{3,63}$/.test(id);
}

/** DNS label used for site aliases (<slug>.<DEPLOY_HOST>) and preview tokens. */
export function isSafeLabel(label: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
}
