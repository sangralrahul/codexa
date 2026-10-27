"use client";

import { ClientApiError } from "@/lib/client/api";
import { projectsApi } from "@/lib/client/workspace/api";
import { stashInitialPrompt } from "@/lib/client/workspace/storage";
import { clearPendingIdea } from "@/lib/client/pending-idea";
import type { ProjectVisibility } from "@/lib/client/workspace/types";

export const PROMPT_MAX = 2000;

/** Project name from a prompt: its first sentence, at most 60 characters. */
export function projectNameFrom(text: string) {
  return text.split(/[.!?\n]/)[0].trim().slice(0, 60) || "New project";
}

/**
 * The one "build from a sentence" path (dashboard composer and ⌘K "Build … with Codexa"):
 * creates the project from the chosen template, then queues the prompt for the editor's AI
 * chat under `codexa:initialPrompt` (sessionStorage; ChatPanel reads it on first mount) and
 * clears the idea passport. The caller navigates to `/projects/<id>`.
 */
export async function createFromPrompt({ workspaceId, text, templateId, visibility }: { workspaceId: string; text: string; templateId: string; visibility?: ProjectVisibility }) {
  const prompt = text.trim().slice(0, PROMPT_MAX);
  const res = await projectsApi.create({ workspaceId, name: projectNameFrom(prompt), description: prompt.slice(0, 500), templateId, visibility });
  stashInitialPrompt(prompt);
  clearPendingIdea();
  return res.project;
}

export type CreateError = { message: string; quota: boolean };

/** User-facing message for a failed create; `quota` adds the "View plans" link. */
export function describeCreateError(err: unknown): CreateError {
  if (err instanceof ClientApiError) {
    if (err.code === "quota_exceeded" || err.status === 402) return { message: err.message, quota: true };
    if (err.status === 429) return { message: "You are creating projects too quickly. Try again in a few minutes.", quota: false };
    return { message: err.message, quota: false };
  }
  return { message: err instanceof Error ? err.message : "Could not create the project", quota: false };
}
