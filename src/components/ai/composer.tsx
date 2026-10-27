"use client";

import * as React from "react";
import { ArrowUp, AtSign, FlaskConical, Hammer, MessageCircleQuestion, OctagonAlert, Square, Wrench, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCalm } from "@/lib/client/motion";
import type { AgentMode } from "./types";

const MODES: { id: AgentMode; label: string; hint: string; Icon: typeof Hammer }[] = [
  { id: "build", label: "Build", hint: "Plans, edits files and checks the result", Icon: Hammer },
  { id: "ask", label: "Ask", hint: "Answers questions without changing files", Icon: MessageCircleQuestion },
  { id: "fix", label: "Fix", hint: "Repairs the latest build or runtime error", Icon: Wrench },
];

export const FIX_DEFAULT_PROMPT = "Fix the latest build or runtime error in this project.";
export const COMPOSER_MAX = 8000;
const COUNTER_FROM = 7000;

export type ComposerContext = { activeFile: boolean; error: boolean };

const CONTEXT_FILE = /\n\nContext: I'm looking at `([^`\n]+)`\.(?=\n\n|$)/;
const CONTEXT_ERROR = /\n\nLatest error:\n```\n([\s\S]*?)\n```$/;

/** Split a sent prompt back into what the user typed and the context chips appended by `withContext`. */
export function splitContext(content: string): { text: string; file: string | null; error: string | null } {
  let text = content;
  const err = text.match(CONTEXT_ERROR);
  if (err) text = text.slice(0, err.index);
  const file = text.match(CONTEXT_FILE);
  if (file) text = text.slice(0, file.index) + text.slice((file.index ?? 0) + file[0].length);
  return { text, file: file?.[1] ?? null, error: err?.[1] ?? null };
}

/** Append the toggled context chips to the prompt, visibly (the message shows exactly what was sent). */
export function withContext(prompt: string, ctx: ComposerContext, activeFile: string | null | undefined, lastError: string | null | undefined, mode: AgentMode) {
  const extra: string[] = [];
  if (ctx.activeFile && activeFile) extra.push(`Context: I'm looking at \`${activeFile}\`.`);
  if (ctx.error && lastError && mode !== "fix") extra.push(`Latest error:\n\`\`\`\n${lastError.slice(0, 2000)}\n\`\`\``);
  return extra.length ? `${prompt}\n\n${extra.join("\n\n")}` : prompt;
}

export function Composer({
  value,
  onChange,
  mode,
  onModeChange,
  onSend,
  onCancel,
  running,
  disabled,
  disabledReason,
  lastError,
  textareaRef,
  model,
  activeFile,
  context,
  onContextChange,
  progress,
  queued,
  onClearQueued,
}: {
  value: string;
  onChange: (v: string) => void;
  mode: AgentMode;
  onModeChange: (m: AgentMode) => void;
  onSend: () => void;
  onCancel: () => void;
  running: boolean;
  disabled?: boolean;
  disabledReason?: string;
  lastError?: string | null;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
  /** The configured model (shown in the footer) or the mock badge. */
  model?: { name: string; provider: string; mock: boolean } | null;
  activeFile?: string | null;
  context?: ComposerContext;
  onContextChange?: (c: ComposerContext) => void;
  /** Share of the six run stages reached (0..1), for the Stop ring. */
  progress?: number;
  /** A request waiting for the current run to finish. */
  queued?: string | null;
  onClearQueued?: () => void;
}) {
  const calm = useCalm();
  const canSend = !disabled && !running && (value.trim().length > 0 || mode === "fix");
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };
  // Disabled with a reason (AI not configured): the reason is the placeholder and the hint line is
  // left to screen readers, since the chat column's empty state already explains it in full.
  const blocked = Boolean(disabled && disabledReason);
  const placeholder = blocked
    ? disabledReason
    : mode === "ask"
      ? "Ask a question about this project…"
      : mode === "fix"
        ? lastError
          ? "Optional: add details. Leave empty to fix the latest error."
          : "Describe the error to fix (no recent run error was recorded)."
        : "Describe what to build or change…";
  const current = MODES.find((m) => m.id === mode) ?? MODES[0];
  const ctx = context ?? { activeFile: false, error: false };
  const showErrorChip = Boolean(lastError) && mode !== "fix";
  const ring = 2 * Math.PI * 15;

  return (
    <form
      className="@container shrink-0 px-3 pb-3 pt-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSend();
      }}
    >
      {mode === "fix" && lastError ? (
        <details className="group mb-2 overflow-hidden rounded-xl border border-warning/35 bg-warning/[0.06] text-xs">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium [&::-webkit-details-marker]:hidden">
            <OctagonAlert className="size-3.5 text-warning" aria-hidden="true" />
            Latest error will be sent to the AI
          </summary>
          <pre className="max-h-32 overflow-auto border-t border-warning/25 px-3 py-2 font-mono text-[11px] text-muted-foreground">{lastError}</pre>
        </details>
      ) : null}
      {queued ? (
        <div className="ws-drop mb-2 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-1.5 text-[12px]" role="status">
          <span className="size-1.5 shrink-0 rounded-full bg-signal" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            <span className="font-medium">Queued:</span> <span className="text-muted-foreground">{queued}</span>
          </span>
          <span className="shrink-0 text-muted-foreground">sends when this run finishes</span>
          {onClearQueued ? (
            <button type="button" onClick={onClearQueued} aria-label="Remove the queued request" className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="ws-composer comet-border" data-active={running && !calm ? "" : undefined}>
        <div className={cn("comet-border__inner", (disabled || running) && "bg-surface")}>
          {(activeFile || showErrorChip) && onContextChange && !(disabled && disabledReason) ? (
            <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2.5" aria-label="Context sent with the message">
              {activeFile ? (
                <button
                  type="button"
                  aria-pressed={ctx.activeFile}
                  onClick={() => onContextChange({ ...ctx, activeFile: !ctx.activeFile })}
                  title={ctx.activeFile ? "The open file is mentioned in the message. Click to leave it out." : "Mention the open file in the message"}
                  className={cn(
                    "inline-flex h-6 max-w-[14rem] items-center gap-1 rounded-md px-1.5 font-mono text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                    ctx.activeFile ? "bg-muted text-foreground shadow-[inset_0_0_0_1px_var(--border-strong)]" : "text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] [border-style:dashed] hover:text-foreground",
                  )}
                >
                  <AtSign className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{activeFile}</span>
                </button>
              ) : null}
              {showErrorChip ? (
                <button
                  type="button"
                  aria-pressed={ctx.error}
                  onClick={() => onContextChange({ ...ctx, error: !ctx.error })}
                  title={ctx.error ? "The latest error is attached. Click to leave it out." : "Attach the latest error to the message"}
                  className={cn(
                    "inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                    ctx.error ? "bg-danger/10 text-danger shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--danger)_35%,transparent)]" : "text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:text-foreground",
                  )}
                >
                  <OctagonAlert className="size-3 shrink-0" aria-hidden="true" />
                  Latest error
                </button>
              ) : null}
            </div>
          ) : null}
          <label htmlFor="ai-composer" className="sr-only">
            Message to the AI
          </label>
          <textarea
            id="ai-composer"
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled || running}
            rows={3}
            maxLength={COMPOSER_MAX}
            className="block max-h-56 min-h-[96px] w-full resize-none bg-transparent px-3.5 pt-3 text-[15px] leading-relaxed outline-none [field-sizing:content] placeholder:text-muted-foreground/80 disabled:cursor-not-allowed disabled:placeholder:text-muted-foreground/70"
            aria-describedby="ai-composer-hint"
          />
          <div className="flex items-center gap-2 px-2 pb-2">
            <div role="radiogroup" aria-label="Mode" aria-describedby="ai-composer-hint" className="flex shrink-0 items-center rounded-[10px] bg-muted p-0.5 shadow-[inset_0_0_0_1px_var(--border)]">
              {MODES.map(({ id, label, hint, Icon }) => {
                const checked = mode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    aria-label={label}
                    title={`${label}: ${hint}`}
                    disabled={running || disabled}
                    data-no-ripple
                    onClick={() => onModeChange(id)}
                    onKeyDown={(e) => {
                      const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
                      if (!step) return;
                      e.preventDefault();
                      const i = MODES.findIndex((m) => m.id === mode);
                      const next = MODES[(i + step + MODES.length) % MODES.length];
                      onModeChange(next.id);
                      (e.currentTarget.parentElement?.querySelector(`[aria-label="${next.label}"]`) as HTMLElement | null)?.focus();
                    }}
                    tabIndex={checked ? 0 : -1}
                    className={cn(
                      "inline-flex h-7 items-center gap-1 rounded-[8px] px-2 text-[12px] font-medium transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60",
                      checked ? "bg-card text-foreground shadow-[var(--shadow-sm),inset_0_0_0_1px_var(--border)]" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden="true" />
                    <span className={cn(!checked && "sr-only")}>{label}</span>
                  </button>
                );
              })}
            </div>
            <div className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground">
              {model?.mock ? (
                <span className="ws-warn-ink inline-flex items-center gap-1 rounded-md bg-warning/12 px-1.5 py-0.5 font-medium" title="AI_MOCK=1 is set; responses are scripted and only available outside production.">
                  <FlaskConical className="size-3" aria-hidden="true" /> Mock AI<span className="hidden @[364px]:inline">&nbsp;(development only)</span>
                </span>
              ) : model ? (
                <span className="font-mono" title={`Provider: ${model.provider}`}>
                  {model.name}
                </span>
              ) : null}
            </div>
            {value.length > COUNTER_FROM ? (
              <span className={cn("shrink-0 font-mono text-[11px] tabular-nums", value.length >= COMPOSER_MAX ? "text-danger" : "text-warning")}>
                {value.length.toLocaleString("en-US")} / {COMPOSER_MAX.toLocaleString("en-US")}
                <span className="sr-only"> characters</span>
              </span>
            ) : null}
            {/* Announced once when the limit is reached, not on every keystroke near it. */}
            <span className="sr-only" role="status">
              {value.length >= COMPOSER_MAX ? `Character limit reached: ${COMPOSER_MAX.toLocaleString("en-US")}.` : ""}
            </span>
            {running ? (
              <button
                type="button"
                onClick={onCancel}
                aria-label="Cancel"
                title="Stop the run"
                className="ws-send relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-muted"
              >
                <svg className="pointer-events-none absolute inset-0 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="2" />
                  <circle className="ws-ring" cx="18" cy="18" r="15" fill="none" stroke="var(--signal)" strokeWidth="2" strokeLinecap="round" strokeDasharray={ring} strokeDashoffset={ring * (1 - Math.max(0.06, Math.min(1, progress ?? 0)))} />
                </svg>
                <Square className="size-3 fill-current" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                aria-label="Send"
                title="Send (Enter)"
                className="ws-send inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-[0_6px_18px_-8px_color-mix(in_oklab,var(--foreground)_60%,transparent)] hover:opacity-90 disabled:pointer-events-none disabled:opacity-25"
              >
                <ArrowUp className="size-[18px]" strokeWidth={2.25} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
      <p id="ai-composer-hint" className={cn("mt-1.5 flex items-center gap-1.5 truncate px-1 text-[11.5px] text-muted-foreground", blocked && "sr-only")}>
        {blocked ? (
          disabledReason
        ) : running ? (
          "Working… you can stop at any time."
        ) : (
          <>
            <span className="font-medium text-foreground/80">{current.label}</span> · {current.hint}
            <span className="ml-auto hidden shrink-0 @[460px]:inline">Enter to send · Shift+Enter for a new line</span>
          </>
        )}
      </p>
    </form>
  );
}
