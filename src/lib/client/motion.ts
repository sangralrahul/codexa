import { useSyncExternalStore } from "react";

/**
 * Calm mode: true when the OS asks for reduced motion OR the visitor picked
 * "Reduced" in MotionToggle (cookie `codexa_motion=reduced`, mirrored as
 * <html data-motion="reduced"> by the root layout and the toggle).
 *
 * Calm means final frames: no pinning, no WebGL, no tilt, no spark/magnet/ripple,
 * static marquees, instant reveals, typed text shown complete.
 *
 * Client-only helpers (hooks inside): import from client components only.
 */
export const MOTION_COOKIE = "codexa_motion";
export type MotionPreference = "full" | "reduced";

const EVENT = "codexa:motion";
const QUERY = "(prefers-reduced-motion: reduce)";

/** True when either input asks for calm. Always false on the server. */
export function isCalm(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (document.documentElement.dataset.motion === "reduced") return true;
    return window.matchMedia(QUERY).matches;
  } catch {
    return false;
  }
}

/** True when the OS (not the site setting) asks for reduced motion. */
export function systemPrefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia(QUERY).matches;
  } catch {
    return false;
  }
}

/** The site setting only ("full" unless the visitor chose "reduced"). */
export function getMotionPreference(): MotionPreference {
  if (typeof document === "undefined") return "full";
  return document.documentElement.dataset.motion === "reduced" ? "reduced" : "full";
}

/** Persist the site setting (1 year cookie), flip <html data-motion> live and notify useCalm() subscribers. */
export function setMotionPreference(pref: MotionPreference) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${MOTION_COOKIE}=${pref}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* cookies blocked: the attribute below still applies for this page view */
  }
  if (pref === "reduced") document.documentElement.dataset.motion = "reduced";
  else delete document.documentElement.dataset.motion;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    mq.removeEventListener("change", callback);
    window.removeEventListener(EVENT, callback);
  };
}

/** React hook form of isCalm(). False during SSR and hydration, then the live value. */
export function useCalm(): boolean {
  return useSyncExternalStore(subscribe, isCalm, () => false);
}

/** React hook for the site setting (for MotionToggle-like controls). */
export function useMotionPreference(): MotionPreference {
  return useSyncExternalStore(subscribe, getMotionPreference, () => "full");
}

/**
 * Replays the `.shake` animation on an element (errors, invalid input).
 * No-op when calm. `amplitude` sets --shake (default 6px).
 */
export function shakeElement(el: Element | null | undefined, amplitude?: number) {
  if (!el || isCalm()) return;
  const node = el as HTMLElement;
  if (amplitude) node.style.setProperty("--shake", `${amplitude}px`);
  node.classList.remove("shake");
  // Force a reflow so re-adding the class restarts the animation.
  void node.offsetWidth;
  node.classList.add("shake");
  node.addEventListener("animationend", () => node.classList.remove("shake"), { once: true });
}
