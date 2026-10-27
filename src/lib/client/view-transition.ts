import { flushSync } from "react-dom";
import { isCalm } from "./motion";

type DocumentWithVT = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

/**
 * M20 same-page morph: runs `update` (a React state change) inside a View
 * Transition so grid ⇄ list, filter and sort changes animate to their new
 * positions. Give moving cards a stable `style={{ viewTransitionName: \`card-${id}\` }}`.
 * Falls back to an instant update without the API, when calm, or when the tab is hidden.
 */
export function withViewTransition(update: () => void) {
  const doc = typeof document !== "undefined" ? (document as DocumentWithVT) : null;
  if (!doc?.startViewTransition || isCalm() || doc.visibilityState === "hidden") {
    update();
    return;
  }
  try {
    doc.startViewTransition(() => {
      flushSync(update);
    });
  } catch {
    update();
  }
}
