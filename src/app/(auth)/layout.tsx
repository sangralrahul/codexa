import "@/components/auth/auth.css";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { AuthWall } from "@/components/auth/auth-wall";
import { AuthLegal } from "@/components/auth/auth-legal";
import { AuthSwitch, AuthSwitchFallback } from "@/components/auth/auth-chrome";
import { LogoMark, Wordmark } from "@/components/logo";

const FOOTER_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/security", label: "Security" },
  { href: "/status", label: "Status" },
] as const;

const quietLink =
  "rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * Account pages (sign in, sign up, password reset, verification, invites), PLAN §5.5.
 *
 * Three bands on the site theme (dark by default):
 *   header  the logo (home), a "Back to site" link, and the way to the other form (AuthSwitch)
 *   main    one centred column: the card (AuthCard) and, where it applies, the legal line
 *   footer  ©, a true note on how sessions are kept, and the trust links
 * Behind them a slow wall of real template screenshots (AuthWall, decorative and aria-hidden),
 * washed out toward the centre so the form sits on calm, near-solid colour.
 *
 * The layout persists across login ⇄ signup, so the wall never re-renders (or restarts) between them.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell relative isolate flex min-h-dvh flex-col text-foreground">
      <AuthWall />
      <header className="auth-bar relative z-10 border-b">
        <div className="flex h-14 w-full items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/" aria-label="Codexa home" className={`${quietLink} -m-1 inline-flex items-center gap-2 p-1 text-foreground`}>
              <LogoMark size={22} />
              <Wordmark className="text-[19px]" />
            </Link>
            <span aria-hidden="true" className="hidden h-4 w-px bg-border sm:block" />
            <Link href="/" className={`${quietLink} group hidden items-center gap-1.5 text-sm text-muted-foreground sm:inline-flex`}>
              <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
              Back to site
            </Link>
          </div>
          <Suspense fallback={<AuthSwitchFallback />}>
            <AuthSwitch />
          </Suspense>
        </div>
      </header>

      <main id="main" className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <div className="w-full max-w-[416px]">{children}</div>
        {/* Shown on sign in, sign up and invites only. */}
        <AuthLegal className="w-full max-w-[416px] pt-6 text-center" />
      </main>

      <footer className="auth-bar relative z-10 border-t">
        <div className="flex w-full flex-col items-center gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:gap-4 sm:px-6">
          <p className="flex items-center gap-3">
            <span>© {new Date().getFullYear()} Codexa</span>
            <span aria-hidden="true" className="hidden h-3 w-px bg-border md:block" />
            {/* True per src/lib/auth/session.ts: the cookie is httpOnly and only a hash of the token is stored. */}
            <span className="hidden items-center gap-1.5 md:inline-flex">
              <Lock className="size-3" aria-hidden="true" />
              Sessions use httpOnly cookies; tokens are hashed at rest
            </span>
          </p>
          <nav aria-label="Legal and trust">
            <ul className="flex items-center gap-5">
              {FOOTER_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={quietLink}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
