import "@/components/auth/auth.css";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { AuthPanel } from "@/components/auth/auth-panel";
import { AuthLegal } from "@/components/auth/auth-legal";

/**
 * Account pages (sign in, sign up, password reset, verification, invites), PLAN §5.5.
 *
 * - Large screens: the form column (logo row, centred form, legal line) beside a quiet,
 *   theme-aware panel with one real starter screenshot.
 * - Tablets: the form on a centred card.
 * - Phones: the form straight on the page, full width.
 *
 * The layout persists across login ⇄ signup, so the panel never re-renders between them.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex min-h-dvh min-w-0 flex-col px-4 sm:px-8 lg:px-12 xl:px-16">
        <header className="flex h-16 items-center justify-between sm:h-20">
          <Logo />
          <Link
            href="/"
            className="group -mr-2 inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
            Back to site
          </Link>
        </header>

        <main id="main" className="flex flex-1 flex-col pb-10 pt-8 sm:justify-center sm:py-12">
          <div className="auth-card mx-auto w-full max-w-[400px] sm:max-w-[440px] lg:max-w-[380px]">{children}</div>
        </main>

        {/* Shown on sign in, sign up and invites only; elsewhere an empty line of the same height. */}
        <AuthLegal className="mx-auto min-h-16 w-full max-w-[400px] py-6 text-center sm:max-w-[440px] lg:max-w-[380px]" />
      </div>

      <AuthPanel className="sticky top-3 m-3 hidden h-[calc(100dvh_-_1.5rem)] min-h-[600px] self-start lg:flex" />
    </div>
  );
}
