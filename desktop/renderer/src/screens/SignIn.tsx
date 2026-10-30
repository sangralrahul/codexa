import { useEffect, useState } from "react";
import { ArrowRight, Globe, MessageSquare, MonitorPlay, Rocket } from "lucide-react";
import { Button, Field, Input, Logo } from "../ui";
import { ProjectThumb } from "../components/ProjectThumb";

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
  useEffect(() => {
    window.codexa
      .info()
      .then((i) => setInfo({ version: i.version, appUrl: i.appUrl }))
      .catch(() => {});
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
    <div className="flex h-full">
      <div className="drag fixed inset-x-0 top-0 h-11" />
      <div className="relative flex flex-1 items-center justify-center px-8">
        <div aria-hidden="true" className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[40%] opacity-60" />
        <div className="fade-in relative w-full max-w-[380px]">
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
        <p className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-3 text-[11.5px] text-dim">
          <span>Codexa for Windows{info ? ` ${info.version}` : ""}</span>
          <span aria-hidden="true">·</span>
          <button type="button" className="hover:text-fg" onClick={() => void window.codexa.openWeb("/terms")}>
            Terms
          </button>
          <button type="button" className="hover:text-fg" onClick={() => void window.codexa.openWeb("/privacy")}>
            Privacy
          </button>
          <button type="button" className="hover:text-fg" onClick={() => void window.codexa.openWeb("/status")}>
            Status
          </button>
        </p>
      </div>
      <aside className="relative hidden w-[48%] max-w-[720px] flex-col justify-center overflow-hidden border-l border-border bg-sidebar px-14 lg:flex">
        <div aria-hidden="true" className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[55%]" />
        <div aria-hidden="true" className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(70%_60%_at_50%_40%,black,transparent)]" />
        <div className="fade-in relative">
          <p className="text-[12.5px] font-medium text-muted">Codexa for Windows</p>
          <h2 className="mt-2 max-w-lg text-balance font-[family-name:var(--font-display)] text-[30px] font-semibold leading-[1.15] tracking-[-0.025em]">From a sentence to a running app.</h2>
          <figure className="mt-8 overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <div className="flex h-8 items-center gap-1.5 border-b border-border px-3">
              <span className="size-2.5 rounded-full bg-border-strong" />
              <span className="size-2.5 rounded-full bg-border-strong" />
              <span className="size-2.5 rounded-full bg-border-strong" />
              <span className="ml-3 truncate font-mono text-[11px] text-dim">your-app.codexa preview</span>
            </div>
            <ProjectThumb templateId="vite-react-saas" name="SaaS" className="aspect-[16/10] w-full" />
            <figcaption className="border-t border-border px-4 py-2.5 text-[12px] text-muted">The SaaS starter, one of 111 templates you can start from.</figcaption>
          </figure>
          <ul className="mt-8 grid grid-cols-3 gap-4">
            {([
              ["Describe it", "Codexa plans it and writes the code.", MessageSquare],
              ["See it run", "A live preview while you chat.", MonitorPlay],
              ["Publish", "Checked for security and speed first.", Rocket],
            ] as const).map(([t, d, Icon]) => (
              <li key={t} className="rounded-xl border border-border bg-card/70 p-3.5 card-edge">
                <Icon className="size-4 text-accent" />
                <p className="mt-2 text-[13.5px] font-semibold">{t}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
