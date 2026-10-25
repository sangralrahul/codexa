"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { projectsApi } from "@/lib/client/workspace/api";
import { stashInitialPrompt } from "@/lib/client/workspace/storage";
import { ClientApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

const EXAMPLES = ["A habit tracker with streaks and weekly charts", "A landing page for a coffee subscription", "An internal tool to review support tickets"];

/**
 * "Describe your idea" box. Creates a project from the default Vite + React starter,
 * stores the prompt in sessionStorage under `codexa:initialPrompt` (the AI ChatPanel reads and
 * clears it on first mount) and opens the workspace.
 */
export function PromptBox({ workspaceId, templateId, aiConfigured }: { workspaceId: string | null; templateId: string; aiConfigured: boolean }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const text = prompt.trim();
    if (!text || !workspaceId) return;
    setBusy(true);
    setError(null);
    try {
      const name = text.split(/[.!?\n]/)[0].trim().slice(0, 60) || "New project";
      const res = await projectsApi.create({ workspaceId, name, description: text.slice(0, 500), templateId });
      stashInitialPrompt(text);
      router.push(`/projects/${res.project.id}`);
    } catch (err) {
      if (err instanceof ClientApiError && err.code === "quota_exceeded") setError(`${err.message} `);
      else setError(err instanceof Error ? err.message : "Could not create the project");
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="prompt-box-title" className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm">
      <h2 id="prompt-box-title" className="flex items-center gap-2 text-base font-semibold">
        <Sparkles className="size-4 text-primary" aria-hidden="true" /> Describe your idea
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">We create a starter project and hand your description to the AI builder in the workspace.</p>
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label htmlFor="idea-prompt" className="sr-only">
          What do you want to build?
        </label>
        <Textarea
          id="idea-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
          }}
          rows={3}
          maxLength={2000}
          placeholder="e.g. A kanban board for my team with drag and drop and a dark mode"
          aria-describedby="idea-hint"
          disabled={busy || !workspaceId}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5" aria-label="Example ideas">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setPrompt(ex)} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-border-strong hover:text-foreground">
                {ex}
              </button>
            ))}
          </div>
          <Button type="submit" loading={busy} disabled={!prompt.trim() || !workspaceId}>
            Start building <ArrowRight className="size-4" />
          </Button>
        </div>
        <p id="idea-hint" className="mt-2 text-xs text-muted-foreground">
          {!workspaceId
            ? "You need a workspace before creating projects."
            : aiConfigured
              ? "Ctrl/⌘+Enter to submit. The AI builder starts from your description once the workspace opens."
              : "AI generation is not configured on this server (set ANTHROPIC_API_KEY or OPENAI_API_KEY). The project is still created and your description is kept for the chat panel."}
        </p>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
            {error.includes("Upgrade") ? (
              <Link href="/settings/billing" className="underline">
                View plans
              </Link>
            ) : null}
          </p>
        ) : null}
      </form>
    </section>
  );
}
