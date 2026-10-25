// Copies the Monaco editor AMD bundle into public/ so the editor loads from
// our own origin (no CDN dependency). Runs on postinstall.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "node_modules", "monaco-editor", "min", "vs");
const dest = join(root, "public", "monaco", "vs");
if (!existsSync(src)) {
  console.warn("[copy-monaco] monaco-editor not installed; skipping");
  process.exit(0);
}
rmSync(dest, { recursive: true, force: true });
mkdirSync(dirname(dest), { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("[copy-monaco] copied to public/monaco/vs");
