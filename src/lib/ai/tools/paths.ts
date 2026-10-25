/**
 * Pure path safety helpers for AI tools. Mirrors the rules enforced by
 * `normalizePath()` in the projects service but never throws ApiErrors, so the
 * agent can turn a bad path into a tool error the model can recover from.
 */
export class ToolPathError extends Error {}

export const MAX_PATH_LENGTH = 512;

/** Files the AI may never read, search or write (project secrets). */
const DENY_BASENAMES = /^(\.env(\..*)?|.*\.pem|.*\.key|id_rsa|id_ed25519)$/i;

export function safePath(input: unknown): string {
  if (typeof input !== "string") throw new ToolPathError("path must be a string");
  const cleaned = input.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/{2,}/g, "/").replace(/^\.\//, "");
  if (!cleaned || cleaned.length > MAX_PATH_LENGTH) throw new ToolPathError("Invalid file path");
  const parts = cleaned.split("/");
  if (parts.some((s) => s === "." || s === ".." || s === "")) throw new ToolPathError(`Invalid file path: ${input}`);
  // eslint-disable-next-line no-control-regex
  if (/[\0<>:"|?*]/.test(cleaned)) throw new ToolPathError("Invalid characters in file path");
  if (cleaned.startsWith("node_modules/") || cleaned.includes("/node_modules/")) throw new ToolPathError("node_modules is not part of the project");
  return cleaned;
}

export function isSecretPath(path: string): boolean {
  const base = path.split("/").pop() ?? path;
  return DENY_BASENAMES.test(base);
}

/** Returns the normalized path or throws when the path points at a secret file. */
export function safeReadablePath(input: unknown): string {
  const p = safePath(input);
  if (isSecretPath(p)) throw new ToolPathError(`Refusing to access ${p}: secret files are not available to the AI`);
  return p;
}
