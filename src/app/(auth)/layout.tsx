import "@/components/auth/auth.css";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { Backdrop, Horizon } from "@/components/marketing/backdrop";
import { BuildReplay, BuildReplayBand } from "@/components/auth/build-replay";
import { AuthStrip } from "@/components/auth/auth-strip";
import { replayItems, stripShots } from "@/components/auth/replay-data";
import { cn } from "@/lib/utils";

/**
 * Account pages (sign in, sign up, password reset, verification, invites), PLAN §5.5.
 *
 * - Large screens: the form column (dot grid lit by the pointer, legal line pinned to the
 *   bottom) beside an inset, floating panel that is always dark (it reads as deliberate in
 *   the light theme too). The panel holds the page's one live canvas (Horizon) and the
 *   Build replay: real starter screenshots, labelled as an illustration.
 * - Tablets (md): the replay as a compact 220px band above the glass card (no canvas).
 * - Phones: the still CSS wash behind a glass card, then a strip of real starters.
 *
 * The layout persists across login ⇄ signup, so the replay keeps its place.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const items = replayItems();
  return (
    <div className="relative isolate grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)]">
      {/* Phones and tablets only: CSS wash, no canvas. */}
      <Backdrop still className="-z-10 h-[620px] lg:hidden" />

      <div data-spotlight suppressHydrationWarning className="relative isolate flex min-h-dvh min-w-0 flex-col px-4 after:hidden! sm:px-10 lg:px-14 xl:px-20">
        <div aria-hidden="true" className="bg-dots absolute inset-0 -z-10 hidden opacity-80 lg:block" />
        <div aria-hidden="true" className="auth-glow -z-10 hidden lg:block" />

        <header className="flex h-16 items-center justify-between sm:h-20">
          <Logo />
          <Link href="/" className="group inline-flex items-center gap-1.5 rounded-full px-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
            Back to site
          </Link>
        </header>

        <main id="main" className="flex flex-1 flex-col justify-center py-6 sm:py-10">
          {items.length > 1 ? <BuildReplayBand items={items} className="mx-auto mb-8 hidden w-full max-w-[600px] md:block lg:hidden" /> : null}
          <div className="auth-card mx-auto w-full max-w-[440px] lg:max-w-[408px]">{children}</div>
          <AuthStrip shots={stripShots()} className={cn("mt-10 lg:hidden", items.length > 1 && "md:hidden")} />
        </main>

        <footer className="py-6 text-center text-xs text-muted-foreground lg:text-left">
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
      </div>

      {items.length > 1 ? (
        <aside
          aria-label="Example run"
          className="dark auth-panel sticky top-3 m-3 hidden h-[calc(100dvh_-_1.5rem)] min-h-[640px] self-start overflow-hidden rounded-[28px] bg-background text-foreground lg:flex lg:flex-col"
        >
          <div aria-hidden="true" className="bg-blueprint absolute inset-0 opacity-60" />
          <div aria-hidden="true" className="bg-noise absolute inset-0" />
          <div className="relative flex min-h-0 flex-1 flex-col px-10 pb-8 pt-12 xl:px-14 xl:pt-14">
            <BuildReplay items={items} className="flex-1" light={<Horizon className="bottom-[calc(100%_-_56px)] w-full" />} />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
