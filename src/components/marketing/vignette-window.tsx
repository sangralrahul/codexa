import * as React from "react";
import { AppWindow } from "@/components/frames/app-window";
import { IllustrationBadge } from "@/components/frames/illustration-badge";
import { VIGNETTES, type VignetteProps } from "@/components/vignettes/registry";
import type { IllustrationId } from "@/content/marketing/types";
import { cn } from "@/lib/utils";
import { FACTS } from "@/content/marketing/facts";
import { AgentModes, ApiEditorPeek, BuildLog, PlanSteps, RepairLoop, SiteAgentRun, TestRun, UiAgentRun, ValidateRun } from "./agent-illustrations";
import type { StoryStage } from "./story-scroll";

/** The repair loop counts against the agent's real limit (LIMITS.maxRepairAttempts), read on the server. */
function RepairLoopIllustration(props: VignetteProps) {
  return <RepairLoop {...props} maxAttempts={FACTS.maxRepairAttempts} />;
}

/** Shared vignettes plus the marketing-only illustrations built from their primitives. */
export const ILLUSTRATIONS: Record<IllustrationId, React.ComponentType<VignetteProps>> = {
  ...VIGNETTES,
  "agent-modes": AgentModes,
  "validate-run": ValidateRun,
  "plan-steps": PlanSteps,
  "repair-loop": RepairLoopIllustration,
  "agent-run-site": SiteAgentRun,
  "agent-run-ui": UiAgentRun,
  "editor-api": ApiEditorPeek,
  "test-run": TestRun,
  "build-log": BuildLog,
};

/** What each vignette depicts, for the honesty popover (PLAN §4.4). */
export const VIGNETTE_DETAIL: Record<IllustrationId, string> = {
  "agent-run": "A scripted replay that uses the agent's real tool names and stage labels. No AI model is called here; in your project the plan, files and timing will differ, and AI generation needs an operator-configured key.",
  "diff-restore": "Sample code. In a project, a snapshot is taken before every AI run and any file can be restored from it.",
  "terminal-stream": "Sample log lines on a sample preview host. Real previews stream the sandbox's stdout and stderr.",
  "deploy-history": "Sample versions on a sample domain. On Codexa hosting, rollback re-points the site to an earlier build.",
  "sql-runner": "Sample rows. The real SQL runner queries the PostgreSQL or Supabase connection you add, and asks before destructive statements.",
  "editor-peek": "Sample files in an editor shell. The workspace uses the Monaco editor served from Codexa.",
  "viewport-morph": "The real screenshot of the Analytics dashboard starter, resized to the preview's viewport presets.",
  "commit-list": "Sample commits. Pushing to GitHub needs GitHub OAuth configured by the operator.",
  "env-vars": "Sample variable names. Values are encrypted at rest and never sent back to the browser.",
  "presence-cursors": "Illustration of realtime presence: who is in which file. Several people editing one file at once is on the roadmap, not shipped.",
  "agent-modes": "Sample prompts and answers, with the agent's real tool names. Build edits files (after a snapshot), Ask answers without changing files, Fix targets a failing build or a specific error. No AI model is called here.",
  "validate-run": "Sample output. In a project the agent runs the project's own type-check, build or test commands in the sandbox, and reads any errors back.",
  "plan-steps": "A sample plan in the shape the agent records with its real propose_plan tool: short steps, in order, before it edits files. No AI model is called here; your plan and files will differ.",
  "repair-loop": "A scripted replay with the agent's real tool and stage names and its real repair limit. The error and file are samples; no AI model is called here.",
  "agent-run-site": "A scripted replay that uses the agent's real tool names and stage labels. No AI model is called here; in your project the plan, files and timing will differ, and AI generation needs an operator-configured key.",
  "agent-run-ui": "A scripted replay that uses the agent's real tool names and stage labels. No AI model is called here; in your project the plan, files and timing will differ, and AI generation needs an operator-configured key.",
  "editor-api": "Sample files from an Express API project in an editor shell. The workspace uses the Monaco editor served from Codexa.",
  "test-run": "Sample test output. In a project, tests run with the project's own test command in the sandbox.",
  "build-log": "Sample build output on a sample domain. Codexa hosting runs your build command in the sandbox and stores the log with the deployment.",
};

export const VIGNETTE_PROJECT: Partial<Record<IllustrationId, string>> = {
  "deploy-history": "invoice-tracker",
  "sql-runner": "customers-db",
  "viewport-morph": "analytics-dashboard",
  "build-log": "invoice-tracker",
  "editor-api": "invoices-api",
  "agent-run-site": "pottery-studio",
};

/**
 * The illustration plus an invisible copy pinned at its final frame (`playing={false}` never
 * starts), stacked in one grid cell. The final frame is the fullest one (every row, line and
 * summary shown), so the box keeps that height while the live copy plays: nothing around it
 * shifts as rows appear. `fill` stretches both to the box (flex-1) so short ones never float.
 */
function Reserved({ id, playing, fill = false }: { id: IllustrationId; playing?: boolean; fill?: boolean }) {
  const V = ILLUSTRATIONS[id];
  const cell = "col-start-1 row-start-1 flex min-w-0 flex-col";
  return (
    <div className={cn("grid", fill && "h-full flex-1")}>
      <div aria-hidden="true" inert className={cn(cell, "invisible")}>
        <V playing={false} className={fill ? "flex-1" : undefined} />
      </div>
      <div className={cell}>
        <V playing={playing} className={fill ? "flex-1" : undefined} />
      </div>
    </div>
  );
}

/**
 * A product illustration framed as the Codexa workspace window (e4), labelled as an illustration.
 * Server component: indexes the registry and renders it; the illustration itself is a small client
 * island that plays once in view (final frame on the server and when calm). Its height is reserved
 * at the final frame, so a hero never jumps while it plays.
 */
export function VignetteWindow({
  id,
  className,
  bodyClassName,
  playing,
  label = "Illustration",
  project,
}: {
  id: IllustrationId;
  className?: string;
  bodyClassName?: string;
  playing?: boolean;
  label?: string;
  project?: string;
}) {
  return (
    <AppWindow
      project={project ?? VIGNETTE_PROJECT[id] ?? "my-app"}
      className={cn("mk-vw", className)}
      toolbar={<IllustrationBadge label={label} detail={VIGNETTE_DETAIL[id]} />}
      bodyClassName={cn("bg-background/40 p-4 sm:p-6", bodyClassName)}
    >
      <Reserved id={id} playing={playing} />
    </AppWindow>
  );
}

/**
 * An illustration on a quiet framed surface, for bento tiles and inline rows (no window chrome).
 * It fills the plate's height (the plate can be stretched by a grid row) and keeps its final-frame
 * height while it plays.
 */
export function VignettePlate({ id, className, label = "Illustration" }: { id: IllustrationId; className?: string; label?: string }) {
  return (
    <div className={cn("mk-vw relative flex flex-col rounded-[14px] border border-border bg-background/50 p-4 shadow-[inset_0_1px_0_var(--hairline)] sm:p-5", className)}>
      <div className="mb-3 flex justify-end">
        <IllustrationBadge label={label} detail={VIGNETTE_DETAIL[id]} />
      </div>
      <Reserved id={id} fill />
    </div>
  );
}

/** Stages for <StoryScroll>: each illustration rendered on the server with its honesty note and project name. */
export function storyStages(ids: IllustrationId[]): StoryStage[] {
  return ids.map((id) => {
    const V = ILLUSTRATIONS[id];
    return { node: <V />, detail: VIGNETTE_DETAIL[id], project: VIGNETTE_PROJECT[id] ?? "my-app" };
  });
}
