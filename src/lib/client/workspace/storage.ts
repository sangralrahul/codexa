"use client";

/**
 * Per-viewer conveniences persisted in localStorage (panel sizes, open tabs).
 * Every access is guarded: private windows and blocked storage must never break the workspace.
 */
const PREFIX = "codexa:ws:";

export function wsKey(projectId: string, name: string) {
  return `${PREFIX}${projectId}:${name}`;
}

/**
 * Layout keys for the agent-first shell. They are new names on purpose: the old
 * `layout` / `panels` values described a different Group and must never be parsed into this one.
 */
export const LAYOUT_KEYS = {
  /** [Agent | Canvas] sizes (percentages by panel id). */
  shell: "shell.v2",
  /** Split view sizes: explorer | editor | preview. */
  split: "split.v2",
  /** Bottom dock: open state, size and tab. */
  dock: "dock.v2",
  /** Canvas view: "preview" | "split" | "code". */
  view: "view",
  /** Preview device: "desktop" | "tablet" | "mobile". */
  device: "device.v2",
  /** Explorer sidebar mode: "files" | "search". */
  side: "side.v2",
} as const;

export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / privacy errors
  }
}

export function removeLocal(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Key used by the dashboard prompt box; the AI ChatPanel reads and clears it on first mount. */
export const INITIAL_PROMPT_KEY = "codexa:initialPrompt";

export function stashInitialPrompt(prompt: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(INITIAL_PROMPT_KEY, prompt);
  } catch {
    // ignore
  }
}
