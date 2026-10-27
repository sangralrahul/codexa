import type { ComponentType } from "react";
import { AgentRun } from "./agent-run";
import { DiffRestore } from "./diff-restore";
import { TerminalStream } from "./terminal-stream";
import { DeployHistory } from "./deploy-history";
import { SqlRunner } from "./sql-runner";
import { EditorPeek } from "./editor-peek";
import { ViewportMorph } from "./viewport-morph";
import { CommitList } from "./commit-list";
import { EnvVars } from "./env-vars";
import { PresenceCursors } from "./presence-cursors";

export type VignetteId =
  | "agent-run"
  | "diff-restore"
  | "terminal-stream"
  | "deploy-history"
  | "sql-runner"
  | "editor-peek"
  | "viewport-morph"
  | "commit-list"
  | "env-vars"
  | "presence-cursors";

export type VignetteProps = { playing?: boolean; className?: string };

/** ViewportMorph with the default starter (the Analytics dashboard has a real screenshot). */
function DashboardViewportMorph(props: VignetteProps) {
  return <ViewportMorph templateId="vite-react-dashboard" category="dashboards" {...props} />;
}

/**
 * Vignettes by id, for content-driven pages (`visual: VignetteId`). Server-safe registry:
 * index it on the server and render the result (`const V = VIGNETTES[id]; <V />`).
 */
export const VIGNETTES: Record<VignetteId, ComponentType<VignetteProps>> = {
  "agent-run": AgentRun,
  "diff-restore": DiffRestore,
  "terminal-stream": TerminalStream,
  "deploy-history": DeployHistory,
  "sql-runner": SqlRunner,
  "editor-peek": EditorPeek,
  "viewport-morph": DashboardViewportMorph,
  "commit-list": CommitList,
  "env-vars": EnvVars,
  "presence-cursors": PresenceCursors,
};

export const VIGNETTE_IDS = Object.keys(VIGNETTES) as VignetteId[];

export function isVignetteId(id: string): id is VignetteId {
  return id in VIGNETTES;
}
