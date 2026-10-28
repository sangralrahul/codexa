"use client";

/** Lightweight cross-panel event bus for the workspace (same-tab). */
export type CodexaEvents = {
  "codexa:files-changed": { paths: string[]; source?: "editor" | "ai" | "runtime" | "snapshot" | "github" | "visual" };
  "codexa:open-file": { path: string; line?: number };
  "codexa:runtime-status": { status: "starting" | "running" | "stopped" | "error" | "unavailable"; previewUrl?: string | null; error?: string | null };
  "codexa:run-command": { command: "start" | "stop" | "restart" | "install" | "build" };
  "codexa:ai-run": { runId: string; status: "running" | "succeeded" | "failed" | "cancelled" };
  /** Emitted by the preview panel's "Ask AI to fix" button. */
  "codexa:ai-fix-request": { error: string; logs?: string[] };
  /** Emitted by panels that want the chat to ask something (e.g. explain a SQL error). */
  "codexa:ai-ask": { text: string };
  /** Send a prompt to the agent as is (the mobile mini composer on the Preview tab). Queued if a run is active. */
  "codexa:ai-send": { text: string; mode?: "build" | "ask" | "fix" | "plan" };
  /** Workspace-level requests to the agent column (palette, header). */
  "codexa:agent-command": { command: "new-chat" | "focus" };
  /** A snapshot restore or run revert replaced files (the editor plays the diff wipe on the open file). */
  "codexa:restored": { paths: string[]; label: string };
};

export function emit<K extends keyof CodexaEvents>(name: K, detail: CodexaEvents[K]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function on<K extends keyof CodexaEvents>(name: K, cb: (detail: CodexaEvents[K]) => void) {
  if (typeof window === "undefined") return () => {};
  const h = (e: Event) => cb((e as CustomEvent<CodexaEvents[K]>).detail);
  window.addEventListener(name, h);
  return () => window.removeEventListener(name, h);
}
