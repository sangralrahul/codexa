import { useState } from "react";
import { ArrowRight, Globe } from "lucide-react";
import { Button, Field, Input, Logo } from "../ui";

/**
 * Native sign-in. Email and password go straight to the Codexa API; Google/GitHub sign-in and
 * creating an account open a small window on the Codexa site that signs this app in.
 */
export function SignIn({ onSignedIn }: { onSignedIn: (u: SessionUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"form" | "browser" | null>(null);

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
    <div className="flex h-full">
      <div className="drag fixed inset-x-0 top-0 h-11" />
      <div className="flex flex-1 items-center justify-center px-8">
        <div className="fade-in w-full max-w-[380px]">
          <div className="flex items-center gap-2.5 text-fg">
            <Logo size={30} />
            <span className="text-[19px] font-semibold tracking-[-0.02em]">codexa</span>
          </div>
          <h1 className="mt-10 font-[family-name:var(--font-display)] text-[28px] font-semibold leading-tight tracking-[-0.02em]">Welcome back</h1>
          <p className="mt-2 text-[14.5px] text-muted">Sign in to build, run and publish apps with AI.</p>

          <Button size="lg" className="mt-8 w-full" onClick={() => void browser("login")} loading={busy === "browser"} disabled={busy === "form"}>
            <Globe /> Continue with Google or GitHub
          </Button>

          <div className="my-6 flex items-center gap-3 text-[12px] text-dim">
            <span className="h-px flex-1 bg-border" />
            or with email
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </Field>
            <Field label="Password" htmlFor="password" error={error}>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy === "form"} disabled={busy === "browser"}>
              Sign in <ArrowRight />
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-[13px]">
            <button type="button" className="text-muted hover:text-fg" onClick={() => void window.codexa.openWeb("/forgot-password")}>
              Forgot password?
            </button>
            <button type="button" className="font-medium text-fg hover:underline" onClick={() => void browser("signup")}>
              Create an account
            </button>
          </div>
        </div>
      </div>
      <aside className="relative hidden w-[44%] max-w-[620px] overflow-hidden border-l border-border bg-sidebar lg:block">
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <div className="fade-in space-y-3">
            {[
              ["Describe it", "Say what you want in a sentence. Codexa plans it and writes the code."],
              ["See it run", "A live preview starts on Codexa's servers while you chat."],
              ["Publish", "Put it on the web with one click, with a security and speed check first."],
            ].map(([t, d], i) => (
              <div key={t} className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface text-[12px] font-semibold text-muted">{i + 1}</span>
                <span>
                  <span className="block text-[14px] font-semibold">{t}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{d}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
