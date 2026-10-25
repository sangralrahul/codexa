"use client";

import * as React from "react";
import { Hammer, MessageCircleQuestion, Send, Square, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Textarea } from "@/components/ui";
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
      className="border-t border-border bg-background p-2 sm:p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSend();
      }}
    >
      <div role="radiogroup" aria-label="Mode" className="mb-2 flex flex-wrap gap-1">
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
              "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60",
              mode === id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {mode === "fix" && lastError ? (
        <details className="mb-2 rounded-md border border-warning/40 bg-warning/5 text-xs">
          <summary className="cursor-pointer px-2 py-1 font-medium">Latest error will be sent to the AI</summary>
          <pre className="max-h-32 overflow-auto px-2 pb-2 font-mono text-[11px] text-muted-foreground">{lastError}</pre>
        </details>
      ) : null}
      <label htmlFor="ai-composer" className="sr-only">
        Message to the AI
      </label>
      <Textarea
        id="ai-composer"
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled || running}
        rows={3}
        maxLength={8000}
        className="min-h-[72px] resize-y"
        aria-describedby="ai-composer-hint"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <p id="ai-composer-hint" className="truncate text-[11px] text-muted-foreground">
          {disabled && disabledReason ? disabledReason : running ? "Working… you can cancel at any time." : "Enter to send · Shift+Enter for a new line"}
        </p>
        {running ? (
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            <Square className="size-3.5" aria-hidden="true" /> Cancel
          </Button>
        ) : (
          <Button type="submit" size="sm" disabled={!canSend}>
            <Send className="size-3.5" aria-hidden="true" /> Send
          </Button>
        )}
      </div>
    </form>
  );
}
