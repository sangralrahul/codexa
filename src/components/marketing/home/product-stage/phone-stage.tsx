import * as React from "react";
import { ArrowUp, Globe, Lock, MessageSquare, Code2, Eye, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo";
import { CodeLines } from "@/components/vignettes/code-lines";
import { StepRow } from "@/components/vignettes/step-row";
import { TemplatePreview } from "@/components/templates/template-preview";
import { templateShotFor } from "@/components/templates/shots";
import type { Token } from "@/components/vignettes/tokenize";
import type { Scenario } from "../types";
import { StarterContext, ToolRow } from "./agent-pane";
import { phoneTabFor, type StageFrame } from "./script";
import { StatusPill } from "./status-pill";

const TABS = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "code", label: "Code", icon: Code2 },
  { id: "preview", label: "Preview", icon: Eye },
] as const;

/**
 * The stage below md (PLAN §5.2): one pane no taller than 520px — prompt bubble and agent
 * steps (Chat), the main file and terminal (Code), or the real starter screenshot (Preview).
 * The tabs follow the chapter; the visitor can tap one to look (until the chapter changes).
 */
export function PhoneStage({
  frame,
  scenario,
  tokens,
  typed,
  illustrative,
  tab,
  onTab,
}: {
  frame: StageFrame;
  scenario: Scenario;
  tokens: Token[][];
  typed: string;
  illustrative: string;
  tab: "chat" | "code" | "preview" | null;
  onTab: (t: "chat" | "code" | "preview") => void;
}) {
  const shown = tab ?? phoneTabFor(frame.chapter);
  const rows = [...(frame.contextFolded ? [] : frame.context), ...frame.writes, ...frame.checks];
  const longThread = frame.finished || rows.length + (frame.contextFolded ? 1 : 0) > 4;
  const composing = !frame.sent && typed.length > 0;
  const live = frame.publish === "live";
  return (
    <div className="e4 flex h-[min(520px,calc(100svh-120px))] min-h-[440px] flex-col overflow-hidden text-[13px]">
      <div className="glass relative z-[1] flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
        <LogoMark size={18} />
        <span className="min-w-0 truncate font-medium">{scenario.slug}</span>
        <span className="ml-auto shrink-0">
          <StatusPill status={frame.status} />
        </span>
      </div>
      {/* Chapter-following tabs (real buttons; the rest of the stage is decorative). */}
      <div className="relative grid shrink-0 grid-cols-3 gap-1 border-b border-border bg-surface/60 p-1.5" role="group" aria-label="Stage view">
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 left-1.5 w-[calc((100%-12px-8px)/3)] rounded-[8px] bg-card shadow-[var(--shadow-sm),inset_0_0_0_1px_var(--border)] transition-transform duration-[380ms] ease-snap calm:transition-none"
          style={{ transform: `translateX(calc(${TABS.findIndex((t) => t.id === shown)} * (100% + 4px)))` }}
        />
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={shown === t.id}
            onClick={() => onTab(t.id)}
            data-no-ripple
            className={cn("relative z-[1] inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] text-[12.5px] font-medium transition-colors", shown === t.id ? "text-foreground" : "text-muted-foreground")}
          >
            <t.icon className="size-3.5" aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      <div aria-hidden="true" className="relative min-h-0 flex-1 overflow-hidden">
        {shown === "chat" ? (
          <div key="chat" className="stage-swap absolute inset-0 flex flex-col">
            {/* Thread: a fresh conversation stacks from the top (the welcome sits centred until the prompt is sent);
                once the run is long, the newest items stay in view at the bottom under a fade. */}
            <div className={cn("flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden p-3 pt-4", longThread ? "justify-end [mask-image:linear-gradient(to_bottom,transparent,black_24px)]" : "justify-start")}>
              {!frame.sent ? (
                <div className="my-auto flex flex-col items-center gap-3 text-center">
                  <LogoMark size={26} />
                  <p className="font-display text-[21px] font-semibold leading-tight tracking-[-0.02em] [font-stretch:104%]">
                    What should we <span className="text-dim">build</span> next?
                  </p>
                  <div className="mt-1 flex w-full max-w-[17rem] items-center gap-2.5 rounded-[12px] border border-border bg-card p-1.5 text-left shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={templateShotFor(scenario.id, 144)} alt="" width={72} height={45} loading="lazy" decoding="async" className="h-[45px] w-[72px] shrink-0 rounded-[7px] bg-white object-cover object-left-top shadow-[0_0_0_1px_var(--border)]" />
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-medium">{scenario.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        Starter · {scenario.fileCount} files
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <StarterContext scenario={scenario} className="shrink-0" />
                  <div className="ml-8 shrink-0 rounded-2xl rounded-tr-md bg-muted px-3 py-2 text-[12.5px] leading-relaxed shadow-[inset_0_0_0_1px_var(--border)] [animation:pop-in_var(--dur-4)_var(--ease-out)_both]">
                    {scenario.prompt}
                  </div>
                </>
              )}
              {frame.working || frame.finished ? (
                <div className="shrink-0 rounded-[12px] border border-border bg-card p-2.5">
                  <div className="mb-1.5 flex items-center gap-2">
                    <LogoMark size={16} state={frame.finished ? "success" : "running"} />
                    <span className={cn("text-[12px] font-medium", frame.working && "text-shimmer")}>{frame.stage ?? "Working"}</span>
                  </div>
                  <ol>
                    {frame.contextFolded ? <StepRow state="done" className="py-[3px]" label="Read the project and wrote a plan" /> : null}
                    {rows.slice(-6).map((r, i, arr) => (
                      <ToolRow key={r.key} row={r} connector={i < arr.length - 1} illustrative={illustrative} />
                    ))}
                  </ol>
                </div>
              ) : null}
              {frame.finished ? (
                <p className="flex shrink-0 gap-2 rounded-[12px] bg-surface px-2.5 py-2 text-[12px] leading-relaxed shadow-[inset_0_0_0_1px_var(--border)]">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0 text-signal" />
                  Type-check and build passed. A snapshot was saved first.
                </p>
              ) : null}
            </div>
            {/* Composer: the prompt types in here (as in the desktop window), then moves up as the bubble. */}
            <div className="shrink-0 border-t border-border bg-surface/40 p-2.5">
              <div className={cn("flex items-end gap-2 rounded-[12px] border bg-background/70 py-2 pl-3 pr-2 text-[12.5px] leading-relaxed transition-[border-color] duration-(--dur-3)", composing ? "border-border-strong" : "border-border")}>
                <p className={cn("line-clamp-2 min-h-[1.6em] min-w-0 flex-1", composing ? "text-foreground" : "text-muted-foreground")}>
                  {composing ? (
                    <>
                      {typed}
                      {typed.length < scenario.prompt.length ? <span className="caret" /> : null}
                    </>
                  ) : (
                    "Ask Codexa to change something…"
                  )}
                </p>
                <span className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-(--dur-2)", composing && typed.length >= scenario.prompt.length ? "bg-signal text-[var(--ember-ink)]" : "bg-muted text-muted-foreground")}>
                  <ArrowUp className="size-3.5" />
                </span>
              </div>
            </div>
          </div>
        ) : shown === "code" ? (
          <div key="code" className="stage-swap absolute inset-0 flex flex-col bg-code-bg">
            <div className="flex h-8 shrink-0 items-center gap-2 border-b border-code-border px-3 font-mono text-[11px] text-code-fg/85">
              <span className="size-1.5 rounded-full bg-syn-fn" />
              {scenario.mainFile}
              {frame.errorLine !== null ? <span className="ml-auto text-[10px] uppercase tracking-[0.1em] text-syn-tag">{illustrative}</span> : null}
            </div>
            <div className="min-h-0 flex-1 overflow-hidden py-2">
              {frame.revealed > 0 ? (
                <CodeLines
                  tokens={tokens.slice(0, 12)}
                  startLine={scenario.codeStart}
                  revealed={frame.streaming ? Math.min(12, frame.revealed) : undefined}
                  caret={frame.streaming}
                  errorLines={frame.errorLine !== null ? [scenario.codeStart + frame.errorLine - 1] : undefined}
                  highlight={frame.fixedLine !== null ? [scenario.codeStart + frame.fixedLine - 1] : undefined}
                  className="text-[11.5px]"
                />
              ) : (
                <p className="px-3 font-mono text-[11px] text-code-muted">
                  {frame.writing ? `Writing ${frame.writing}` : "Waiting for the agent…"}
                  <span className="caret" />
                </p>
              )}
            </div>
            {frame.terminal.length ? (
              <div className="shrink-0 border-t border-code-border px-3 py-2 font-mono text-[11px] leading-[1.6]">
                {frame.terminal.slice(-3).map((l, i) => (
                  <p key={`${frame.terminal.length}-${i}`} className={cn("truncate", l.tone === "error" ? "text-syn-tag" : l.tone === "ok" ? "text-syn-string" : l.tone === "warn" ? "text-syn-number" : "text-code-fg/80")}>
                    {l.text}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div key="preview" className="stage-swap absolute inset-0 flex flex-col gap-2 bg-surface/50 p-3">
            <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 font-mono text-[11px] shadow-[inset_0_0_0_1px_var(--border)]">
              {live ? <Globe className="size-3 text-success" /> : <Lock className="size-3 text-muted-foreground" />}
              <span className="truncate">{live ? `${scenario.slug}.example.com` : `${scenario.slug}.preview.example.com`}</span>
              {live ? <span className="live-dot ml-auto" /> : null}
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[12px] border border-border-strong bg-card shadow-md">
              {frame.previewShown ? (
                <div className={cn("size-full", frame.previewWipe && "wipe-in")}>
                  <TemplatePreview id={scenario.id} category={scenario.categoryName} sizes="92vw" className="size-full rounded-none border-0 shadow-none" imgClassName="size-full aspect-auto object-cover object-left-top" />
                </div>
              ) : (
                <div className="flex size-full items-center justify-center p-4">
                  {frame.boot ? (
                    <ol className="w-full max-w-[16rem]">
                      <StepRow state={frame.boot.container} label="Starting container" connector />
                      <StepRow state={frame.boot.server} label="Dev server" detail={scenario.devCommand} />
                    </ol>
                  ) : (
                    <span className="text-[12px] text-muted-foreground">Preview starts after validation</span>
                  )}
                </div>
              )}
            </div>
            {frame.versionsVisible ? (
              <p className="flex shrink-0 items-center gap-2 text-[11.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-1.5 py-0.5 font-medium text-success">
                  <span className="live-dot" /> Live
                </span>
                v2 published · sample domain
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
