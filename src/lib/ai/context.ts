import "server-only";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { generationRuns, type Project } from "@/db/schema";
import { listFiles, readFile } from "@/lib/services/projects";
import { getRuntimeLogs, getRuntimeStatus } from "@/lib/runtime/exec";
import { FRAMEWORKS } from "@/templates";
import { isSecretPath } from "./tools/paths";
import { truncateMiddle, truncateTail } from "./tools/truncate";

/** Character budget for file excerpts in the initial context (~ 6k tokens). */
export const CONTEXT_FILE_BUDGET = 24_000;
const MAX_TREE_ENTRIES = 400;
const KEY_FILES = ["package.json", "src/App.tsx", "src/main.tsx", "index.html", "src/index.ts", "src/server.ts", "server.ts", "app/page.tsx", "src/app/page.tsx", "src/index.css", "README.md"];

export type ProjectContext = {
  framework: string;
  frameworkName: string;
  settings: Record<string, unknown>;
  tree: string;
  fileCount: number;
  excerpts: { path: string; content: string }[];
  lastError: string | null;
  runtime: { available: boolean; status: string; previewUrl: string | null };
  recentLogs: string | null;
};

export async function loadProjectContext(project: Project): Promise<ProjectContext> {
  const files = await listFiles(project.id);
  const visible = files.filter((f) => !isSecretPath(f.path));
  const treeLines = visible.slice(0, MAX_TREE_ENTRIES).map((f) => `${f.path} (${f.size} B)`);
  if (visible.length > MAX_TREE_ENTRIES) treeLines.push(`…[${visible.length - MAX_TREE_ENTRIES} more files]`);

  const excerpts: ProjectContext["excerpts"] = [];
  let budget = CONTEXT_FILE_BUDGET;
  const present = new Set(visible.map((f) => f.path));
  for (const path of KEY_FILES) {
    if (budget <= 0) break;
    if (!present.has(path)) continue;
    const file = await readFile(project.id, path);
    if (!file || file.isBinary) continue;
    const content = truncateMiddle(file.content, Math.min(budget, 8_000));
    excerpts.push({ path, content });
    budget -= content.length;
  }

  const [lastFailed] = await db
    .select({ error: generationRuns.error })
    .from(generationRuns)
    .where(and(eq(generationRuns.projectId, project.id), isNotNull(generationRuns.error)))
    .orderBy(desc(generationRuns.createdAt))
    .limit(1);

  const runtime = await getRuntimeStatus(project.id);
  let recentLogs: string | null = null;
  if (runtime.available && runtime.status !== "unavailable") {
    const logs = await getRuntimeLogs(project.id, { lines: 60 });
    if (logs.available && logs.lines.length) recentLogs = truncateTail(logs.lines.map((l) => `[${l.stream}] ${l.line}`).join("\n"), 6_000);
  }

  const fw = FRAMEWORKS[project.framework as keyof typeof FRAMEWORKS];
  return {
    framework: project.framework,
    frameworkName: fw?.name ?? project.framework,
    settings: (project.settings ?? {}) as Record<string, unknown>,
    tree: treeLines.join("\n"),
    fileCount: visible.length,
    excerpts,
    lastError: lastFailed?.error ?? null,
    runtime: { available: runtime.available, status: runtime.status, previewUrl: runtime.previewUrl },
    recentLogs,
  };
}
