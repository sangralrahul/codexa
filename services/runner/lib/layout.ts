import fs from "node:fs/promises";
import path from "node:path";
import type { RunnerConfig } from "../config";

/**
 * Create the RUNNER_DATA_DIR layout. Directory modes matter: the sandbox uid
 * must be able to traverse into its own sandbox directory and read bin/ and
 * base/, but must not be able to list other sandboxes.
 *
 *   <data>/            0755  root
 *   <data>/bin/        0755  root   helper scripts (init script, static server)
 *   <data>/base/       0755  sbx    prebuilt node_modules per framework
 *   <data>/sandboxes/  0711  root   one directory per session (owned by sbx uid)
 *   <data>/sites/      0755  root   deployed static sites + aliases.json
 */
export async function ensureLayout(cfg: RunnerConfig) {
  await fs.mkdir(cfg.dataDir, { recursive: true, mode: 0o755 });
  await fs.chmod(cfg.dataDir, 0o755);
  for (const [dir, mode] of [
    [cfg.binDir, 0o755],
    [cfg.baseDir, 0o755],
    [cfg.sandboxesDir, 0o711],
    [cfg.sitesDir, 0o755],
  ] as const) {
    await fs.mkdir(dir, { recursive: true, mode });
    await fs.chmod(dir, mode);
  }
  return path.resolve(cfg.dataDir);
}
