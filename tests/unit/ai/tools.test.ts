import { describe, expect, it } from "vitest";
import { isSecretPath, safePath, safeReadablePath, ToolPathError } from "@/lib/ai/tools/paths";
import { applyEdit, countOccurrences, EditError, lineDelta } from "@/lib/ai/tools/edit";
import { LIMITS, truncateMiddle, truncateTail } from "@/lib/ai/tools/truncate";
import { COMMANDS, summarizeToolInput, toJsonSchema, toolDefinition, toolSchemas, validateToolInput, WRITE_TOOLS } from "@/lib/ai/tools/schemas";

describe("path safety", () => {
  it("normalizes slashes and leading ./", () => {
    expect(safePath("./src//App.tsx")).toBe("src/App.tsx");
    expect(safePath("/src\\App.tsx")).toBe("src/App.tsx");
  });

  it("rejects traversal, empty segments and bad characters", () => {
    for (const bad of ["../etc/passwd", "src/../../x", "src/./a", "", "a\0b", 'a"b', "x".repeat(600)]) {
      expect(() => safePath(bad), bad).toThrow(ToolPathError);
    }
    expect(() => safePath(42)).toThrow(ToolPathError);
  });

  it("rejects node_modules", () => {
    expect(() => safePath("node_modules/react/index.js")).toThrow(ToolPathError);
    expect(() => safePath("packages/a/node_modules/x.js")).toThrow(ToolPathError);
  });

  it("denies secret files for reads and writes", () => {
    expect(isSecretPath(".env")).toBe(true);
    expect(isSecretPath("config/.env.local")).toBe(true);
    expect(isSecretPath("certs/server.pem")).toBe(true);
    expect(isSecretPath("src/env.ts")).toBe(false);
    expect(() => safeReadablePath(".env.production")).toThrow(/secret/);
    expect(safeReadablePath("src/lib/env.ts")).toBe("src/lib/env.ts");
  });
});

describe("edit_file search/replace", () => {
  const content = "const a = 1;\nconst b = 2;\nconst c = 3;\n";

  it("replaces a unique match and reports the line", () => {
    const r = applyEdit(content, "const b = 2;", "const b = 20;");
    expect(r.content).toBe("const a = 1;\nconst b = 20;\nconst c = 3;\n");
    expect(r.line).toBe(2);
  });

  it("fails when the search text is missing", () => {
    expect(() => applyEdit(content, "const z = 9;", "")).toThrow(EditError);
    expect(() => applyEdit(content, "const z = 9;", "")).toThrow(/not found/);
  });

  it("hints when only whitespace differs", () => {
    expect(() => applyEdit(content, "  const b = 2;  ", "x")).toThrow(/whitespace/);
  });

  it("fails when the search text is ambiguous", () => {
    expect(() => applyEdit(content, "const ", "let ")).toThrow(/3 locations/);
    expect(countOccurrences(content, "const ")).toBe(3);
    expect(countOccurrences(content, "")).toBe(0);
  });

  it("rejects an empty search", () => {
    expect(() => applyEdit(content, "", "x")).toThrow(EditError);
  });

  it("computes +/- line deltas", () => {
    expect(lineDelta(null, "a\nb")).toEqual({ added: 2, removed: 0 });
    expect(lineDelta("a\nb", null)).toEqual({ added: 0, removed: 2 });
    expect(lineDelta("a\nb\nc", "a\nx\nc\nd")).toEqual({ added: 2, removed: 1 });
    expect(lineDelta("same", "same")).toEqual({ added: 0, removed: 0 });
  });
});

describe("truncation", () => {
  it("keeps short strings intact", () => {
    expect(truncateMiddle("hello", 100)).toBe("hello");
    expect(truncateTail("hello", 100)).toBe("hello");
  });

  it("truncates the middle with an explicit marker and bounded size", () => {
    const big = "a".repeat(5_000) + "b".repeat(5_000);
    const out = truncateMiddle(big, 1_000);
    expect(out.length).toBeLessThanOrEqual(1_000 + 10);
    expect(out).toMatch(/truncated \d+ characters/);
    expect(out.startsWith("aaa")).toBe(true);
    expect(out.endsWith("bbb")).toBe(true);
  });

  it("keeps only the tail for logs", () => {
    const out = truncateTail("x".repeat(100) + "END", 50);
    expect(out.endsWith("END")).toBe(true);
    expect(out).toMatch(/truncated \d+ earlier characters/);
  });

  it("has sane limits", () => {
    expect(LIMITS.readFile).toBeGreaterThan(10_000);
    expect(LIMITS.commandOutput).toBeLessThanOrEqual(50_000);
  });
});

describe("tool schemas", () => {
  it("validates inputs and reports readable errors", () => {
    expect(validateToolInput("read_file", { path: "src/App.tsx", startLine: 1, endLine: 10 }).ok).toBe(true);
    const bad = validateToolInput("read_file", { path: "" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toMatch(/read_file/);
    expect(validateToolInput("run_command", { command: "rm -rf /" }).ok).toBe(false);
    expect(validateToolInput("run_command", { command: "typecheck" }).ok).toBe(true);
    expect(validateToolInput("propose_plan", { steps: [] }).ok).toBe(false);
    expect(validateToolInput("finish", { summary: "done" })).toEqual({ ok: true, value: { summary: "done", nextSteps: [], changedFilesSummary: "" } });
    expect(validateToolInput("list_files", undefined).ok).toBe(true);
  });

  it("enforces content size limits", () => {
    expect(validateToolInput("write_file", { path: "a.txt", content: "x".repeat(LIMITS.writeContent + 1) }).ok).toBe(false);
    expect(validateToolInput("edit_file", { path: "a.txt", search: "", replace: "x" }).ok).toBe(false);
  });

  it("only allowlists safe commands", () => {
    expect([...COMMANDS]).toEqual(["install", "build", "typecheck", "test", "lint"]);
    expect(WRITE_TOOLS).toEqual(["write_file", "edit_file", "delete_file"]);
  });

  it("produces JSON schema for every tool", () => {
    for (const name of Object.keys(toolSchemas) as (keyof typeof toolSchemas)[]) {
      const schema = toJsonSchema(name);
      expect(schema.type).toBe("object");
      expect(schema.$schema).toBeUndefined();
      const def = toolDefinition(name);
      expect(def.name).toBe(name);
      expect(def.description.length).toBeGreaterThan(10);
    }
    const run = toJsonSchema("run_command") as { properties: { command: { enum: string[] } } };
    expect(run.properties.command.enum).toEqual([...COMMANDS]);
  });

  it("summarizes tool inputs for the UI", () => {
    expect(summarizeToolInput("read_file", { path: "src/App.tsx", startLine: 1, endLine: 20 })).toBe("src/App.tsx (lines 1–20)");
    expect(summarizeToolInput("write_file", { path: "a.ts", content: "abcd" })).toBe("a.ts (4 chars)");
    expect(summarizeToolInput("list_files", {})).toBe("all files");
    expect(summarizeToolInput("propose_plan", { steps: ["a", "b"] })).toBe("2 steps");
    expect(summarizeToolInput("unknown_tool", null)).toBe("");
  });
});
