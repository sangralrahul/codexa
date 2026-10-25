import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { Backdrop } from "@/components/marketing/backdrop";

/**
 * Account pages (sign in, sign up, password reset, verification, invites):
 * the form on the left, a brand panel with the live gradient on the right
 * (large screens only, always in the dark palette). The panel is decorative and describes the product
 * flow; it makes no claims about users or results.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex min-h-screen flex-col px-6 sm:px-10 lg:px-16">
        <header className="flex h-20 items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Back to site
          </Link>
        </header>
        <main id="main" className="flex flex-1 items-center py-10">
          <div data-reveal className="mx-auto w-full max-w-[400px]">
            {children}
          </div>
        </main>
        <footer className="py-6 text-xs text-muted-foreground">
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

      <aside aria-hidden="true" className="dark relative isolate hidden overflow-hidden border-l border-border bg-background text-foreground lg:block">
        <Backdrop veil={false} className="[&_.backdrop__canvas]:[mask-image:none] [&_.backdrop__canvas]:opacity-100" />
        <div className="relative flex h-full flex-col justify-between p-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/70">Codexa</p>
          <div>
            <p className="max-w-md text-5xl font-semibold leading-[1.05] tracking-[-0.03em] text-foreground">
              Describe it. Run it. <span className="serif-accent">Ship it.</span>
            </p>
            <div className="mt-10 max-w-sm rounded-2xl glass border border-border p-5 text-sm text-foreground/85 backdrop-blur-md">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Agent · invoice-tracker</p>
              <ul className="space-y-2">
                {["Planning 4 files", "Writing src/App.tsx", "Type-check passed · 0 errors"].map((s) => (
                  <li key={s} className="flex items-center gap-2">
                    <Check className="size-3.5 text-success" /> {s}
                  </li>
                ))}
                <li className="flex items-center gap-2 text-foreground">
                  <Loader2 className="spin size-3.5 text-signal" /> Starting preview
                </li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-foreground/60">Real files you own · Isolated previews · One-click deploys</p>
        </div>
      </aside>
    </div>
  );
}
