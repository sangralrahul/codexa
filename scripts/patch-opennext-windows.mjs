// OpenNext copies symlinked packages (here: `pg`, a serverExternalPackage) as
// symlinks. On Windows a directory symlink needs Developer Mode or admin
// rights, so `npm run cf:build` fails with EPERM. A junction needs neither,
// so on Windows we create junctions instead (absolute target, as junctions
// require). Idempotent; runs on postinstall. Remove once OpenNext does this.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const file = join(root, "node_modules", "@opennextjs", "aws", "dist", "build", "copyTracedFiles.js");
const before = "                symlinkSync(symlink, to);";
const after =
  '                symlinkSync(process.platform === "win32" ? path.resolve(path.dirname(from), symlink) : symlink, to, process.platform === "win32" ? "junction" : undefined); // patched by codexa: junctions need no privilege on Windows';

if (!existsSync(file)) {
  console.warn("[patch-opennext] @opennextjs/aws not installed; skipping");
  process.exit(0);
}
const src = readFileSync(file, "utf8");
if (src.includes(after)) process.exit(0);
if (!src.includes(before)) {
  console.warn("[patch-opennext] copyTracedFiles.js changed upstream; patch not applied (Windows builds may need Developer Mode)");
  process.exit(0);
}
writeFileSync(file, src.replace(before, after));
console.log("[patch-opennext] Windows-safe symlinks enabled");
