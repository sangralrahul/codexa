/**
 * The only commands the Next.js app may ask a sandbox to run on demand.
 * Everything runs inside the sandbox; the allowlist exists so the HTTP API
 * never accepts arbitrary shell from a caller, even an authenticated one.
 */
export const EXEC_COMMANDS = ["install", "build", "typecheck", "test", "lint"] as const;
export type ExecCommand = (typeof EXEC_COMMANDS)[number];

export function isExecCommand(v: unknown): v is ExecCommand {
  return typeof v === "string" && (EXEC_COMMANDS as readonly string[]).includes(v);
}

export type ExecSpec = { shell: string; timeoutMs: number; description: string };

export type ExecContext = {
  framework: string;
  settings: { installCommand?: string; buildCommand?: string };
  /** package.json scripts of the project (so we can say "no test script" instead of failing). */
  scripts: Record<string, string>;
  execTimeoutMs: number;
  buildTimeoutMs: number;
  /** Path (inside the sandbox) of the framework's prebuilt node_modules, if any. */
  baseNodeModules: string | null;
  /** Whether the project has a tsconfig.json (typecheck is skipped otherwise). */
  hasTsconfig: boolean;
};

const NPM_FLAGS = "--no-audit --no-fund --loglevel=warn";

/**
 * Map an allowlisted command to the shell that runs in the sandbox.
 * Returns null when the command does not apply to the project (for example
 * `build` on a static site, or `test` with no test script).
 */
export function resolveExec(command: ExecCommand, ctx: ExecContext): ExecSpec | null {
  const scripts = ctx.scripts;
  switch (command) {
    case "install": {
      if (ctx.framework === "static") return null;
      const custom = ctx.settings.installCommand?.trim();
      return { shell: installPrelude(ctx.baseNodeModules) + (custom || `npm install ${NPM_FLAGS}`), timeoutMs: ctx.buildTimeoutMs, description: "Install dependencies" };
    }
    case "build": {
      const custom = ctx.settings.buildCommand?.trim();
      if (custom) return { shell: custom, timeoutMs: ctx.buildTimeoutMs, description: "Build" };
      if (!scripts.build) return null;
      return { shell: `npm run build`, timeoutMs: ctx.buildTimeoutMs, description: "Build" };
    }
    case "typecheck": {
      if (scripts.typecheck) return { shell: `npm run typecheck`, timeoutMs: ctx.execTimeoutMs, description: "Typecheck" };
      if (ctx.framework === "static" || !ctx.hasTsconfig) return null;
      // PATH inside the sandbox starts with /work/project/node_modules/.bin (see sandbox-init.sh),
      // so this resolves to the project's (or the linked base set's) TypeScript.
      return { shell: `tsc --noEmit -p tsconfig.json`, timeoutMs: ctx.execTimeoutMs, description: "Typecheck" };
    }
    case "test":
      if (!scripts.test) return null;
      return { shell: `npm test`, timeoutMs: ctx.execTimeoutMs, description: "Test" };
    case "lint":
      if (!scripts.lint) return null;
      return { shell: `npm run lint`, timeoutMs: ctx.execTimeoutMs, description: "Lint" };
  }
}

/**
 * Replace the per-package symlinks that point at the shared (read-only) base
 * set with a private copy so npm can add/remove packages. No-op when the
 * project already owns a real node_modules.
 */
export function installPrelude(baseNodeModules: string | null): string {
  if (!baseNodeModules) return "";
  return `if [ -L node_modules ] || [ -f node_modules/.codexa-linked ]; then rm -rf node_modules && cp -a ${shellQuote(baseNodeModules)} node_modules && rm -f node_modules/.codexa-linked; fi; `;
}

/** POSIX single-quote a string for use inside sh -c. */
export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
