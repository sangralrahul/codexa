"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Mail, RotateCw } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert, Skeleton, Spinner } from "@/components/ui/misc";
import { Odometer } from "@/components/motion/odometer";
import { api, ClientApiError } from "@/lib/client/api";
import { shakeElement } from "@/lib/client/motion";
import { ideaHref, readPendingIdea, stashPendingIdea } from "@/lib/client/pending-idea";
import { cn } from "@/lib/utils";
import { IDEA_ROUTE, maskEmail, safeNext, withAuthParams } from "./params";
import { PasswordInput, PasswordMatch, PasswordRules, passwordProblem } from "./password";
import { GitHubButton, OrDivider, rememberAuthMethod } from "./oauth";
import { IdeaTicket } from "./idea-ticket";

type Phase = "idle" | "loading" | "success";
type Idea = { text: string; templateId?: string; templateName?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Friendly copy for the zod messages the auth routes return per field. */
function fieldMessage(path: string, message: string): string {
  if (path === "email") return "Enter a valid email address.";
  if (path === "password" && /too small|required|expected string/i.test(message)) return "Enter your password.";
  return message;
}

function fieldErrorsOf(err: ClientApiError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(err.fieldErrors())) out[k] = fieldMessage(k, v);
  return out;
}

/** What the success state of a submit button says, from where it is about to go. */
function arrivalLabel(target: string) {
  if (target.startsWith("/onboarding")) return "Setting up your workspace…";
  if (target.startsWith("/dashboard")) return "Opening your dashboard…";
  if (target.startsWith("/invite")) return "Opening your invitation…";
  if (target.startsWith("/projects")) return "Opening your project…";
  return "Signed in";
}

/** Keeps the carried idea in localStorage too, so it survives the GitHub round trip and new tabs. */
function stashIdea(idea: Idea | null | undefined): boolean {
  if (!idea?.text) return false;
  const existing = readPendingIdea();
  return Boolean(stashPendingIdea(idea.text, existing?.source ?? "home", idea.templateId ?? existing?.templateId));
}

/** Where to go after sign-in / sign-up when an idea came along (PLAN §4.1). */
function ideaTarget(serverNext: string, idea: Idea, stored: boolean) {
  if (serverNext.startsWith("/onboarding")) {
    // The onboarding page reads the stash; the URL carries the text only when storage is unavailable.
    return stored ? IDEA_ROUTE : `${IDEA_ROUTE}&${new URLSearchParams({ prompt: idea.text, ...(idea.templateId ? { template: idea.templateId } : {}) }).toString()}`;
  }
  return ideaHref("/dashboard", idea.text, idea.templateId);
}

function SwitchLine({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-sm text-muted-foreground">{children}</p>;
}

const switchLink = "font-medium text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-foreground";

/* ------------------------------------------------------------------ Sign up */

export function SignupForm({
  githubEnabled,
  next,
  email,
  idea: initialIdea,
}: {
  githubEnabled: boolean;
  next?: string;
  email?: string;
  /** The idea carried over from the homepage (`?prompt`, clamped on the server). */
  idea?: Idea | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState("/onboarding");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [emailTaken, setEmailTaken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [idea, setIdea] = useState<Idea | null>(initialIdea ?? null);

  // The ticket's idea goes into the stash as soon as the page opens (and again after an edit).
  useEffect(() => {
    stashIdea(idea);
  }, [idea]);

  const githubNext = safeNext(next, idea ? IDEA_ROUTE : "/onboarding");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase !== "idle") return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "");
    const mail = String(fd.get("email") ?? "").trim();
    const pw = String(fd.get("password") ?? "");
    const local: Record<string, string> = {};
    if (!EMAIL_RE.test(mail)) local.email = "Enter a valid email address.";
    const pwError = passwordProblem(pw);
    if (pwError) local.password = pwError;
    setError(null);
    setEmailTaken(null);
    if (Object.keys(local).length) {
      setFields(local);
      shakeElement(formRef.current);
      formRef.current?.querySelector<HTMLInputElement>(`#${Object.keys(local)[0]}`)?.focus();
      return;
    }
    setFields({});
    setPhase("loading");
    try {
      const res = await api<{ next: string }>("/api/auth/signup", { method: "POST", json: { name, email: mail, password: pw } });
      rememberAuthMethod("email");
      const stored = stashIdea(idea);
      const dest = next ? safeNext(next, res.next) : idea ? ideaTarget(res.next, idea, stored) : res.next;
      setTarget(dest);
      setPhase("success");
      router.push(dest);
      router.refresh();
    } catch (err) {
      setPhase("idle");
      if (err instanceof ClientApiError) {
        if (err.code === "email_taken") {
          setEmailTaken(mail);
          setFields({ email: "An account already uses this email." });
        } else {
          const f = fieldErrorsOf(err);
          setFields(f);
          if (!Object.keys(f).length) setError(err.message);
        }
      } else setError("Something went wrong. Please try again.");
      shakeElement(formRef.current);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="auth-rise flex flex-col gap-5" noValidate>
      {idea ? <IdeaTicket text={idea.text} templateName={idea.templateName} onChange={(text) => setIdea((i) => (i ? { ...i, text } : i))} /> : null}
      {githubEnabled ? (
        <div className="flex flex-col gap-5">
          <GitHubButton href={`/api/auth/github/start?next=${encodeURIComponent(githubNext)}`} onNavigate={() => stashIdea(idea)} />
          <OrDivider />
        </div>
      ) : null}
      <div className="empty:hidden">{error ? <Alert variant="danger">{error}</Alert> : null}</div>
      <Field label="Name" htmlFor="name" optional>
        <Input id="name" name="name" autoComplete="name" placeholder="Your name" maxLength={100} className="h-12 text-[15px]" />
      </Field>
      <div>
        <Field label="Email" htmlFor="email" error={fields.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="you@company.com"
            defaultValue={email ?? ""}
            onChange={() => {
              if (fields.email) setFields(({ email: _gone, ...rest }) => rest);
            }}
            className="h-12 text-[15px]"
          />
        </Field>
        {emailTaken ? (
          <Link href={withAuthParams("/login", { email: emailTaken, next, prompt: idea?.text, template: idea?.templateId })} className="pop-in group mt-2 inline-flex items-center gap-1 text-xs font-medium text-foreground">
            Sign in instead
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <div>
        <Field label="Password" htmlFor="password" error={fields.password}>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-describedby="password-rules"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fields.password && !passwordProblem(e.target.value)) setFields(({ password: _gone, ...rest }) => rest);
            }}
          />
        </Field>
        <PasswordRules id="password-rules" value={password} />
      </div>
      <Button type="submit" size="lg" className="w-full text-[15px]" state={phase} loadingLabel="Creating account…" successLabel={arrivalLabel(target)}>
        Create account
      </Button>
      <SwitchLine>
        Already have an account?{" "}
        <Link href={withAuthParams("/login", { next, email, prompt: idea?.text, template: idea?.templateId })} className={switchLink}>
          Sign in
        </Link>
      </SwitchLine>
    </form>
  );
}

/* ------------------------------------------------------------------ Sign in */

export function LoginForm({
  githubEnabled,
  next,
  email,
  prompt,
  template,
}: {
  githubEnabled: boolean;
  next?: string;
  email?: string;
  /** An idea carried over from the homepage (`?prompt`, clamped on the server). */
  prompt?: string;
  template?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState("/dashboard");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [typedEmail, setTypedEmail] = useState(email ?? "");
  const idea: Idea | null = prompt ? { text: prompt, templateId: template } : null;

  useEffect(() => {
    if (prompt) stashIdea({ text: prompt, templateId: template });
  }, [prompt, template]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase !== "idle") return;
    const fd = new FormData(e.currentTarget);
    const mail = String(fd.get("email") ?? "").trim();
    const pw = String(fd.get("password") ?? "");
    const local: Record<string, string> = {};
    if (!EMAIL_RE.test(mail)) local.email = "Enter a valid email address.";
    if (!pw) local.password = "Enter your password.";
    setError(null);
    if (Object.keys(local).length) {
      setFields(local);
      shakeElement(formRef.current);
      formRef.current?.querySelector<HTMLInputElement>(`#${Object.keys(local)[0]}`)?.focus();
      return;
    }
    setFields({});
    setPhase("loading");
    try {
      const res = await api<{ next: string }>("/api/auth/login", { method: "POST", json: { email: mail, password: pw } });
      rememberAuthMethod("email");
      const dest = next ? safeNext(next, res.next) : idea ? ideaTarget(res.next, idea, stashIdea(idea)) : res.next;
      setTarget(dest);
      setPhase("success");
      router.push(dest);
      router.refresh();
    } catch (err) {
      setPhase("idle");
      if (err instanceof ClientApiError) {
        if (err.code === "invalid_credentials") setFields({ password: "That email and password don't match. Check both and try again." });
        else {
          const f = fieldErrorsOf(err);
          setFields(f);
          if (!Object.keys(f).length) setError(err.message);
        }
      } else setError("Something went wrong. Please try again.");
      shakeElement(formRef.current);
    }
  }

  const mailForLinks = EMAIL_RE.test(typedEmail.trim()) ? typedEmail.trim() : email;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="auth-rise flex flex-col gap-5" noValidate>
      {githubEnabled ? (
        <div className="flex flex-col gap-5">
          <GitHubButton href={`/api/auth/github/start?next=${encodeURIComponent(safeNext(next, idea ? IDEA_ROUTE : "/dashboard"))}`} />
          <OrDivider />
        </div>
      ) : null}
      <div className="empty:hidden">{error ? <Alert variant="danger">{error}</Alert> : null}</div>
      <Field label="Email" htmlFor="email" error={fields.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@company.com"
          value={typedEmail}
          onChange={(e) => {
            setTypedEmail(e.target.value);
            if (fields.email) setFields(({ email: _gone, ...rest }) => rest);
          }}
          autoFocus={!email}
          className="h-12 text-[15px]"
        />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        error={fields.password}
        labelAside={
          <Link href={withAuthParams("/forgot-password", { email: mailForLinks })} className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline">
            Forgot password?
          </Link>
        }
      >
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          autoFocus={Boolean(email)}
          onChange={() => {
            if (fields.password) setFields(({ password: _gone, ...rest }) => rest);
          }}
        />
      </Field>
      <Button type="submit" size="lg" className="w-full text-[15px]" state={phase} loadingLabel="Signing in…" successLabel={arrivalLabel(target)}>
        Sign in
      </Button>
      <SwitchLine>
        New to Codexa?{" "}
        <Link href={withAuthParams("/signup", { next, email: mailForLinks, prompt, template })} className={switchLink}>
          Create an account
        </Link>
      </SwitchLine>
    </form>
  );
}

/* ------------------------------------------------------------------ Forgot password */

const RESEND_SECONDS = 60;

export function ForgotPasswordForm({ emailConfigured, email: initialEmail }: { emailConfigured: boolean; email?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [left, setLeft] = useState(0);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(0);

  useEffect(() => {
    if (left <= 0) return;
    const id = window.setTimeout(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [left]);

  async function request(address: string) {
    await api("/api/auth/forgot-password", { method: "POST", json: { email: address } });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase !== "idle") return;
    const address = email.trim();
    setError(null);
    if (!EMAIL_RE.test(address)) {
      setFieldError("Enter a valid email address.");
      shakeElement(formRef.current);
      return;
    }
    setFieldError(null);
    setPhase("loading");
    try {
      await request(address);
      setSentTo(address);
      setLeft(RESEND_SECONDS);
      setPhase("idle");
    } catch (err) {
      setPhase("idle");
      if (err instanceof ClientApiError && err.fieldErrors().email) setFieldError("Enter a valid email address.");
      else setError(err instanceof ClientApiError ? err.message : "Something went wrong. Please try again.");
      shakeElement(formRef.current);
    }
  }

  async function resend() {
    if (!sentTo || left > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await request(sentTo);
      setResent((n) => n + 1);
      setLeft(RESEND_SECONDS);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not send it again. Please try later.");
    } finally {
      setResending(false);
    }
  }

  if (sentTo) {
    return (
      <div className="auth-rise flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl border border-border-strong bg-card shadow-md">
            <Mail className="size-6 text-foreground" aria-hidden="true" />
            <span className={cn("mail-tile__badge absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full ring-2 ring-background", emailConfigured ? "bg-success text-background" : "bg-warning text-background")}>
              {emailConfigured ? (
                <svg viewBox="0 0 16 16" aria-hidden="true" className="check-draw size-3">
                  <path d="M3.5 8.5 6.6 11.5 12.5 5" pathLength={1} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span aria-hidden="true" className="text-[11px] font-bold leading-none">!</span>
              )}
            </span>
          </span>
          <div className="min-w-0" role="status">
            <h2 className="text-title">{emailConfigured ? "Check your email" : "Request recorded"}</h2>
            {emailConfigured ? (
              <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">
                If an account exists for <span className="font-medium text-foreground">{maskEmail(sentTo)}</span>, a reset link is on its way. It expires in one hour.
                {resent ? " We sent it again." : null}
              </p>
            ) : (
              <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">
                Email delivery isn&apos;t configured on this deployment, so no reset link was sent to {maskEmail(sentTo)}. Ask the workspace operator to set up email or to reset
                your password for you.
              </p>
            )}
          </div>
        </div>
        <div className="empty:hidden">{error ? <Alert variant="danger">{error}</Alert> : null}</div>
        <div className="flex flex-col gap-3">
          {emailConfigured ? (
            <Button type="button" variant="outline" size="lg" className="w-full text-[15px]" onClick={resend} disabled={left > 0 || resending} loading={resending}>
              {resending ? null : <RotateCw className="size-4" aria-hidden="true" />}
              {left > 0 ? (
                <span className="inline-flex items-baseline gap-1">
                  Resend in <Odometer value={left} trigger="change" className="tabular-nums" />s
                </span>
              ) : (
                "Resend the link"
              )}
            </Button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              setLeft(0);
              setResent(0);
              setError(null);
            }}
            className="self-center text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Use a different email
          </button>
        </div>
        <BackToSignIn />
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="auth-rise flex flex-col gap-5" noValidate>
      <div className="empty:hidden">{error ? <Alert variant="danger">{error}</Alert> : null}</div>
      <Field label="Email" htmlFor="email" error={fieldError}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          autoFocus
          placeholder="you@company.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldError) setFieldError(null);
          }}
          className="h-12 text-[15px]"
        />
      </Field>
      {emailConfigured ? null : (
        <Alert variant="info" live={false} title="Email isn't set up here">
          Email delivery isn&apos;t configured on this deployment, so reset links are not sent. Ask the workspace operator.
        </Alert>
      )}
      <Button type="submit" size="lg" className="w-full text-[15px]" state={phase} loadingLabel="Sending…">
        Send reset link
      </Button>
      <BackToSignIn />
    </form>
  );
}

function BackToSignIn() {
  return (
    <Link href="/login" className="group inline-flex items-center justify-center gap-1.5 self-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
      <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
      Back to sign in
    </Link>
  );
}

/* ------------------------------------------------------------------ Reset password */

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase !== "idle") return;
    const local: Record<string, string> = {};
    const pwError = passwordProblem(password);
    if (pwError) local.password = pwError;
    else if (password !== confirm) local.confirm = "Passwords do not match";
    setError(null);
    setExpired(false);
    if (Object.keys(local).length) {
      setFields(local);
      shakeElement(formRef.current);
      formRef.current?.querySelector<HTMLInputElement>(`#${Object.keys(local)[0]}`)?.focus();
      return;
    }
    setFields({});
    setPhase("loading");
    try {
      await api("/api/auth/reset-password", { method: "POST", json: { token, password } });
      setPhase("success");
      router.push("/login?reset=1");
    } catch (err) {
      setPhase("idle");
      if (err instanceof ClientApiError && (err.code === "invalid_token" || err.fieldErrors().token)) setExpired(true);
      else if (err instanceof ClientApiError && err.fieldErrors().password) setFields({ password: err.fieldErrors().password });
      else setError(err instanceof ClientApiError ? err.message : "Something went wrong. Please try again.");
      shakeElement(formRef.current);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="auth-rise flex flex-col gap-5" noValidate>
      <div className="empty:hidden">
        {expired ? (
          <Alert variant="danger" title="This link has expired">
            Reset links work once and expire after an hour.{" "}
            <Link href="/forgot-password" className="font-medium text-foreground underline underline-offset-4">
              Request a new link
            </Link>
            .
          </Alert>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : null}
      </div>
      <div>
        <Field label="New password" htmlFor="password" error={fields.password}>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            autoFocus
            aria-describedby="password-rules"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fields.password && !passwordProblem(e.target.value)) setFields({});
            }}
          />
        </Field>
        <PasswordRules id="password-rules" value={password} />
      </div>
      <div>
        <Field label="Confirm password" htmlFor="confirm" error={fields.confirm}>
          <PasswordInput
            id="confirm"
            name="confirm"
            autoComplete="new-password"
            required
            minLength={8}
            aria-describedby="confirm-match"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (fields.confirm) setFields({});
            }}
          />
        </Field>
        {fields.confirm ? null : <PasswordMatch id="confirm-match" password={password} confirm={confirm} />}
      </div>
      <Button type="submit" size="lg" className="w-full text-[15px]" state={phase} loadingLabel="Updating…" successLabel="Password updated">
        Update password
      </Button>
      <BackToSignIn />
    </form>
  );
}

/* ------------------------------------------------------------------ Verify email */

export function VerifyEmail({ token }: { token: string | null }) {
  const [state, setState] = useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!token) return;
    api<{ ok: boolean }>("/api/auth/verify-email", { method: "POST", json: { token } })
      .then(() => setState("ok"))
      .catch((err) => {
        setState("error");
        setMessage(err instanceof ClientApiError ? err.message : "Verification failed.");
      });
  }, [token]);

  if (!token) {
    return (
      <div className="auth-rise flex flex-col gap-5">
        <Alert variant="warning" title="This link is missing its token">
          Open the link from your verification email again, or send yourself a new one.
        </Alert>
        <VerifyActions />
      </div>
    );
  }
  if (state === "idle") {
    return (
      <div role="status" className="flex flex-col gap-4">
        <p className="flex items-center gap-2.5 text-sm text-foreground">
          <Spinner className="text-signal" />
          Verifying your email…
        </p>
        <div className="space-y-2.5" aria-hidden="true">
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>
    );
  }
  if (state === "ok") {
    return (
      <div className="auth-rise flex flex-col gap-5">
        <Alert variant="success" title="Email verified">
          Your email address is confirmed. Deployments are unlocked.
        </Alert>
        <Link href="/dashboard" className={buttonClasses("primary", "lg", "w-full text-[15px]")}>
          Continue to dashboard
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }
  return (
    <div className="auth-rise flex flex-col gap-5">
      <Alert variant="danger" title="We couldn't verify this link">
        {message}
      </Alert>
      <VerifyActions />
    </div>
  );
}

function VerifyActions() {
  return (
    <div className="flex flex-col gap-3">
      <ResendVerificationButton size="lg" className="w-full text-[15px]" />
      <Link href="/dashboard" className={buttonClasses("ghost", "lg", "w-full text-[15px]")}>
        Go to dashboard
      </Link>
      <p className="text-center text-xs text-muted-foreground">Resending needs you to be signed in.</p>
    </div>
  );
}

/** Sends a fresh verification email to the signed-in user (also used by the app shell banner). */
export function ResendVerificationButton({ size = "sm", className }: { size?: "sm" | "lg"; className?: string } = {}) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  return (
    <Button
      variant="outline"
      size={size}
      className={className}
      loading={state === "busy"}
      disabled={state === "sent"}
      onClick={async () => {
        setState("busy");
        try {
          await api("/api/auth/resend-verification", { method: "POST" });
          setState("sent");
        } catch {
          setState("error");
        }
      }}
    >
      {state === "sent" ? "Verification email sent" : state === "error" ? "Could not send, try later" : "Resend verification email"}
    </Button>
  );
}
