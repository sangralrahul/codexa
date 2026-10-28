/**
 * Zod schemas for every agent tool plus the JSON-schema form sent to providers.
 * Pure module: no DB or runtime access so it can be unit tested directly.
 */
import { z } from "zod";
import type { JsonSchema, ToolDefinition } from "../provider";
import { LIMITS } from "./truncate";

export const COMMANDS = ["install", "build", "typecheck", "test", "lint"] as const;
export type CommandName = (typeof COMMANDS)[number];

const pathField = z.string().min(1).max(512).describe("Project-relative file path, e.g. src/App.tsx");

export const toolSchemas = {
  list_files: z.object({
    prefix: z.string().max(512).optional().describe("Only list files under this folder prefix (optional)"),
  }),
  read_file: z.object({
    path: pathField,
    startLine: z.number().int().min(1).optional().describe("First line to return (1-based, inclusive)"),
    endLine: z.number().int().min(1).optional().describe("Last line to return (1-based, inclusive)"),
  }),
  write_file: z.object({
    path: pathField,
    content: z.string().max(LIMITS.writeContent).describe("The complete new content of the file"),
  }),
  edit_file: z.object({
    path: pathField,
    search: z.string().min(1).max(LIMITS.writeContent).describe("Exact text to find; must appear exactly once in the file"),
    replace: z.string().max(LIMITS.writeContent).describe("Replacement text"),
  }),
  delete_file: z.object({ path: pathField }),
  search_files: z.object({
    query: z.string().min(1).max(200).describe("Case-insensitive substring to search for in file contents"),
  }),
  run_command: z.object({
    command: z.enum(COMMANDS).describe("Allowlisted command to run in the project sandbox"),
  }),
  get_logs: z.object({
    lines: z.number().int().min(1).max(LIMITS.logLines).optional().describe("How many trailing log lines to return (default 100)"),
  }),
  generate_image: z.object({
    prompt: z.string().min(10).max(1000).describe("What the image shows: subject, setting, mood, colours that match the design. No text in the image."),
    aspect: z.enum(["square", "landscape", "portrait"]).describe("landscape for heroes and banners, square for products and avatars, portrait for tall cards"),
    alt: z.string().min(1).max(200).describe("Alt text describing the image for screen readers"),
  }),
  propose_plan: z.object({
    steps: z.array(z.string().min(1).max(300)).min(1).max(12).describe("Short, concrete implementation steps in order"),
  }),
  finish: z.object({
    summary: z.string().min(1).max(4000).describe("What was done, in plain language for the user"),
    nextSteps: z.array(z.string().max(300)).max(10).default([]).describe("Suggested follow-ups (may be empty)"),
    changedFilesSummary: z.string().max(2000).default("").describe("One line per changed file explaining the change"),
  }),
} as const;

export type ToolName = keyof typeof toolSchemas;
export type ToolInput<N extends ToolName> = z.infer<(typeof toolSchemas)[N]>;

export const WRITE_TOOLS: ToolName[] = ["write_file", "edit_file", "delete_file"];
export const READ_TOOLS: ToolName[] = ["list_files", "read_file", "search_files", "get_logs"];

export const toolDescriptions: Record<ToolName, string> = {
  list_files: "List all files in the project with their sizes. Call this first to understand the project layout.",
  read_file: "Read a file's content. Use startLine/endLine for large files. Output is truncated for very large files.",
  write_file: "Create or completely overwrite a file with the given content. Prefer edit_file for small changes to existing files.",
  edit_file: "Replace one exact, unique occurrence of `search` with `replace` in an existing file. Fails if the text is missing or ambiguous.",
  delete_file: "Delete a file from the project.",
  search_files: "Search file contents for a substring (case-insensitive). Returns path, line number and the matching line.",
  run_command: "Run an allowlisted command (install, build, typecheck, test, lint) in the project sandbox and return its exit code and truncated output. Only available when the runtime sandbox is running.",
  get_logs: "Return the latest runtime (dev server) log lines for the project, if the sandbox is running.",
  generate_image:
    "Generate a real image (photo or illustration) for the app and get a permanent https URL to use in <img src>. Use it for hero images, product photos and section imagery instead of colour blocks, at most a few per request. The image is not a project file; reference the returned URL directly.",
  propose_plan: "Record a short implementation plan (3-8 steps) before making changes. Call this exactly once at the start of a build.",
  finish: "Call this when the task is complete (or cannot be completed) with a summary for the user. This ends the run.",
};

export function toJsonSchema(name: ToolName): JsonSchema {
  const schema = z.toJSONSchema(toolSchemas[name], { target: "draft-7", io: "input" }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

export function toolDefinition(name: ToolName): ToolDefinition {
  return { name, description: toolDescriptions[name], inputSchema: toJsonSchema(name) };
}

/** Validate a raw tool input against its schema. */
export function validateToolInput<N extends ToolName>(name: N, input: unknown): { ok: true; value: ToolInput<N> } | { ok: false; error: string } {
  const schema = toolSchemas[name];
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
    return { ok: false, error: `Invalid input for ${name}: ${msg}` };
  }
  return { ok: true, value: result.data as ToolInput<N> };
}

/** Human-readable one-line summary of a tool call input for the UI. */
export function summarizeToolInput(name: string, input: unknown): string {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  switch (name) {
    case "list_files":
      return i.prefix ? `under ${s(i.prefix)}` : "all files";
    case "read_file":
      return i.startLine || i.endLine ? `${s(i.path)} (lines ${i.startLine ?? 1}–${i.endLine ?? "end"})` : s(i.path);
    case "write_file":
      return `${s(i.path)} (${s(i.content).length.toLocaleString()} chars)`;
    case "edit_file":
      return s(i.path);
    case "delete_file":
      return s(i.path);
    case "search_files":
      return `"${s(i.query).slice(0, 60)}"`;
    case "run_command":
      return s(i.command);
    case "get_logs":
      return i.lines ? `${String(i.lines)} lines` : "latest";
    case "generate_image":
      return `${s(i.aspect)}: ${s(i.alt).slice(0, 70)}`;
    case "propose_plan":
      return Array.isArray(i.steps) ? `${i.steps.length} steps` : "";
    case "finish":
      return s(i.summary).slice(0, 80);
    default:
      return "";
  }
}
