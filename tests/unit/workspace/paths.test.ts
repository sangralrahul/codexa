import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { diffFileSets, normalizePath } from "@/lib/services/projects";
import { ApiError } from "@/lib/api";
import { basename, buildTree, dirname, extensionOf, fuzzyScore, joinPath, validateName } from "@/lib/client/workspace/paths";
import { canFormat, languageForPath } from "@/components/editor/language";
import { relativeTime } from "@/components/projects/format";

describe("normalizePath", () => {
  it("strips leading slashes, collapses duplicates and converts backslashes", () => {
    expect(normalizePath("/src//App.tsx")).toBe("src/App.tsx");
    expect(normalizePath("src\\components\\Button.tsx")).toBe("src/components/Button.tsx");
    expect(normalizePath("///index.html")).toBe("index.html");
  });

  it("rejects traversal, empty segments and invalid characters with a 400", () => {
    for (const bad of ["../etc/passwd", "src/../secret", "src/./a.ts", "", "a/", "bad<name>.ts", "a:b", "nul\0"]) {
      expect(() => normalizePath(bad), bad).toThrowError(ApiError);
      try {
        normalizePath(bad);
      } catch (e) {
        expect((e as ApiError).status).toBe(400);
      }
    }
  });

  it("rejects paths longer than 512 characters", () => {
    expect(() => normalizePath("a".repeat(513))).toThrow();
    expect(normalizePath("a".repeat(512))).toHaveLength(512);
  });
});

describe("diffFileSets", () => {
  it("reports creates, updates and deletes sorted by path", () => {
    const before = { "b.ts": "1", "a.ts": "same", "gone.ts": "x" };
    const after = { "b.ts": "2", "a.ts": "same", "new.ts": "n" };
    expect(diffFileSets(before, after)).toEqual([
      { path: "b.ts", action: "update", before: "1", after: "2" },
      { path: "gone.ts", action: "delete", before: "x", after: null },
      { path: "new.ts", action: "create", before: null, after: "n" },
    ]);
  });

  it("returns an empty diff for identical sets", () => {
    expect(diffFileSets({ a: "1" }, { a: "1" })).toEqual([]);
    expect(diffFileSets({}, {})).toEqual([]);
  });

  it("treats an empty-string file as present (not deleted)", () => {
    expect(diffFileSets({ a: "" }, { a: "" })).toEqual([]);
    expect(diffFileSets({ a: "x" }, { a: "" })).toEqual([{ path: "a", action: "update", before: "x", after: "" }]);
  });
});

describe("client path helpers", () => {
  it("basename/dirname/joinPath/extensionOf", () => {
    expect(basename("src/a/b.test.ts")).toBe("b.test.ts");
    expect(dirname("src/a/b.ts")).toBe("src/a");
    expect(dirname("b.ts")).toBe("");
    expect(joinPath("", "x")).toBe("x");
    expect(joinPath("src", "x")).toBe("src/x");
    expect(extensionOf("a/b.TSX")).toBe("tsx");
    expect(extensionOf(".env")).toBe("");
  });

  it("buildTree nests folders first and keeps virtual empty folders", () => {
    const tree = buildTree([{ path: "src/b.ts" }, { path: "src/a.ts" }, { path: "README.md" }], ["src/empty", "docs"]);
    expect(tree.map((n) => `${n.type}:${n.name}`)).toEqual(["folder:docs", "folder:src", "file:README.md"]);
    const src = tree[1];
    if (src.type !== "folder") throw new Error("expected folder");
    expect(src.children.map((n) => n.name)).toEqual(["empty", "a.ts", "b.ts"]);
  });

  it("fuzzyScore prefers basename and prefix matches and rejects non-matches", () => {
    expect(fuzzyScore("app", "src/App.tsx")).toBeGreaterThan(fuzzyScore("app", "src/components/wrapper/application-state.ts"));
    expect(fuzzyScore("btn", "src/components/Button.tsx")).toBeGreaterThan(0);
    expect(fuzzyScore("zzz", "src/App.tsx")).toBe(-1);
    expect(fuzzyScore("", "anything")).toBe(0);
  });

  it("validateName flags invalid file names", () => {
    expect(validateName("ok.ts")).toBeNull();
    expect(validateName("  ")).toBeTruthy();
    expect(validateName("..")).toBeTruthy();
    expect(validateName("a/b")).toBeNull(); // nested paths are allowed when creating files
    expect(validateName("a?b")).toBeTruthy();
    expect(validateName("a\\b")).toBeTruthy();
  });
});

describe("language detection", () => {
  it("maps extensions and special names", () => {
    expect(languageForPath("src/App.tsx")).toBe("typescript");
    expect(languageForPath("a.jsx")).toBe("javascript");
    expect(languageForPath("styles.css")).toBe("css");
    expect(languageForPath("index.html")).toBe("html");
    expect(languageForPath("package.json")).toBe("json");
    expect(languageForPath("README.md")).toBe("markdown");
    expect(languageForPath("ci.yaml")).toBe("yaml");
    expect(languageForPath("config.toml")).toBe("ini");
    expect(languageForPath(".env.local")).toBe("ini");
    expect(languageForPath("schema.sql")).toBe("sql");
    expect(languageForPath("run.sh")).toBe("shell");
    expect(languageForPath("Dockerfile")).toBe("dockerfile");
    expect(languageForPath("unknown.xyz")).toBe("plaintext");
  });

  it("canFormat only for languages with built-in Monaco formatters", () => {
    expect(canFormat("typescript")).toBe(true);
    expect(canFormat("markdown")).toBe(false);
  });
});

describe("relativeTime", () => {
  it("formats durations relative to now", () => {
    const now = Date.parse("2026-10-24T12:00:00Z");
    expect(relativeTime("2026-10-24T11:59:50Z", now)).toBe("just now");
    expect(relativeTime("2026-10-24T11:30:00Z", now)).toBe("30 min ago");
    expect(relativeTime("2026-10-24T09:00:00Z", now)).toBe("3 hours ago");
    expect(relativeTime("2026-10-22T12:00:00Z", now)).toBe("2 days ago");
    expect(relativeTime(null)).toBe("never");
  });
});
