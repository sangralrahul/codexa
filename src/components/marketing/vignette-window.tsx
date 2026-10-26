import * as React from "react";
import { AppWindow } from "@/components/frames/app-window";
import { IllustrationBadge } from "@/components/frames/illustration-badge";
import { VIGNETTES, type VignetteId } from "@/components/vignettes/registry";
import { cn } from "@/lib/utils";
import type { StoryStage } from "./story-scroll";

/** What each vignette depicts, for the honesty popover (PLAN §4.4). */
export const VIGNETTE_DETAIL: Record<VignetteId, string> = {
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
};

export const VIGNETTE_PROJECT: Partial<Record<VignetteId, string>> = {
  "deploy-history": "invoice-tracker",
  "sql-runner": "customers-db",
  "viewport-morph": "analytics-dashboard",
};

/**
 * A product vignette framed as the Codexa workspace window (e4), labelled as an illustration.
 * Server component: indexes the vignette registry and renders it; the vignette itself is a small
 * client island that plays once in view (final frame on the server and when calm).
 */
export function VignetteWindow({
  id,
  className,
  bodyClassName,
  playing,
  label = "Illustration",
  project,
}: {
  id: VignetteId;
  className?: string;
  bodyClassName?: string;
  playing?: boolean;
  label?: string;
  project?: string;
}) {
  const V = VIGNETTES[id];
  return (
    <AppWindow
      project={project ?? VIGNETTE_PROJECT[id] ?? "my-app"}
      className={className}
      toolbar={<IllustrationBadge label={label} detail={VIGNETTE_DETAIL[id]} />}
      bodyClassName={cn("bg-background/40 p-4 sm:p-6", bodyClassName)}
    >
      <V playing={playing} />
    </AppWindow>
  );
}

/** A vignette on a quiet framed surface, for bento tiles and inline rows (no window chrome). */
export function VignettePlate({ id, className, label = "Illustration" }: { id: VignetteId; className?: string; label?: string }) {
  const V = VIGNETTES[id];
  return (
    <div className={cn("relative rounded-[14px] border border-border bg-background/50 p-4 shadow-[inset_0_1px_0_var(--hairline)] sm:p-5", className)}>
      <div className="mb-3 flex justify-end">
        <IllustrationBadge label={label} detail={VIGNETTE_DETAIL[id]} />
      </div>
      <V />
    </div>
  );
}

/** Stages for <StoryScroll>: each vignette rendered on the server with its honesty note and project name. */
export function storyStages(ids: VignetteId[]): StoryStage[] {
  return ids.map((id) => {
    const V = VIGNETTES[id];
    return { node: <V />, detail: VIGNETTE_DETAIL[id], project: VIGNETTE_PROJECT[id] ?? "my-app" };
  });
}
