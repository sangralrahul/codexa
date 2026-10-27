import { useSyncExternalStore } from "react";

/** True on macOS / iOS / iPadOS (where shortcuts use ⌘). False on the server. */
export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  try {
    const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
    const platform = uaData?.platform || navigator.platform || navigator.userAgent;
    return /mac|iphone|ipad|ipod/i.test(platform);
  } catch {
    return false;
  }
}

const noop = () => () => {};

/**
 * The modifier key label for keyboard hints: "⌘" on Apple platforms, "Ctrl" elsewhere.
 * Renders "Ctrl" on the server and during hydration, then the platform value (no mismatch).
 */
export function usePlatformMod(): "⌘" | "Ctrl" {
  return useSyncExternalStore(noop, () => (isMac() ? "⌘" : "Ctrl"), () => "Ctrl");
}
