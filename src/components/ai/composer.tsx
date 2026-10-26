"use client";

import * as React from "react";
import { ArrowUp, Hammer, MessageCircleQuestion, Square, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentMode } from "./types";

const MODES: { id: AgentMode; label: string; hint: string; Icon: typeof Hammer }[] = [
  { id: "build", label: "Build", hint: "Plan and edit files", Icon: Hammer },
  { id: "ask", label: "Ask", hint: "Answer questions without changing files", Icon: MessageCircleQuestion },
  { id: "fix", label: "Fix", hint: "Repair the latest build or runtime error", Icon: Wrench },
];

export const FIX_DEFAULT_PROMPT = "Fix the latest build or runtime error in this project.";

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
}) {
  const canSend = !disabled && !running && (value.trim().length > 0 || mode === "fix");
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };
  const placeholder =
    mode === "ask"
      ? "Ask a question about this project…"
      : mode === "fix"
        ? lastError
          ? "Optional: add details. Leave empty to fix the latest error."
          : "Describe the error to fix (no recent run error was recorded)."
        : "Describe what to build or change…";

  return (
    <form
      className="shrink-0 bg-background p-2 sm:p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSend();
      }}
    >
      {mode === "fix" && lastError ? (
        <details className="mb-2 rounded-lg border border-warning/40 bg-warning/5 text-xs">
          <summary className="cursor-pointer px-2.5 py-1.5 font-medium">Latest error will be sent to the AI</summary>
          <pre className="max-h-32 overflow-auto px-2.5 pb-2 font-mono text-[11px] text-muted-foreground">{lastError}</pre>
        </details>
      ) : null}
      <div
        className={cn(
          "rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] focus-within:border-border-strong focus-within:shadow-md",
          (disabled || running) && "bg-muted/40",
        )}
      >
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
          rows={2}
          maxLength={8000}
          className="block max-h-48 min-h-[64px] w-full resize-none bg-transparent px-3 pt-2.5 text-sm leading-relaxed outline-none [field-sizing:content] placeholder:text-muted-foreground disabled:cursor-not-allowed"
          aria-describedby="ai-composer-hint"
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <div role="radiogroup" aria-label="Mode" className="flex items-center rounded-lg bg-muted p-0.5">
            {MODES.map(({ id, label, hint, Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={mode === id}
                title={hint}
                disabled={running}
                onClick={() => onModeChange(id)}
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60",
                  mode === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          {running ? (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel"
              title="Cancel the run"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border-strong bg-background text-foreground transition-transform hover:bg-muted active:scale-95"
            >
              <Square className="size-3 fill-current" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send"
              title="Send (Enter)"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-[transform,opacity] hover:opacity-90 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <p id="ai-composer-hint" className="mt-1.5 truncate px-1 text-[11px] text-muted-foreground">
        {disabled && disabledReason ? disabledReason : running ? "Working… you can cancel at any time." : "Enter to send · Shift+Enter for a new line"}
      </p>
    </form>
  );
}
