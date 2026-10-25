import { describe, expect, it } from "vitest";
import { isSafeId, isSafeLabel, resolveInside, safeRelativePath } from "../../../services/runner/lib/paths";
import { validateFileMap } from "../../../services/runner/lib/files";
import { LogBuffer, truncateOutput } from "../../../services/runner/lib/ring-buffer";

describe("path safety", () => {
  it("normalises ordinary relative paths", () => {
    expect(safeRelativePath("src/App.tsx")).toBe("src/App.tsx");
    expect(safeRelativePath("./src//a.ts")).toBe("src/a.ts");
    expect(safeRelativePath("src\\win\\a.ts")).toBe("src/win/a.ts");
  });

  it("rejects escapes, absolute paths, NUL bytes and node_modules", () => {
    for (const bad of ["../x", "a/../../x", "/etc/passwd", "C:/x", "a\0b", "", ".", "a/./b", "node_modules/x", "src/node_modules/y", "x".repeat(600)]) {
      expect(() => safeRelativePath(bad), bad).toThrow();
    }
  });

  it("resolveInside never leaves the root", () => {
    expect(resolveInside("/work/project", "dist")).toBe("/work/project/dist");
    expect(resolveInside("/work/project", "a/b/c.txt")).toBe("/work/project/a/b/c.txt");
    expect(() => resolveInside("/work/project", "../other")).toThrow();
  });

  it("ids and labels", () => {
    expect(isSafeId("s0123456789abcdef")).toBe(true);
    expect(isSafeId("../x")).toBe(false);
    expect(isSafeId("ab")).toBe(false);
    expect(isSafeLabel("my-site-1")).toBe(true);
    expect(isSafeLabel("My_Site")).toBe(false);
    expect(isSafeLabel("-x")).toBe(false);
    expect(isSafeLabel("a".repeat(64))).toBe(false);
  });
});

describe("validateFileMap", () => {
  const limits = { maxFiles: 3, maxFileBytes: 10 };
  it("accepts a map of safe paths to strings", () => {
    expect(validateFileMap({ "index.html": "<h1>", "./src/a.ts": "x" }, limits)).toEqual({ "index.html": "<h1>", "src/a.ts": "x" });
  });
  it("rejects bad shapes, too many files, large files and unsafe paths", () => {
    expect(() => validateFileMap(null, limits)).toThrow(/object/);
    expect(() => validateFileMap(["a"], limits)).toThrow(/object/);
    expect(() => validateFileMap({ a: "1", b: "2", c: "3", d: "4" }, limits)).toThrow(/Too many/);
    expect(() => validateFileMap({ a: "x".repeat(11) }, limits)).toThrow(/exceeds/);
    expect(() => validateFileMap({ a: 1 }, limits)).toThrow(/string/);
    expect(() => validateFileMap({ "../a": "x" }, limits)).toThrow(/segments/);
  });
});

describe("LogBuffer", () => {
  it("keeps the last N lines and notifies subscribers", () => {
    const b = new LogBuffer(3);
    const seen: string[] = [];
    const unsub = b.subscribe((l) => seen.push(l.line));
    for (const n of ["1", "2", "3", "4", "5"]) b.push("stdout", n);
    expect(b.size).toBe(3);
    expect(b.tail().map((l) => l.line)).toEqual(["3", "4", "5"]);
    expect(b.tail(2).map((l) => l.line)).toEqual(["4", "5"]);
    expect(b.tail(0)).toEqual([]);
    expect(seen).toEqual(["1", "2", "3", "4", "5"]);
    unsub();
    b.push("stderr", "6");
    expect(seen).toHaveLength(5);
    expect(b.text()).toBe("4\n5\n6");
  });

  it("splits chunks into lines, keeps partial lines across writes and flushes them", () => {
    const b = new LogBuffer(10);
    b.write("stdout", "hel");
    b.write("stdout", "lo\r\nwor");
    expect(b.tail().map((l) => l.line)).toEqual(["hello"]);
    b.write("stderr", "err\n");
    b.flush();
    expect(b.tail().map((l) => `${l.stream}:${l.line}`)).toEqual(["stdout:hello", "stderr:err", "stdout:wor"]);
  });

  it("truncates very long lines and rejects a zero capacity", () => {
    const b = new LogBuffer(2, 5);
    b.push("stdout", "abcdefgh");
    expect(b.tail()[0].line).toBe("abcde…");
    expect(() => new LogBuffer(0)).toThrow();
  });
});

describe("truncateOutput", () => {
  it("keeps head and tail within the byte budget", () => {
    const text = Array.from({ length: 200 }, (_, i) => `line ${i}`).join("\n");
    const r = truncateOutput(text, 200);
    expect(r.truncated).toBe(true);
    expect(r.text.startsWith("line 0")).toBe(true);
    expect(r.text.endsWith("line 199")).toBe(true);
    expect(r.text).toContain("output truncated");
    expect(truncateOutput("short", 200)).toEqual({ text: "short", truncated: false });
  });
});
