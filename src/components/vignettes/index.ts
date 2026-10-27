/**
 * Token-only presentational product UI (PLAN §7.0). Every vignette takes { playing?, className? }:
 * without `playing` it autoplays once while in view; it renders its final frame on the server
 * and when calm. Display parts are aria-hidden; interactive controls are real, labelled buttons.
 * Label every depiction with an IllustrationBadge / "Sample data".
 */
export { StepRow, StepIcon, type StepState } from "./step-row";
export { CodeLines } from "./code-lines";
export { tokenize, langFromPath, type Token, type TokenKind, type CodeLang } from "./tokenize";
export { FileRow } from "./file-row";
export { AgentRun, type AgentStep } from "./agent-run";
export { DiffRestore } from "./diff-restore";
export { TerminalStream, type TerminalLine } from "./terminal-stream";
export { DeployHistory, type DeployVersion } from "./deploy-history";
export { SqlRunner } from "./sql-runner";
export { EditorPeek, type PeekFile } from "./editor-peek";
export { ViewportMorph } from "./viewport-morph";
export { CommitList, type Commit } from "./commit-list";
export { EnvVars } from "./env-vars";
export { PresenceCursors } from "./presence-cursors";
export { VIGNETTES, VIGNETTE_IDS, isVignetteId, type VignetteId, type VignetteProps } from "./registry";
export { useScript } from "./use-script";
