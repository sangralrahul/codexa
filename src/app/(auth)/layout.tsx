import "@/components/auth/auth.css";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthWall } from "@/components/auth/auth-wall";
import { AuthLegal } from "@/components/auth/auth-legal";

/**
 * Account pages (sign in, sign up, password reset, verification, invites), PLAN §5.5.
 *
 * Always the house (dark) theme: a slow wall of real template screenshots tilted in perspective
 * (AuthWall, decorative and aria-hidden), dimmed toward the centre, with one centred column on
 * top: brand mark, heading, the form on a solid hairline panel, and the legal line.
 * Phones get a lighter three-column wall and a full-width panel.
 *
 * The layout persists across login ⇄ signup, so the wall never re-renders (or restarts) between them.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark auth-shell relative isolate min-h-dvh bg-background text-foreground">
      <AuthWall />
      <div className="relative z-10 flex min-h-dvh flex-col px-4 sm:px-8">
        <header className="flex h-14 items-center sm:h-16">
          <Link
            href="/"
            className="group -ml-2 inline-flex h-9 items-center gap-1.5 rounded-md px-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
            Back to site
          </Link>
        </header>

        <main id="main" className="flex flex-1 flex-col items-center justify-center pb-6 pt-4 sm:py-10">
          <div className="w-full max-w-[420px]">{children}</div>
          {/* Shown on sign in, sign up and invites only. */}
          <AuthLegal className="w-full max-w-[420px] pt-6 text-center" />
        </main>
      </div>
    </div>
  );
}
