import "server-only";
import { getAllFiles, logActivity, writeFile } from "./projects";

/**
 * Direct visual edits: a change made by clicking an element in the preview is written straight
 * into the source when it can be located without guessing (exactly one match in the project).
 * Anything ambiguous is reported back as not applied, and the editor hands it to the AI agent
 * with the element's context instead. Nothing is ever written to a "best guess" location.
 */
export type VisualEdit = { kind: "text"; from: string; to: string } | { kind: "class"; from: string; to: string };
export type VisualEditResult = { applied: boolean; path?: string; reason?: "not_found" | "ambiguous" | "unsafe" | "unchanged" };

const SOURCE = /\.(tsx|jsx|ts|js|mjs|html|vue|svelte|astro|mdx?)$/;
const SKIP = /(^|\/)(node_modules|dist|build|\.next|\.git)\//;
/** Characters that could change the meaning of code when dropped into a string or JSX text. */
const UNSAFE = /[{}<>`\\"]/;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Hit = { path: string; index: number; length: number };

function findText(files: Record<string, string>, text: string): Hit[] {
  // Source may wrap a sentence over several lines: any whitespace run in the page matches any run in the code.
  const words = text.trim().split(/\s+/).map(escapeRe);
  if (!words.length || !words[0]) return [];
  const re = new RegExp(words.join("\\s+"), "g");
  const hits: Hit[] = [];
  for (const [path, content] of Object.entries(files)) {
    for (const m of content.matchAll(re)) hits.push({ path, index: m.index ?? 0, length: m[0].length });
    if (hits.length > 1) break;
  }
  return hits;
}

function findClass(files: Record<string, string>, classes: string): Hit[] {
  const re = new RegExp(`(["'\`])${escapeRe(classes)}\\1`, "g");
  const hits: Hit[] = [];
  for (const [path, content] of Object.entries(files)) {
    for (const m of content.matchAll(re)) hits.push({ path, index: (m.index ?? 0) + 1, length: classes.length });
    if (hits.length > 1) break;
  }
  return hits;
}

export async function applyVisualEdits(projectId: string, userId: string, edits: VisualEdit[]) {
  const all = await getAllFiles(projectId);
  const files: Record<string, string> = {};
  for (const [p, c] of Object.entries(all)) if (SOURCE.test(p) && !SKIP.test(p) && !/package-lock\.json$/.test(p)) files[p] = c;
  const before: Record<string, string> = {};
  const results: VisualEditResult[] = [];

  for (const edit of edits) {
    const from = edit.from.trim();
    const to = edit.kind === "text" ? edit.to.trim() : edit.to.replace(/\s+/g, " ").trim();
    if (!from || from === to) {
      results.push({ applied: false, reason: "unchanged" });
      continue;
    }
    if (UNSAFE.test(to) || (edit.kind === "class" && /['"`]/.test(to))) {
      results.push({ applied: false, reason: "unsafe" });
      continue;
    }
    const hits = edit.kind === "text" ? findText(files, from) : findClass(files, from);
    if (hits.length !== 1) {
      results.push({ applied: false, reason: hits.length ? "ambiguous" : "not_found" });
      continue;
    }
    const { path, index, length } = hits[0];
    // An apostrophe is fine in JSX text and "double-quoted" strings, but would end a 'single-quoted' one.
    const lineStart = files[path].lastIndexOf("\n", index) + 1;
    if (to.includes("'") && (files[path].slice(lineStart, index).match(/'/g)?.length ?? 0) % 2 === 1) {
      results.push({ applied: false, reason: "unsafe" });
      continue;
    }
    before[path] ??= files[path];
    files[path] = files[path].slice(0, index) + to + files[path].slice(index + length);
    results.push({ applied: true, path });
  }

  const changed = Object.keys(before);
  for (const path of changed) await writeFile(projectId, path, files[path]);
  if (changed.length) await logActivity(projectId, userId, "file.updated", `Visual edit in ${changed.join(", ")}`, { paths: changed, visual: true });
  return { results, changed, before };
}
