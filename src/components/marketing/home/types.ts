import type { Token, TokenKind } from "@/components/vignettes/tokenize";

/**
 * Client-safe shapes shared by the home page's server builders (scenarios.ts) and its
 * client islands (stage, prompt box, store). Kept small: everything here crosses the RSC
 * boundary, and the scenario payload is budgeted at 25 KB (PLAN §7.4 home task 5).
 */

/** Token kinds in a fixed order so code can travel as compact [kindIndex, text] tuples. */
export const TOKEN_KINDS: TokenKind[] = ["keyword", "string", "fn", "tag", "number", "comment", "attr", "type", "punct", "plain"];
export type CompactToken = [number, string];

export function expandTokens(lines: CompactToken[][]): Token[][] {
  return lines.map((line) => line.map(([k, v]) => ({ k: TOKEN_KINDS[k] ?? "plain", v })));
}

/** A starter template as the matcher and the starter picker see it (no file contents). */
export type StarterLite = {
  id: string;
  name: string;
  categoryName: string;
  frameworkName: string;
  tags: string[];
  description: string;
  /** A real screenshot exists in /public/templates/<id>.webp. */
  shot: boolean;
  /** The stage can replay this starter (it has a scenario). */
  staged: boolean;
};

/** One write in the Generate chapter: a real path and its real line count. */
export type ScenarioWrite = { path: string; lines: number; action: "A" | "M" };

/** Everything the stage needs to replay one starter, derived on the server from TEMPLATES. */
export type Scenario = {
  id: string;
  name: string;
  /** Project name shown in the window header, e.g. "crm-pipeline". */
  slug: string;
  categoryName: string;
  frameworkName: string;
  /** What the visitor "types" in the Describe chapter. */
  prompt: string;
  fileCount: number;
  /** Real paths, at most 12, sources first. */
  files: string[];
  /** src/App.tsx, index.html or src/server.ts. */
  mainFile: string;
  mainLines: number;
  /** 16 consecutive lines of the main file (from the component down), tokenised on the server. */
  code: CompactToken[][];
  /** The real 1-based line number of the first line in `code`. */
  codeStart: number;
  /** 1-based line (inside `code`) that the illustrative type error points at. */
  errorLine: number;
  /** Generate chapter writes (real paths and line counts); the last one is the main file. */
  writes: ScenarioWrite[];
  /** Plan steps naming real files. */
  plan: string[];
  devCommand: string;
  port: number;
};

/** Real agent tool names used by the replay (checked against toolSchemas on the server). */
export type StageTools = {
  list: string;
  read: string;
  plan: string;
  write: string;
  edit: string;
  run: string;
  finish: string;
};
