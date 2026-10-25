"use client";

/** Lightweight cross-panel event bus for the workspace (same-tab). */
export type CodexaEvents = {
  "codexa:files-changed": { paths: string[]; source?: "editor" | "ai" | "runtime" | "snapshot" | "github" };
  "codexa:open-file": { path: string; line?: number };
  "codexa:runtime-status": { status: "starting" | "running" | "stopped" | "error" | "unavailable"; previewUrl?: string | null; error?: string | null };
  "codexa:run-command": { command: "start" | "stop" | "restart" | "install" | "build" };
  "codexa:ai-run": { runId: string; status: "running" | "succeeded" | "failed" | "cancelled" };
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
