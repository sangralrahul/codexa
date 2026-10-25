"use client";

import { useCallback, useSyncExternalStore } from "react";

/** SSR-safe media query hook. `serverDefault` is used for the server snapshot (and first hydration pass). */
export function useMediaQuery(query: string, serverDefault = true): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => (typeof window === "undefined" ? serverDefault : window.matchMedia(query).matches),
    () => serverDefault,
  );
}
