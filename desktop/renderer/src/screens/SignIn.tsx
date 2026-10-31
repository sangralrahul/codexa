import { useEffect, useState } from "react";
import { ArrowRight, Globe, ShieldCheck } from "lucide-react";
import { Button, Field, Input, Logo } from "../ui";

const WORDS = ["a landing page", "a dashboard", "an online store", "a SaaS app", "a portfolio"];

/**
 * Native sign-in. Email and password go straight to the Codexa API; Google/GitHub sign-in and
 * creating an account open a small window on the Codexa site that signs this app in.
 */
export function SignIn({ onSignedIn }: { onSignedIn: (u: SessionUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"form" | "browser" | null>(null);
  const [info, setInfo] = useState<{ version: string; appUrl: string } | null>(null);
  const [word, setWord] = useState(0);

  useEffect(() => {
    window.codexa
      .info()
      .then((i) => setInfo({ version: i.version, appUrl: i.appUrl }))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setWord((w) => (w + 1) % WORDS.length), 2600);
    return () => clearInterval(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy("form");
    setError(null);
    const res = await window.codexa.login(email.trim(), password);
    if (res.ok && res.data?.user) {
      onSignedIn((await window.codexa.me()) ?? res.data.user);
      return;
    }
    setBusy(null);
    setError(res.data?.error?.message ?? (res.status === 0 ? "Can't reach Codexa. Check your internet connection." : "Those details didn't work. Try again."));
  };

  const browser = async (page: "login" | "signup") => {
    setBusy("browser");
    setError(null);
    const user = await window.codexa.browserAuth(page);
    setBusy(null);
    if (user) onSignedIn(user);
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-bg">
      <div className="drag absolute inset-x-0 top-0 z-10 h-11" />
      {/* Construction grid, faded out toward the edges. */}
      <div aria-hidden="true" className="grid-lines pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(55%_65%_at_50%_48%,black,transparent)]" />

      <div className="relative flex flex-1 items-center justify-center px-8">
        <div className="relative w-full max-w-[400px] border border-border bg-bg">
          <span aria-hidden="true" className="xmark tl" />
          <span aria-hidden="true" className="xmark tr" />
          <span aria-hidden="true" className="xmark bl" />
          <span aria-hidden="true" className="xmark br" />

          <div className="border-b border-border px-8 pb-7 pt-8">
            <div className="rise flex items-center gap-2.5" style={{ "--d": "0ms" } as React.CSSProperties}>
              <Logo size={22} />
              <span className="text-[15px] font-semibold tracking-[-0.01em]">Codexa</span>
              <span className="mono ml-auto rounded-full border border-border-strong px-2 text-[10.5px] uppercase tracking-[0.06em] text-muted">Windows</span>
            </div>
            <h1 className="rise mt-8 text-[28px] font-semibold leading-tight tracking-[-0.04em]" style={{ "--d": "60ms" } as React.CSSProperties}>
              Welcome back
            </h1>
            <p className="rise mt-1.5 text-[14px] text-muted" style={{ "--d": "100ms" } as React.CSSProperties}>
              Sign in and build{" "}
              <span key={word} className="word-in text-fg">
                {WORDS[word]}
              </span>{" "}
              in minutes.
            </p>
          </div>

          <div className="px-8 pb-8 pt-6">
            <div className="rise" style={{ "--d": "160ms" } as React.CSSProperties}>
              <Button size="lg" className="press w-full" onClick={() => void browser("login")} loading={busy === "browser"} disabled={busy === "form"}>
                <Globe /> Continue with Google or GitHub
              </Button>
            </div>

            <div className="eyebrow rise my-5 flex items-center gap-3" style={{ "--d": "200ms" } as React.CSSProperties}>
              <span className="h-px flex-1 bg-border" />
              or with email
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={submit} className="rise space-y-4" style={{ "--d": "240ms" } as React.CSSProperties} noValidate>
              <Field label="Email" htmlFor="email">
                <Input id="email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
              </Field>
              <Field label="Password" htmlFor="password" error={error}>
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              <Button type="submit" variant="primary" size="lg" className="press group w-full" loading={busy === "form"} disabled={busy === "browser"}>
                Sign in <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            </form>

            <div className="rise mt-5 flex items-center justify-between text-[13px]" style={{ "--d": "300ms" } as React.CSSProperties}>
              <button type="button" className="text-muted transition-colors hover:text-fg" onClick={() => void window.codexa.openWeb("/forgot-password")}>
                Forgot password?
              </button>
              <button type="button" className="font-medium text-fg underline-offset-2 hover:underline" onClick={() => void browser("signup")}>
                Create an account
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="mono relative flex items-center justify-center gap-3 border-t border-border py-3.5 text-[11px] text-dim">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5" /> Your session stays on this PC
        </span>
        <span aria-hidden="true">/</span>
        <span>Codexa for Windows{info ? ` ${info.version}` : ""}</span>
        <span aria-hidden="true">/</span>
        <button type="button" className="hover:text-fg" onClick={() => void window.codexa.openWeb("/terms")}>
          Terms
        </button>
        <button type="button" className="hover:text-fg" onClick={() => void window.codexa.openWeb("/privacy")}>
          Privacy
        </button>
      </p>
    </div>
  );
}
