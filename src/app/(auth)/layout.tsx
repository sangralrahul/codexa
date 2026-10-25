import Link from "next/link";
import { Logo } from "@/components/logo";
import { Aurora } from "@/components/marketing/aurora";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-background">
      <Aurora className="-z-10" />
      <header className="container-x flex h-16 items-center justify-between">
        <Logo />
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          Back to site
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-10">
        <div data-reveal className="w-full max-w-md">
          {children}
        </div>
      </main>
      <footer className="container-x py-6 text-center text-xs text-muted-foreground">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline hover:text-foreground">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </footer>
    </div>
  );
}
