"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Pages where continuing creates or uses an account under the Terms: sign in, sign up, accepting an invite. */
const LEGAL_PATHS = ["/login", "/signup", "/invite"];

/**
 * The account pages' bottom line. "By continuing you agree…" only where it applies: a password
 * reset or a verification link is not agreeing to anything, so those pages keep the same height
 * (the layout persists between pages, so the form must not jump) without the sentence.
 */
export function AuthLegal({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const show = LEGAL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!show) return <div aria-hidden="true" className={className} />;
  return (
    <footer className={cn("text-xs text-muted-foreground", className)}>
      By continuing you agree to our{" "}
      <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
        Privacy Policy
      </Link>
      .
    </footer>
  );
}
