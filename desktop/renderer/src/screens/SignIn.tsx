import { useEffect, useState } from "react";
import { ArrowRight, Globe, ShieldCheck } from "lucide-react";
import { Button, Field, Input, Logo } from "../ui";
import { AuthWall } from "../components/AuthWall";

/**
 * Native sign-in, in the web's account-page design: a moving wall of real template screenshots behind
 * a heavy vignette (AuthWall, decorative), the two-line headline, and the form on a hairline panel
 * with crosshair corners and construction lines. Always the house (dark) theme.
 *
 * Email and password go straight to the Codexa API; Google/GitHub sign-in and creating an account open
 * a small window on the Codexa site that signs this app in.
 */
export function SignIn({
  onSignedIn,
}: {
  onSignedIn: (u: SessionUser) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"form" | "browser" | null>(null);
  const [info, setInfo] = useState<{ version: string; appUrl: string } | null>(
    null,
  );

  useEffect(() => {
    window.codexa
      .info()
      .then((i) => setInfo({ version: i.version, appUrl: i.appUrl }))
      .catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password)
      return setError("Enter your email and password.");
    setBusy("form");
    setError(null);
    const res = await window.codexa.login(email.trim(), password);
    if (res.ok && res.data?.user) {
      onSignedIn((await window.codexa.me()) ?? res.data.user);
      return;
    }
    setBusy(null);
    setError(
      res.data?.error?.message ??
        (res.status === 0
          ? "Can't reach Codexa. Check your internet connection."
          : "Those details didn't work. Try again."),
    );
  };

  const browser = async (page: "login" | "signup") => {
    setBusy("browser");
    setError(null);
    const user = await window.codexa.browserAuth(page);
    setBusy(null);
    if (user) onSignedIn(user);
  };

  const rise = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

  return (
    <div className="relative isolate flex h-full flex-col overflow-hidden bg-bg text-fg">
      <AuthWall />
      <div className="drag absolute inset-x-0 top-0 z-20 h-11" />

      <main className="scroll relative z-10 min-h-0 flex-1">
        {/* Clips the panel's page-wide construction lines so they never add scroll. */}
        <div className="flex min-h-full flex-col items-center justify-center overflow-clip px-8 py-10">
          <div className="flex w-full max-w-[420px] flex-col items-center">
            <span
              aria-hidden="true"
              className="rise flex size-11 items-center justify-center border border-border-strong bg-card"
              style={rise(0)}
            >
              <Logo size={22} />
            </span>
            <h1
              className="rise mt-6 text-balance text-center text-[44px] font-semibold leading-[1.05] tracking-[-0.04em]"
              style={rise(40)}
            >
              <span className="block">Describe your idea.</span>
              <span className="block text-muted">Ship a real app.</span>
            </h1>
            <p
              className="rise mt-3 text-center text-[15px] leading-relaxed text-muted"
              style={rise(80)}
            >
              Welcome back. Pick up your projects, previews and deploys.
            </p>

            <section
              aria-labelledby="auth-panel-label"
              className="auth-panel rise mt-9 w-full"
              style={rise(120)}
            >
              <span aria-hidden="true" className="auth-cross" data-pos="tl" />
              <span aria-hidden="true" className="auth-cross" data-pos="tr" />
              <span aria-hidden="true" className="auth-cross" data-pos="bl" />
              <span aria-hidden="true" className="auth-cross" data-pos="br" />
              <div className="flex h-11 items-center gap-2.5 border-b border-border px-7">
                <span aria-hidden="true" className="size-1.5 bg-fg" />
                <h2
                  id="auth-panel-label"
                  className="mono truncate text-[11px] font-medium uppercase tracking-[0.08em] text-muted"
                >
                  Sign in to Codexa
                </h2>
                <span className="mono ml-auto rounded-full border border-border-strong px-2 text-[10px] uppercase tracking-[0.06em] text-dim">
                  Windows
                </span>
              </div>

              <div className="p-7">
                <Button
                  size="lg"
                  className="press w-full"
                  onClick={() => void browser("login")}
                  loading={busy === "browser"}
                  disabled={busy === "form"}
                >
                  <Globe /> Continue with Google or GitHub
                </Button>

                <div className="eyebrow my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  or with email
                  <span className="h-px flex-1 bg-border" />
                </div>

                <form onSubmit={submit} className="space-y-4" noValidate>
                  <Field label="Email" htmlFor="email">
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                    />
                  </Field>
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <label
                        htmlFor="password"
                        className="block text-[13px] font-medium text-fg"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        className="text-[12.5px] text-muted transition-colors hover:text-fg"
                        onClick={() =>
                          void window.codexa.openWeb("/forgot-password")
                        }
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? "signin-error" : undefined}
                    />
                    {error ? (
                      <p
                        id="signin-error"
                        role="alert"
                        className="text-[12.5px] text-danger"
                      >
                        {error}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="press group w-full"
                    loading={busy === "form"}
                    disabled={busy === "browser"}
                  >
                    Sign in{" "}
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </form>

                <p className="mt-5 text-center text-[13.5px] text-muted">
                  New to Codexa?{" "}
                  <button
                    type="button"
                    className="font-medium text-fg underline decoration-border-strong underline-offset-4 hover:decoration-fg"
                    onClick={() => void browser("signup")}
                  >
                    Create an account
                  </button>
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <p className="mono relative z-10 flex items-center justify-center gap-3 py-3.5 text-[11px] text-dim">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5" /> Your session stays on this PC
        </span>
        <span aria-hidden="true">/</span>
        <span>Codexa for Windows{info ? ` ${info.version}` : ""}</span>
        <span aria-hidden="true">/</span>
        <button
          type="button"
          className="hover:text-fg"
          onClick={() => void window.codexa.openWeb("/terms")}
        >
          Terms
        </button>
        <button
          type="button"
          className="hover:text-fg"
          onClick={() => void window.codexa.openWeb("/privacy")}
        >
          Privacy
        </button>
      </p>
    </div>
  );
}
