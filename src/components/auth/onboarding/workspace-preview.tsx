"use client";

import * as React from "react";
import { FolderKanban, LayoutDashboard, LayoutTemplate, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo";
import { Avatar } from "@/components/ui/avatar";
import { StarterShot } from "./starter-shot";
import { useTypewriter } from "@/components/motion/timeline";
import { TEMPLATE_SHOTS, templateShotSrc, templateShotSrcSet } from "@/components/templates/shots";

export type PreviewState = {
  workspaceName: string;
  userName: string;
  /** The person's avatar seed, the same one the account menu uses (stored name, else email), so every avatar here matches it. */
  avatarSeed?: string;
  projectName: string;
  template: { id: string; name: string; category: string } | null;
  prompt: string;
  /** The prompt box has focus: the chat bubble shows a signal caret. */
  typing: boolean;
  mode: "prompt" | "template";
};

/** The project thumbnail: the chosen starter's real screenshot, developing in when it changes. */
function Thumb({ template, className, sizes }: { template: PreviewState["template"]; className?: string; sizes: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[10px] bg-surface", className)}>
      {template ? (
        <div key={template.id} className="ob-shot-in">
          <StarterShot id={template.id} category={template.category} sizes={sizes} priority />
        </div>
      ) : (
        <div className="aspect-[16/10] w-full">
          <div className="bg-blueprint absolute inset-0" />
        </div>
      )}
    </div>
  );
}

/** The 20×13 thumbnail of a sidebar "Recent" row: the starter's screenshot, or a code tile for API starters. */
function MiniThumb({ template }: { template: PreviewState["template"] }) {
  if (template && TEMPLATE_SHOTS.has(template.id)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img key={template.id} src={templateShotSrc(template.id)} srcSet={templateShotSrcSet(template.id)} sizes="20px" alt="" width={20} height={13} decoding="async" className="ob-shot-in h-[13px] w-5 shrink-0 rounded-[3px] object-cover object-top shadow-[0_0_0_1px_var(--border)]" />
    );
  }
  return <span className="h-[13px] w-5 shrink-0 rounded-[3px] bg-code-bg shadow-[0_0_0_1px_var(--border)]" />;
}

/**
 * "Your workspace, assembling live" (PLAN §5.5): a small app window built from the real
 * app-shell pieces. The workspace name types in once, the project card shows the chosen
 * starter's real screenshot, and the first chat message mirrors the description as it is
 * typed. It depicts the choices made on the left; nothing here is generated.
 * `variant="strip"` is the 120px summary shown below lg.
 */
export function WorkspacePreview({ state, variant = "window", className }: { state: PreviewState; variant?: "window" | "strip"; className?: string }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const ws = useTypewriter(state.workspaceName, { playing: mounted, cps: 30, startDelayMs: 300 });
  const wsTyping = ws.length < state.workspaceName.length;
  const project = state.projectName || "Your first project";

  if (variant === "strip") {
    return (
      <figure className={cn("e1 flex h-[120px] items-center gap-3.5 overflow-hidden rounded-2xl p-2.5 pr-4", className)}>
        <div aria-hidden="true" className="w-[150px] shrink-0">
          <Thumb template={state.template} sizes="150px" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-label truncate text-muted-foreground">{state.workspaceName}</p>
          <p className="mt-1.5 truncate text-sm font-semibold text-foreground">{project}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
            {state.prompt ? state.prompt : state.template ? `Starts from ${state.template.name}` : "Pick a goal or describe your app."}
          </p>
        </div>
        <figcaption className="sr-only">Preview of your workspace</figcaption>
      </figure>
    );
  }

  return (
    <figure className={cn("relative", className)}>
      <div aria-hidden="true" className="e4 overflow-hidden bg-card">
        {/* Top bar */}
        <div className="flex h-11 items-center gap-2.5 border-b border-border bg-surface/70 px-3.5">
          <LogoMark size={20} />
          <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
            {ws}
            {wsTyping ? <span className="caret" /> : null}
          </span>
          <span className="text-[13px] text-border-strong">/</span>
          <span className="text-[13px] text-muted-foreground">Projects</span>
          <Avatar name={state.userName} seed={state.avatarSeed} size="sm" className="ml-auto" />
        </div>
        <div className="grid min-h-[380px] grid-cols-[140px_minmax(0,1fr)] xl:grid-cols-[156px_minmax(0,1fr)]">
          {/* Sidebar: the real nav items, then "Recent" with the project being set up (as the app's sidebar lists it). */}
          <div className="border-r border-border bg-surface/50 p-2.5">
            {[
              { label: "Dashboard", Icon: LayoutDashboard },
              { label: "Projects", Icon: FolderKanban, active: true },
              { label: "Templates", Icon: LayoutTemplate },
              { label: "Settings", Icon: Settings },
            ].map(({ label, Icon, active }) => (
              <span key={label} className={cn("flex h-8 items-center gap-2 rounded-lg px-2 text-[12.5px]", active ? "bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)]" : "text-muted-foreground")}>
                <Icon className="size-3.5" />
                {label}
              </span>
            ))}
            <p className="mt-5 px-2 text-[11px] font-medium text-muted-foreground">Recent</p>
            <span className="mt-1 flex h-8 min-w-0 items-center gap-2 rounded-lg px-2 text-[12.5px] text-foreground">
              <MiniThumb template={state.template} />
              <span key={project} className="ob-swap min-w-0 truncate">
                {project}
              </span>
            </span>
          </div>
          {/* Main */}
          <div className="min-w-0 space-y-4 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-foreground">Projects</p>
              <span className="text-meta text-muted-foreground">1 project</span>
            </div>
            <div className="rounded-xl border border-border bg-card p-2 shadow-sm">
              <Thumb template={state.template} sizes="440px" />
              <div className="flex items-center gap-2 px-1 pb-0.5 pt-2.5">
                <span key={project} className="ob-swap min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                  {project}
                </span>
                <span className="text-meta shrink-0 text-muted-foreground">Just now</span>
              </div>
              <p className="truncate px-1 pb-1 text-xs text-muted-foreground">{state.template ? `From ${state.template.name}` : "Pick a starter"}</p>
            </div>
            {/* First chat message */}
            <div className="flex items-start gap-2">
              <Avatar name={state.userName} seed={state.avatarSeed} size="xs" className="mt-1" />
              <div className={cn("min-w-0 flex-1 rounded-2xl rounded-tl-md px-3 py-2 text-[12.5px] leading-relaxed shadow-[inset_0_0_0_1px_var(--border)]", state.prompt ? "bg-muted text-foreground" : "bg-transparent text-muted-foreground")}>
                <span className="line-clamp-4 whitespace-pre-line">
                  {state.prompt || (state.mode === "template" ? "Your first message to the agent goes here when you describe a change." : "Your description becomes the first message to the agent.")}
                  {state.typing ? <span className="caret" /> : null}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-signal" />
        Preview of your workspace · it follows your choices
      </figcaption>
    </figure>
  );
}
