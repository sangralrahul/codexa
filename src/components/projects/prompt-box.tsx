"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Bot, ChevronDown, Check, Globe, LayoutDashboard, Loader2, Server, ShoppingBag, User } from "lucide-react";
import { projectsApi } from "@/lib/client/workspace/api";
import { stashInitialPrompt } from "@/lib/client/workspace/storage";
import { ClientApiError } from "@/lib/client/api";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { TemplateThumb } from "@/components/templates/template-thumb";
import { cn } from "@/lib/utils";

export type PromptTemplate = { id: string; name: string; category: string; frameworkName: string };
export type PromptPreset = { label: string; icon: keyof typeof PRESET_ICONS; prompt: string; templateId: string };

const PRESET_ICONS = { globe: Globe, dashboard: LayoutDashboard, bot: Bot, shop: ShoppingBag, user: User, server: Server };

const IDEAS = [
  "a habit tracker with streaks and weekly charts",
  "a landing page for a coffee subscription",
  "an internal tool to review support tickets",
  "an invoice tracker with GST totals",
  "a recipe app where I can save and tag recipes",
];

/** Placeholder that types example ideas while the box is empty (static under reduced motion). */
function useTypedPlaceholder(active: boolean) {
  const [text, setText] = useState(`Describe your app, e.g. ${IDEAS[0]}`);
  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let idea = 0;
    let pos = 0;
    let erasing = false;
    let timer = 0;
    const tick = () => {
      const full = IDEAS[idea];
      pos += erasing ? -1 : 1;
      setText(`Ask Codexa to build ${full.slice(0, Math.max(0, pos))}`);
      if (!erasing && pos >= full.length) {
        erasing = true;
        timer = window.setTimeout(tick, 2200);
        return;
      }
      if (erasing && pos <= 0) {
        erasing = false;
        idea = (idea + 1) % IDEAS.length;
      }
      timer = window.setTimeout(tick, erasing ? 18 : 42);
    };
    timer = window.setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, [active]);
  return text;
}

/**
 * "What do you want to build?" composer. Creates a project from the chosen template,
 * stores the prompt in sessionStorage under `codexa:initialPrompt` (the AI ChatPanel reads and
 * clears it on first mount) and opens the workspace.
 */
export function PromptBox({
  workspaceId,
  templateId: defaultTemplateId,
  templates = [],
  presets = [],
  aiConfigured,
}: {
  workspaceId: string | null;
  templateId: string;
  templates?: PromptTemplate[];
  presets?: PromptPreset[];
  aiConfigured: boolean;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const placeholder = useTypedPlaceholder(!prompt && Boolean(workspaceId));
  const template = templates.find((t) => t.id === templateId);

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
        className="glass rounded-[22px] border border-border/80 p-1.5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.45)] transition-[border-color,box-shadow] duration-300 focus-within:border-border-strong focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--foreground)_7%,transparent),0_30px_80px_-30px_rgba(0,0,0,0.45)]"
      >
        <div className="rounded-[18px] border border-border/60 bg-card/90">
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
            placeholder={placeholder}
            aria-describedby="idea-hint"
            disabled={busy || !workspaceId}
            className="block min-h-[104px] w-full resize-none rounded-t-[18px] bg-transparent px-5 pb-2 pt-4 text-[15px] leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-3 px-3 pb-3">
            {templates.length ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-8 min-w-0 items-center gap-2 rounded-full border border-border bg-background/70 pl-1 pr-2.5 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground data-[state=open]:border-border-strong data-[state=open]:text-foreground"
                    aria-label={`Template: ${template?.name ?? "React starter"}. Change template`}
                  >
                    <TemplateThumb category={template?.category ?? "web-apps"} className="w-9 shrink-0 rounded-full [&>div:first-child]:hidden [&>div:last-child]:p-0.5" />
                    <span className="truncate font-medium">{template?.name ?? "React starter"}</span>
                    <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto scrollbar-thin">
                  <DropdownMenuLabel>Start from</DropdownMenuLabel>
                  {templates.map((t) => (
                    <DropdownMenuItem key={t.id} onSelect={() => setTemplateId(t.id)} className="gap-3">
                      <TemplateThumb category={t.category} className="w-12 shrink-0 rounded-md [&>div:first-child]:hidden [&>div:last-child]:p-1" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px]">{t.name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{t.frameworkName}</span>
                      </span>
                      {t.id === templateId ? <Check className="size-4 shrink-0" aria-label="Selected" /> : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span />
            )}
            <span className="flex shrink-0 items-center gap-2.5">
              <span className="hidden text-[11px] text-muted-foreground sm:inline">
                <kbd>Ctrl</kbd> <kbd>Enter</kbd>
              </span>
              <button
                type="submit"
                disabled={!prompt.trim() || !workspaceId || busy}
                aria-label="Start building"
                className="flex size-9 items-center justify-center rounded-full bg-foreground text-background shadow-md transition-all hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
              >
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="size-4" aria-hidden="true" />}
              </button>
            </span>
          </div>
        </div>
      </form>
      {presets.length ? (
        <div className="mt-5 flex flex-wrap justify-center gap-2" aria-label="Quick starts">
          {presets.map((p, i) => {
            const Icon = PRESET_ICONS[p.icon];
            const on = p.templateId === templateId && prompt === p.prompt;
            return (
              <button
                key={p.label}
                type="button"
                data-reveal
                style={{ "--reveal-delay": `${120 + i * 60}ms` } as React.CSSProperties}
                onClick={() => {
                  setPrompt(p.prompt);
                  setTemplateId(p.templateId);
                  document.getElementById("idea-prompt")?.focus();
                }}
                disabled={!workspaceId}
                aria-pressed={on}
                className={cn(
                  "eyebrow-pill inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] transition-[color,border-color,transform] duration-200 hover:-translate-y-0.5 disabled:opacity-50",
                  on ? "border-foreground text-foreground" : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {p.label}
              </button>
            );
          })}
        </div>
      ) : null}
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
