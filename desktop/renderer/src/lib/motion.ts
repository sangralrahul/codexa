import { useSyncExternalStore } from "react";

/**
 * Motion preference. "system" follows Windows (prefers-reduced-motion); "reduced" turns ambient motion
 * off in this app regardless (<html data-motion="reduced">, the same switch the web app uses).
 * Calm = either of them: decorative animation stops and scenes hold still.
 */
export type MotionMode = "system" | "reduced";
const KEY = "codexa:motion";
const EVENT = "codexa:motion";
const QUERY = "(prefers-reduced-motion: reduce)";

export function getMotionMode(): MotionMode {
  try {
    return localStorage.getItem(KEY) === "reduced" ? "reduced" : "system";
  } catch {
    return "system";
  }
}

/** Stores the choice and applies it to the page (call once at boot with no argument). */
export function applyMotion(mode: MotionMode = getMotionMode()) {
  try {
    if (mode === "reduced") localStorage.setItem(KEY, mode);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the attribute still applies for this session */
  }
  if (mode === "reduced") document.documentElement.dataset.motion = "reduced";
  else delete document.documentElement.dataset.motion;
  window.dispatchEvent(new Event(EVENT));
}

export function isCalm() {
  return document.documentElement.dataset.motion === "reduced" || window.matchMedia(QUERY).matches;
}

function subscribe(cb: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    media.removeEventListener("change", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** True when motion should be reduced (Windows setting or the app's own). Re-renders when either changes. */
export function useCalm() {
  return useSyncExternalStore(subscribe, isCalm, () => false);
}
