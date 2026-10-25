import { describe, expect, it } from "vitest";
import { EXEC_COMMANDS, installPrelude, isExecCommand, resolveExec, shellQuote, type ExecContext } from "../../../services/runner/lib/allowlist";

const ctx = (over: Partial<ExecContext> = {}): ExecContext => ({
  framework: "vite-react",
  settings: {},
  scripts: { dev: "vite", build: "tsc -b && vite build", test: "vitest run", lint: "eslint ." },
  execTimeoutMs: 120_000,
  buildTimeoutMs: 600_000,
  baseNodeModules: "/work/base/vite-react/node_modules",
  hasTsconfig: true,
  ...over,
});

describe("exec allowlist", () => {
  it("only accepts the five known commands", () => {
    expect(EXEC_COMMANDS).toEqual(["install", "build", "typecheck", "test", "lint"]);
    for (const c of EXEC_COMMANDS) expect(isExecCommand(c)).toBe(true);
    for (const bad of ["rm -rf /", "sh", "npm run dev", "", 1, null, "INSTALL", "install; id"]) expect(isExecCommand(bad)).toBe(false);
  });

  it("maps commands to fixed npm scripts (never caller-supplied shell)", () => {
    expect(resolveExec("build", ctx())?.shell).toBe("npm run build");
    expect(resolveExec("test", ctx())?.shell).toBe("npm test");
    expect(resolveExec("lint", ctx())?.shell).toBe("npm run lint");
    expect(resolveExec("typecheck", ctx())?.shell).toBe("tsc --noEmit -p tsconfig.json");
    expect(resolveExec("typecheck", ctx({ scripts: { typecheck: "tsc" } }))?.shell).toBe("npm run typecheck");
    expect(resolveExec("build", ctx())?.timeoutMs).toBe(600_000);
    expect(resolveExec("test", ctx())?.timeoutMs).toBe(120_000);
  });

  it("returns null for commands that do not apply", () => {
    expect(resolveExec("install", ctx({ framework: "static" }))).toBeNull();
    expect(resolveExec("build", ctx({ scripts: {} }))).toBeNull();
    expect(resolveExec("test", ctx({ scripts: {} }))).toBeNull();
    expect(resolveExec("lint", ctx({ scripts: {} }))).toBeNull();
    expect(resolveExec("typecheck", ctx({ scripts: {}, hasTsconfig: false }))).toBeNull();
    expect(resolveExec("typecheck", ctx({ framework: "static", scripts: {} }))).toBeNull();
  });

  it("install replaces the linked base set with a private copy first", () => {
    const spec = resolveExec("install", ctx());
    expect(spec?.shell.startsWith("if [ -L node_modules ] || [ -f node_modules/.codexa-linked ]; then rm -rf node_modules && cp -a '/work/base/vite-react/node_modules' node_modules")).toBe(true);
    expect(spec?.shell.endsWith("npm install --no-audit --no-fund --loglevel=warn")).toBe(true);
    expect(installPrelude(null)).toBe("");
    expect(resolveExec("install", ctx({ baseNodeModules: null, settings: { installCommand: "pnpm i" } }))?.shell).toBe("pnpm i");
  });

  it("project settings may override build/install commands (they run inside the sandbox)", () => {
    expect(resolveExec("build", ctx({ settings: { buildCommand: "vite build --mode staging" } }))?.shell).toBe("vite build --mode staging");
  });

  it("shellQuote produces a single POSIX word", () => {
    expect(shellQuote("a b")).toBe("'a b'");
    expect(shellQuote("it's")).toBe(`'it'\\''s'`);
    expect(shellQuote("$(id)")).toBe("'$(id)'");
  });
});
