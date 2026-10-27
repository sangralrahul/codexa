"use client";

import { useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** One shared one-second clock; the server snapshot is null so SSR prints the absolute time. */
const listeners = new Set<() => void>();
let timer: number | undefined;
function subscribe(cb: () => void) {
  listeners.add(cb);
  if (timer === undefined) timer = window.setInterval(() => listeners.forEach((l) => l()), 1000);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}
const nowSeconds = () => Math.floor(Date.now() / 1000);
const serverNow = () => null;

function relative(seconds: number) {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)} h ago`;
}

/**
 * "Checked 12s ago", ticking once a second (text only, not announced), plus a Re-check button
 * that re-runs the server checks with router.refresh().
 */
export function StatusControls({ checkedAt, className }: { checkedAt: string; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const now = useSyncExternalStore(subscribe, nowSeconds, serverNow);
  const checked = new Date(checkedAt);
  const absolute = `${checked.toISOString().slice(11, 19)} UTC`;
  const label = now === null ? `at ${absolute}` : relative(Math.max(0, now - Math.floor(checked.getTime() / 1000)));

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <p className="font-mono text-[12.5px] text-muted-foreground">
        Checked{" "}
        <time dateTime={checkedAt} title={absolute}>
          {label}
        </time>
      </p>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        aria-busy={pending}
        className={buttonClasses("outline", "sm")}
      >
        <RefreshCw className={cn("size-3.5", pending && "animate-spin calm:animate-none")} aria-hidden="true" />
        {pending ? "Checking…" : "Re-check"}
      </button>
      <span className="sr-only" role="status">
        {pending ? "Re-running the checks" : ""}
      </span>
    </div>
  );
}
