"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/brand-mark";

/**
 * "Last used" sign-in method, remembered per device. Only the method is stored
 * ("github" | "email"), never the address. Every storage access is guarded.
 */
const LAST_KEY = "codexa:lastAuthMethod";
type Method = "github" | "email";
const EVENT = "codexa:last-auth";

function readLast(): Method | null {
  try {
    const v = window.localStorage.getItem(LAST_KEY);
    return v === "github" || v === "email" ? v : null;
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function rememberAuthMethod(method: Method) {
  try {
    window.localStorage.setItem(LAST_KEY, method);
  } catch {
    /* storage unavailable: nothing to remember */
  }
}

/** The method used last on this device (null on the server, during hydration and when unknown). */
export function useLastAuthMethod(): Method | null {
  return React.useSyncExternalStore(subscribe, readLast, () => null);
}

function LastUsed({ className }: { className?: string }) {
  return (
    <span className={cn("pop-in inline-flex items-center gap-1 rounded-full bg-signal/12 px-2 py-0.5 text-[10.5px] font-medium leading-4 text-signal-ink", className)}>
      <span aria-hidden="true" className="size-1 rounded-full bg-signal" />
      Last used
    </span>
  );
}

/**
 * GitHub first (PLAN §5.5): a full-width 48px outline link with the real GitHub mark.
 * It stays an <a> (the e2e contract counts the buttons). Hidden by the caller when GitHub
 * sign-in is not configured.
 */
export function GitHubButton({ href, onNavigate }: { href: string; onNavigate?: () => void }) {
  const last = useLastAuthMethod();
  return (
    <a
      href={href}
      data-btn=""
      onClick={() => {
        rememberAuthMethod("github");
        onNavigate?.();
      }}
      className={cn(buttonClasses("outline", "lg", "group w-full text-[15px]"), "hover:-translate-y-px hover:shadow-md")}
    >
      <BrandMark id="github" className="size-[18px] transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110" />
      Continue with GitHub
      {last === "github" ? <LastUsed className="absolute right-3 top-1/2 -translate-y-1/2" /> : null}
    </a>
  );
}

/** "or continue with email" rule between OAuth and the form; carries the badge when email was last used. */
export function OrDivider({ showLastUsed = true }: { showLastUsed?: boolean }) {
  const last = useLastAuthMethod();
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
      <span className="inline-flex items-center gap-2">
        or continue with email
        {showLastUsed && last === "email" ? <LastUsed /> : null}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
    </div>
  );
}
