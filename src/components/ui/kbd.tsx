"use client";

import { usePlatformMod } from "@/lib/client/platform";

/** The platform modifier label ("⌘" on Apple, "Ctrl" elsewhere; "Ctrl" until mounted). */
export function ModKey() {
  const mod = usePlatformMod();
  return <>{mod}</>;
}
