"use client";

import * as React from "react";
import { ArrowUp, AtSign, Check, ChevronDown, FlaskConical, Hammer, ImagePlus, ListChecks, Loader2, MessageCircleQuestion, OctagonAlert, Sparkles, Square, Undo2, Wrench, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { useCalm } from "@/lib/client/motion";
import { addImages, dataUrlOf, IMAGE_ACCEPT, imageFilesFrom, MAX_PROMPT_IMAGES, type PromptImage } from "@/lib/client/attachments";
import type { AgentMode } from "./types";

const MODES: { id: AgentMode; label: string; hint: string; Icon: typeof Hammer }[] = [
  { id: "build", label: "Build", hint: "Plans, edits files and checks the result", Icon: Hammer },
  { id: "plan", label: "Plan", hint: "Proposes a plan for you to approve; nothing changes until you do", Icon: ListChecks },
  { id: "ask", label: "Ask", hint: "Answers questions without changing files", Icon: MessageCircleQuestion },
  { id: "fix", label: "Fix", hint: "Repairs the latest build or runtime error", Icon: Wrench },
];

export const FIX_DEFAULT_PROMPT = "Fix the latest build or runtime error in this project.";
export const IMAGE_DEFAULT_PROMPT = "Build this from the attached image.";
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
  images,
  onImagesChange,
  onEnhance,
  enhancing,
  onUndoEnhance,
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
  /** Attached images (screenshots, designs); the attach button shows when onImagesChange is set. */
  images?: PromptImage[];
  onImagesChange?: (images: PromptImage[]) => void;
  /** Rewrite the draft into a detailed brief; the button shows when set. */
  onEnhance?: () => void;
  enhancing?: boolean;
  /** Set right after an enhance: puts the original text back. */
  onUndoEnhance?: () => void;
}) {
  const calm = useCalm();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [attachError, setAttachError] = React.useState<string | null>(null);
  const imgs = images ?? [];
  const canAttach = Boolean(onImagesChange) && mode !== "ask";
  const attach = async (files: File[]) => {
    if (!onImagesChange || !files.length) return;
    const { images: next, error } = await addImages(imgs, files);
    onImagesChange(next);
    setAttachError(error);
  };
  const canSend = !disabled && !running && !enhancing && (value.trim().length > 0 || mode === "fix" || (canAttach && imgs.length > 0));
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
        : mode === "plan"
          ? "Describe what you want. Codexa proposes a plan first…"
          : canAttach
            ? "Describe what to build or change, or paste a screenshot…"
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
      onDragOver={(e) => {
        if (!canAttach || running || disabled || !Array.from(e.dataTransfer.types).includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        if (!canAttach || running || disabled) return;
        e.preventDefault();
        setDragging(false);
        void attach(imageFilesFrom(e.dataTransfer));
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

      <div className={cn("ws-composer comet-border", dragging && "rounded-2xl outline-2 outline-offset-2 outline-dashed outline-ring")} data-active={running && !calm ? "" : undefined}>
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
          {canAttach && imgs.length ? (
            <ul className="flex flex-wrap gap-2 px-3 pt-3" aria-label="Attached images">
              {imgs.map((img) => (
                <li key={img.id} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                  <img src={dataUrlOf(img)} alt={img.name} className="size-14 rounded-lg object-cover shadow-[0_0_0_1px_var(--border-strong)]" />
                  <button
                    type="button"
                    onClick={() => onImagesChange?.(imgs.filter((i) => i.id !== img.id))}
                    aria-label={`Remove ${img.name}`}
                    disabled={running}
                    className="absolute -right-1.5 -top-1.5 inline-flex size-5 items-center justify-center rounded-full bg-foreground text-background shadow-md hover:opacity-90"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
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
            onPaste={(e) => {
              if (!canAttach) return;
              const files = imageFilesFrom(e.clipboardData);
              if (!files.length) return;
              e.preventDefault();
              void attach(files);
            }}
            placeholder={placeholder}
            disabled={disabled || running}
            rows={3}
            maxLength={COMPOSER_MAX}
            className="block max-h-56 min-h-[96px] w-full resize-none bg-transparent px-3.5 pt-3 text-[15px] leading-relaxed outline-none [field-sizing:content] placeholder:text-muted-foreground/80 disabled:cursor-not-allowed disabled:placeholder:text-muted-foreground/70"
            aria-describedby="ai-composer-hint"
          />
          <div className="flex items-center gap-2 px-2 pb-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={running || disabled}>
                <button
                  type="button"
                  aria-label={`Mode: ${current.label}. Change mode`}
                  aria-describedby="ai-composer-hint"
                  data-no-ripple
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-muted px-2.5 text-[12.5px] font-medium shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
                >
                  <current.Icon className="size-3.5" aria-hidden="true" />
                  {current.label}
                  <ChevronDown className="size-3 text-muted-foreground" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-72">
                <DropdownMenuRadioGroup value={mode} onValueChange={(v) => onModeChange(v as AgentMode)}>
                  {MODES.map(({ id, label, hint, Icon }) => (
                    <DropdownMenuRadioItem key={id} value={id} className="items-start gap-2.5 py-2 pl-2 [&>span:first-child]:hidden">
                      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] text-foreground">{label}</span>
                        <span className="block text-[11.5px] leading-snug text-muted-foreground">{hint}</span>
                      </span>
                      {id === mode ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : null}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {canAttach ? (
              <>
                <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} multiple hidden onChange={(e) => {
                  void attach(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={running || disabled || imgs.length >= MAX_PROMPT_IMAGES}
                  aria-label="Attach images"
                  title={`Attach a screenshot, sketch or design (up to ${MAX_PROMPT_IMAGES}). You can also paste or drop images.`}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40"
                >
                  <ImagePlus className="size-4" aria-hidden="true" />
                </button>
              </>
            ) : null}
            {onEnhance && (mode === "build" || mode === "plan") ? (
              onUndoEnhance && !enhancing ? (
                <button type="button" onClick={onUndoEnhance} disabled={running} title="Put your original text back" className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                  <Undo2 className="size-3.5" aria-hidden="true" /> Undo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onEnhance}
                  disabled={running || disabled || enhancing || value.trim().length < 3}
                  title="Turn your idea into a detailed brief before sending"
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40"
                >
                  {enhancing ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="size-3.5" aria-hidden="true" />}
                  <span className="hidden @[420px]:inline">{enhancing ? "Enhancing…" : "Enhance"}</span>
                  <span className="sr-only @[420px]:hidden">Enhance prompt</span>
                </button>
              )
            ) : null}
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
      {attachError ? (
        <p role="alert" className="mt-1.5 flex items-center gap-1.5 px-1 text-[12px] text-danger">
          {attachError}
          <button type="button" onClick={() => setAttachError(null)} aria-label="Dismiss" className="rounded p-0.5 hover:bg-muted">
            <X className="size-3" aria-hidden="true" />
          </button>
        </p>
      ) : null}
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
