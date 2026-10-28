import "server-only";
import { deleteFile, getAllFiles, listFiles, readFile, searchFiles, writeFiles } from "@/lib/services/projects";
import { execInProject, getRuntimeLogs, type ExecCommand } from "@/lib/runtime/exec";
import { applyEdit, EditError } from "./edit";
import { safePath, safeReadablePath, ToolPathError } from "./paths";
import { LIMITS, truncateMiddle, truncateTail } from "./truncate";
import { READ_TOOLS, WRITE_TOOLS, toolDefinition, validateToolInput, type ToolInput, type ToolName } from "./schemas";
import type { ToolDefinition } from "../provider";

export type AgentMode = "build" | "ask" | "fix" | "plan";

export type FileChange = { path: string; action: "create" | "update" | "delete"; summary?: string };

export type ToolExecution = {
  output: string;
  isError?: boolean;
  fileChange?: FileChange;
  /** Set by finish / propose_plan so the agent loop can react. */
  control?: { type: "finish"; input: ToolInput<"finish"> } | { type: "plan"; steps: string[] };
};

export type ToolContext = {
  projectId: string;
  mode: AgentMode;
  /** Called before the first mutation (snapshot creation). */
  beforeWrite: () => Promise<void>;
};

/** Which tools the model may call in each mode. */
export function toolNamesForMode(mode: AgentMode, phase: "plan" | "work"): ToolName[] {
  if (phase === "plan") return ["propose_plan"];
  const base: ToolName[] = [...READ_TOOLS, "run_command"];
  if (mode === "ask" || mode === "plan") return base;
  return [...base, ...WRITE_TOOLS, "finish"];
}

export function toolDefinitionsFor(mode: AgentMode, phase: "plan" | "work"): ToolDefinition[] {
  return toolNamesForMode(mode, phase).map(toolDefinition);
}

export function isKnownTool(name: string): name is ToolName {
  return ["list_files", "read_file", "write_file", "edit_file", "delete_file", "search_files", "run_command", "get_logs", "propose_plan", "finish"].includes(name);
}

const fmtSize = (n: number) => `${n} B`;

/**
 * Execute one tool call against the project. Never throws: every failure is
 * returned as an error result so the model can recover. Tool outputs are
 * always truncated to safe sizes and never include env vars or secrets.
 */
export async function executeTool(ctx: ToolContext, name: string, rawInput: unknown, allowed: ToolName[]): Promise<ToolExecution> {
  if (!isKnownTool(name)) return { output: `Unknown tool: ${name}`, isError: true };
  if (!allowed.includes(name)) return { output: `Tool ${name} is not available in ${ctx.mode} mode.`, isError: true };
  const validated = validateToolInput(name, rawInput);
  if (!validated.ok) return { output: validated.error, isError: true };
  try {
    switch (name) {
      case "list_files":
        return await runListFiles(ctx, validated.value as ToolInput<"list_files">);
      case "read_file":
        return await runReadFile(ctx, validated.value as ToolInput<"read_file">);
      case "write_file":
        return await runWriteFile(ctx, validated.value as ToolInput<"write_file">);
      case "edit_file":
        return await runEditFile(ctx, validated.value as ToolInput<"edit_file">);
      case "delete_file":
        return await runDeleteFile(ctx, validated.value as ToolInput<"delete_file">);
      case "search_files":
        return await runSearchFiles(ctx, validated.value as ToolInput<"search_files">);
      case "run_command":
        return await runCommand(ctx, validated.value as ToolInput<"run_command">);
      case "get_logs":
        return await runGetLogs(ctx, validated.value as ToolInput<"get_logs">);
      case "propose_plan": {
        const { steps } = validated.value as ToolInput<"propose_plan">;
        return { output: `Plan recorded (${steps.length} steps). Proceed with the implementation.`, control: { type: "plan", steps } };
      }
      case "finish": {
        const input = validated.value as ToolInput<"finish">;
        return { output: "Run finished.", control: { type: "finish", input } };
      }
    }
  } catch (err) {
    if (err instanceof ToolPathError || err instanceof EditError) return { output: err.message, isError: true };
    const message = err instanceof Error ? err.message : String(err);
    return { output: `Tool ${name} failed: ${message.slice(0, 500)}`, isError: true };
  }
}

async function runListFiles(ctx: ToolContext, input: ToolInput<"list_files">): Promise<ToolExecution> {
  const prefix = input.prefix ? safePath(input.prefix).replace(/\/$/, "") + "/" : "";
  const files = (await listFiles(ctx.projectId)).filter((f) => !prefix || f.path.startsWith(prefix));
  if (!files.length) return { output: prefix ? `(no files under ${prefix})` : "(project has no files)" };
  const shown = files.slice(0, LIMITS.listFiles);
  const lines = shown.map((f) => `${f.path} (${fmtSize(f.size)})`);
  if (files.length > shown.length) lines.push(`…[${files.length - shown.length} more files not shown]`);
  return { output: lines.join("\n") };
}

async function runReadFile(ctx: ToolContext, input: ToolInput<"read_file">): Promise<ToolExecution> {
  const path = safeReadablePath(input.path);
  const file = await readFile(ctx.projectId, path);
  if (!file) return { output: `File not found: ${path}`, isError: true };
  if (file.isBinary) return { output: `${path} is a binary file (${file.size} bytes) and cannot be read as text.`, isError: true };
  let content = file.content;
  let header = "";
  if (input.startLine || input.endLine) {
    const lines = content.split("\n");
    const start = Math.max(1, input.startLine ?? 1);
    const end = Math.min(lines.length, input.endLine ?? lines.length);
    if (start > end) return { output: `Invalid line range ${start}-${end} (file has ${lines.length} lines)`, isError: true };
    content = lines.slice(start - 1, end).join("\n");
    header = `[${path} lines ${start}-${end} of ${lines.length}]\n`;
  }
  return { output: header + truncateMiddle(content, LIMITS.readFile) };
}

async function runWriteFile(ctx: ToolContext, input: ToolInput<"write_file">): Promise<ToolExecution> {
  const path = safeReadablePath(input.path);
  const existing = await readFile(ctx.projectId, path);
  await ctx.beforeWrite();
  await writeFiles(ctx.projectId, { [path]: input.content });
  const action = existing ? "update" : "create";
  return { output: `${action === "create" ? "Created" : "Updated"} ${path} (${Buffer.byteLength(input.content, "utf8")} bytes)`, fileChange: { path, action } };
}

async function runEditFile(ctx: ToolContext, input: ToolInput<"edit_file">): Promise<ToolExecution> {
  const path = safeReadablePath(input.path);
  const existing = await readFile(ctx.projectId, path);
  if (!existing) return { output: `File not found: ${path}. Use write_file to create it.`, isError: true };
  if (existing.isBinary) return { output: `${path} is binary and cannot be edited.`, isError: true };
  const edited = applyEdit(existing.content, input.search, input.replace);
  if (edited.content.length > LIMITS.writeContent) return { output: `Edit would make ${path} too large.`, isError: true };
  await ctx.beforeWrite();
  await writeFiles(ctx.projectId, { [path]: edited.content });
  return { output: `Edited ${path} at line ${edited.line}.`, fileChange: { path, action: "update", summary: `line ${edited.line}` } };
}

async function runDeleteFile(ctx: ToolContext, input: ToolInput<"delete_file">): Promise<ToolExecution> {
  const path = safeReadablePath(input.path);
  await ctx.beforeWrite();
  const ok = await deleteFile(ctx.projectId, path);
  if (!ok) return { output: `File not found: ${path}`, isError: true };
  return { output: `Deleted ${path}`, fileChange: { path, action: "delete" } };
}

async function runSearchFiles(ctx: ToolContext, input: ToolInput<"search_files">): Promise<ToolExecution> {
  const results = (await searchFiles(ctx.projectId, input.query, LIMITS.searchResults)).filter((r) => !isSecretLike(r.path));
  if (!results.length) return { output: `No matches for "${input.query}"` };
  return { output: results.map((r) => `${r.path}:${r.line}: ${r.text}`).join("\n") };
}

function isSecretLike(path: string) {
  try {
    safeReadablePath(path);
    return false;
  } catch {
    return true;
  }
}

async function runCommand(ctx: ToolContext, input: ToolInput<"run_command">): Promise<ToolExecution> {
  const result = await execInProject(ctx.projectId, input.command as ExecCommand, { timeoutMs: 5 * 60 * 1000 });
  if (!result.available) return { output: `Command "${input.command}" not run: the runtime sandbox is not available for this project. Continue without it.`, isError: true };
  const status = result.timedOut ? "timed out" : `exit code ${result.exitCode}`;
  return {
    output: `$ ${input.command} (${status}, ${Math.round(result.durationMs / 1000)}s)\n${truncateTail(result.output, LIMITS.commandOutput)}`,
    isError: result.exitCode !== 0 || result.timedOut,
  };
}

async function runGetLogs(ctx: ToolContext, input: ToolInput<"get_logs">): Promise<ToolExecution> {
  const res = await getRuntimeLogs(ctx.projectId, { lines: input.lines ?? 100 });
  if (!res.available) return { output: "Runtime logs are not available: the sandbox is not running.", isError: true };
  if (!res.lines.length) return { output: "(no log lines yet)" };
  return { output: truncateTail(res.lines.map((l) => `[${l.stream}] ${l.line}`).join("\n"), LIMITS.logOutput) };
}

/** Load all project files (used for diffs and context). */
export async function snapshotFiles(projectId: string) {
  return getAllFiles(projectId);
}
