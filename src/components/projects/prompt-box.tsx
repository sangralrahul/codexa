"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { projectsApi } from "@/lib/client/workspace/api";
import { stashInitialPrompt } from "@/lib/client/workspace/storage";
import { ClientApiError } from "@/lib/client/api";

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
    <section aria-label="Describe your idea">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="group/box rounded-2xl border border-border bg-card shadow-[0_1px_0_0_var(--hairline)_inset,0_20px_50px_-30px_rgba(0,0,0,0.35)] transition-[border-color,box-shadow] duration-300 focus-within:border-border-strong focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--foreground)_6%,transparent),0_20px_50px_-30px_rgba(0,0,0,0.35)]"
      >
        <label htmlFor="idea-prompt" className="sr-only">
          What do you want to build?
        </label>
        <textarea
          id="idea-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
          }}
          rows={3}
          maxLength={2000}
          placeholder="Describe your app, e.g. a kanban board for my team with drag and drop and a dark mode"
          aria-describedby="idea-hint"
          disabled={busy || !workspaceId}
          className="block min-h-[96px] w-full resize-none rounded-t-2xl bg-transparent px-5 pb-2 pt-4 text-[15px] leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-60"
        />
        <div className="flex items-center justify-between gap-3 px-3 pb-3 pl-5">
          <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
            <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Template: React starter</span>
            <Link href="/new-project" className="shrink-0 font-medium text-foreground/80 underline-offset-2 hover:text-foreground hover:underline">
              Change
            </Link>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              <kbd>Ctrl</kbd> <kbd>Enter</kbd>
            </span>
            <button
              type="submit"
              disabled={!prompt.trim() || !workspaceId || busy}
              aria-label="Start building"
              className="flex size-9 items-center justify-center rounded-full bg-foreground text-background transition-all hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="size-4" aria-hidden="true" />}
            </button>
          </span>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Example ideas">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setPrompt(ex)}
            disabled={!workspaceId}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
      <p id="idea-hint" className="mt-4 text-center text-xs text-muted-foreground">
        {!workspaceId
          ? "You need a workspace with edit access before creating projects."
          : aiConfigured
            ? "Codexa creates the project, opens the editor and hands your description to the AI agent."
            : "AI generation isn't set up on this server yet. The project is still created and your description is saved in the chat panel."}
      </p>
      {error ? (
        <p role="alert" className="pop-in mt-3 text-center text-sm text-danger">
          {error}
          {error.includes("Upgrade") ? (
            <Link href="/settings/billing" className="underline">
              View plans
            </Link>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
