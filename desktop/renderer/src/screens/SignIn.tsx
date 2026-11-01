import { useEffect, useState } from "react";
import { ArrowBigUpDash, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button, Input, Logo } from "../ui";
import { AuthWall } from "../components/AuthWall";

/** GitHub's mark (simple-icons, the same path the website uses). */
const GITHUB_MARK =
  "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12";

/** "Last used" sign-in method on this PC (only the method, never the address). Storage is optional. */
const LAST_KEY = "codexa:lastAuthMethod";
type Method = "github" | "email";
function readLast(): Method | null {
  try {
    const v = localStorage.getItem(LAST_KEY);
    return v === "github" || v === "email" ? v : null;
  } catch {
    return null;
  }
}
function rememberLast(m: Method) {
  try {
    localStorage.setItem(LAST_KEY, m);
  } catch {
    /* storage unavailable: nothing to remember */
  }
}

const FOOTER_LINKS = [
  { path: "/terms", label: "Terms" },
  { path: "/privacy", label: "Privacy" },
  { path: "/security", label: "Security" },
  { path: "/status", label: "Status" },
] as const;

function LastUsed() {
  return (
    <span className="mono absolute -top-2.5 right-3 rounded-full border border-border-strong bg-card px-2 text-[10px] uppercase leading-[18px] tracking-[0.06em] text-muted">
      Last used
    </span>
  );
}

/**
 * Native sign-in, in the web's account-page design: a top bar (logo, the way to sign up), a moving wall
 * of real template screenshots behind a soft vignette (AuthWall, decorative), the form on a hairline
 * card with crosshair corners, and a quiet footer. Follows the app theme (dark or light).
 *
 * Email and password go straight to the Codexa API; GitHub sign-in and creating an account open a small
 * window on the Codexa site that signs this app in (the session cookie stays in this app's store).
 */
export function SignIn({ onSignedIn }: { onSignedIn: (u: SessionUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState<{ field: "email" | "password" | "form"; message: string } | null>(null);
  const [busy, setBusy] = useState<"form" | "github" | "signup" | null>(null);
  const [last] = useState(readLast);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    window.codexa
      .info()
      .then((i) => setVersion(i.version))
      .catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError({ field: "email", message: "Enter a valid email address." });
    if (!password) return setError({ field: "password", message: "Enter your password." });
    setBusy("form");
    setError(null);
    const res = await window.codexa.login(email.trim(), password);
    if (res.ok && res.data?.user) {
      rememberLast("email");
      onSignedIn((await window.codexa.me()) ?? res.data.user);
      return;
    }
    setBusy(null);
    if (res.status === 0) return setError({ field: "form", message: "Can't reach Codexa. Check your internet connection." });
    setError({
      field: "password",
      message: res.status === 401 ? "That email and password don't match. Check both and try again." : (res.data?.error?.message ?? "Those details didn't work. Try again."),
    });
  };

  const browser = async (page: "github" | "signup") => {
    setBusy(page);
    setError(null);
    const user = await window.codexa.browserAuth(page);
    setBusy(null);
    if (user) {
      if (page === "github") rememberLast("github");
      onSignedIn(user);
    }
  };

  const track = (e: React.KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState("CapsLock"));
  const rise = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;
  const emailError = error?.field === "email" ? error.message : null;
  const passwordError = error?.field === "password" ? error.message : null;

  return (
    <div className="auth-screen relative isolate flex h-full flex-col overflow-hidden text-fg">
      <AuthWall />

      {/* The window's own title bar: drag region; the native caption buttons sit in the right 150px. */}
      <header className="auth-bar drag relative z-20 flex h-11 shrink-0 items-center justify-between gap-4 border-b pl-4 pr-[150px]">
        <span className="flex items-center gap-2 text-fg">
          <Logo size={18} />
          <span className="text-[17px] font-bold leading-none tracking-[-0.035em]">codexa</span>
        </span>
        <div className="no-drag flex items-center gap-3">
          <span className="text-[13px] text-muted">New to Codexa?</span>
          <Button size="sm" className="bg-card" onClick={() => void browser("signup")} loading={busy === "signup"} disabled={busy !== null && busy !== "signup"}>
            Sign up
          </Button>
        </div>
      </header>

      <main className="scroll relative z-10 min-h-0 flex-1">
        <div className="flex min-h-full flex-col items-center justify-center px-8 py-10">
          <section aria-labelledby="auth-title" className="auth-panel rise w-full max-w-[416px]" style={rise(0)}>
            <span aria-hidden="true" className="auth-cross" data-pos="tl" />
            <span aria-hidden="true" className="auth-cross" data-pos="tr" />
            <span aria-hidden="true" className="auth-cross" data-pos="bl" />
            <span aria-hidden="true" className="auth-cross" data-pos="br" />
            <div className="auth-panel__body">
              <h1 id="auth-title" className="text-2xl font-semibold leading-8 tracking-[-0.025em]">
                Sign in to Codexa
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted">Welcome back. Pick up where you left off.</p>

              <div className="mt-6">
                <Button size="lg" className="press relative h-11 w-full text-[15px]" onClick={() => void browser("github")} loading={busy === "github"} disabled={busy !== null && busy !== "github"}>
                  {busy === "github" ? null : (
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]!">
                      <path d={GITHUB_MARK} fill="currentColor" />
                    </svg>
                  )}
                  Continue with GitHub
                  {last === "github" ? <LastUsed /> : null}
                </Button>

                <div className="mono my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.08em] text-muted">
                  <span aria-hidden="true" className="h-px flex-1 bg-border" />
                  <span className="flex items-center gap-2">
                    or with email
                    {last === "email" ? <span className="rounded-full border border-border-strong px-2 text-[10px] leading-[18px] tracking-[0.06em]">Last used</span> : null}
                  </span>
                  <span aria-hidden="true" className="h-px flex-1 bg-border" />
                </div>

                <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
                  {error?.field === "form" ? (
                    <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-[13px] text-danger">
                      {error.message}
                    </p>
                  ) : null}
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-[13px] font-medium text-fg">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error?.field === "email") setError(null);
                      }}
                      placeholder="you@company.com"
                      className={`h-11 text-[15px] ${emailError ? "border-danger focus:border-danger" : ""}`}
                      aria-invalid={emailError ? true : undefined}
                      aria-describedby={emailError ? "email-error" : undefined}
                    />
                    {emailError ? (
                      <p id="email-error" role="alert" className="text-[12.5px] text-danger">
                        {emailError}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <label htmlFor="password" className="block text-[13px] font-medium text-fg">
                        Password
                      </label>
                      <button type="button" className="rounded-sm text-[12.5px] text-muted transition-colors hover:text-fg hover:underline hover:underline-offset-4" onClick={() => void window.codexa.openWeb("/forgot-password")}>
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={shown ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error?.field === "password") setError(null);
                        }}
                        onKeyDown={track}
                        onKeyUp={track}
                        onBlur={() => setCaps(false)}
                        className={`h-11 text-[15px] ${caps ? "pr-36" : "pr-12"} ${passwordError ? "border-danger focus:border-danger" : ""}`}
                        aria-invalid={passwordError ? true : undefined}
                        aria-describedby={passwordError ? "password-error" : undefined}
                      />
                      {caps ? (
                        <p role="status" className="pointer-events-none absolute inset-y-0 right-12 my-auto flex h-6 items-center gap-1 rounded-sm bg-surface px-1.5 text-[11px] font-medium text-fg">
                          <ArrowBigUpDash className="size-3.5" aria-hidden="true" />
                          Caps Lock on
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setShown((v) => !v)}
                        aria-label={shown ? "Hide password" : "Show password"}
                        aria-controls="password"
                        aria-pressed={shown}
                        className="absolute inset-y-0 right-1.5 my-auto inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-fg"
                      >
                        {shown ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                      </button>
                    </div>
                    {passwordError ? (
                      <p id="password-error" role="alert" className="text-[12.5px] text-danger">
                        {passwordError}
                      </p>
                    ) : null}
                  </div>
                  <Button type="submit" variant="primary" size="lg" className="press group mt-2 h-11 w-full text-[15px]" loading={busy === "form"} disabled={busy !== null && busy !== "form"}>
                    {busy === "form" ? "Signing in…" : "Sign in"}
                    {busy === "form" ? null : <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
                  </Button>
                </form>
              </div>

              <p className="auth-panel__foot text-center text-[13.5px] text-muted">
                New to Codexa?{" "}
                <button type="button" className="font-medium text-fg underline decoration-border-strong underline-offset-4 hover:decoration-fg" onClick={() => void browser("signup")}>
                  Create an account
                </button>
              </p>
            </div>
          </section>

          <p className="rise mt-6 text-center text-xs text-muted" style={rise(60)}>
            By continuing you agree to our{" "}
            <button type="button" className="underline underline-offset-2 hover:text-fg" onClick={() => void window.codexa.openWeb("/terms")}>
              Terms
            </button>{" "}
            and{" "}
            <button type="button" className="underline underline-offset-2 hover:text-fg" onClick={() => void window.codexa.openWeb("/privacy")}>
              Privacy Policy
            </button>
            .
          </p>
        </div>
      </main>

      <footer className="auth-bar relative z-10 flex h-10 shrink-0 items-center justify-between gap-4 border-t px-4 text-xs text-muted">
        <p className="flex items-center gap-3">
          <span>© {new Date().getFullYear()} Codexa</span>
          <span aria-hidden="true" className="h-3 w-px bg-border" />
          {/* True: the session cookie lives in this app's cookie store (main.js), never in page script. */}
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Your session stays on this PC
          </span>
        </p>
        <nav aria-label="Legal and trust" className="flex items-center gap-4">
          {FOOTER_LINKS.map((l) => (
            <button key={l.path} type="button" className="transition-colors hover:text-fg" onClick={() => void window.codexa.openWeb(l.path)}>
              {l.label}
            </button>
          ))}
          {version ? (
            <>
              <span aria-hidden="true" className="h-3 w-px bg-border" />
              <span className="mono text-[11px]">v{version}</span>
            </>
          ) : null}
        </nav>
      </footer>
    </div>
  );
}
