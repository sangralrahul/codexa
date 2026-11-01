"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { withAuthParams } from "./params";

/**
 * The top bar's right side on the account pages: the way to the other form.
 * On /login it offers sign up, on /signup sign in, everywhere else sign in. The idea passport and
 * the return path (`next`, `email`, `prompt`, `template`) ride along, like the in-card switch link.
 */
export function AuthSwitch() {
  const pathname = usePathname() ?? "";
  const sp = useSearchParams();
  const onLogin = pathname === "/login";
  const carry = { next: sp?.get("next"), email: sp?.get("email"), prompt: sp?.get("prompt"), template: sp?.get("template") };
  const carried = onLogin || pathname === "/signup";
  const href = onLogin ? withAuthParams("/signup", carry) : carried ? withAuthParams("/login", carry) : "/login";
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-muted-foreground sm:inline">{onLogin ? "New to Codexa?" : "Have an account?"}</span>
      <Link href={href} className={buttonClasses("outline", "sm", "px-3")}>
        {onLogin ? "Sign up" : "Sign in"}
      </Link>
    </div>
  );
}

/** Static fallback while search params resolve (same size, so the bar never jumps). */
export function AuthSwitchFallback() {
  return (
    <Link href="/login" className={buttonClasses("outline", "sm", "px-3")}>
      Sign in
    </Link>
  );
}
