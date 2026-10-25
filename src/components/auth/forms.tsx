"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { api, ClientApiError } from "@/lib/client/api";

function safeNext(next: string | null, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export function SignupForm({ githubEnabled }: { githubEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFields({});
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api<{ next: string }>("/api/auth/signup", {
        method: "POST",
        json: { name: fd.get("name"), email: fd.get("email"), password: fd.get("password") },
      });
      router.push(safeNext(params.get("next"), res.next));
      router.refresh();
    } catch (err) {
      if (err instanceof ClientApiError) {
        setFields(err.fieldErrors());
        setError(err.message);
      } else setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Field label="Name" htmlFor="name">
        <Input id="name" name="name" autoComplete="name" placeholder="Your name" maxLength={100} />
      </Field>
      <Field label="Email" htmlFor="email" error={fields.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" aria-invalid={Boolean(fields.email)} />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters with a letter and a number." error={fields.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-invalid={Boolean(fields.password)} />
      </Field>
      <Button type="submit" className="w-full" loading={loading}>
        Create account
      </Button>
      {githubEnabled ? (
        <a href="/api/auth/github/start?next=/onboarding" className="flex h-10 w-full items-center justify-center rounded-lg border border-border-strong text-sm font-medium hover:bg-muted">
          Continue with GitHub
        </a>
      ) : null}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function LoginForm({ githubEnabled }: { githubEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api<{ next: string }>("/api/auth/login", { method: "POST", json: { email: fd.get("email"), password: fd.get("password") } });
      router.push(safeNext(params.get("next"), res.next));
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-muted-foreground underline hover:text-foreground">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="w-full" loading={loading}>
        Sign in
      </Button>
      {githubEnabled ? (
        <a href={`/api/auth/github/start?next=${encodeURIComponent(safeNext(params.get("next"), "/dashboard"))}`} className="flex h-10 w-full items-center justify-center rounded-lg border border-border-strong text-sm font-medium hover:bg-muted">
          Continue with GitHub
        </a>
      ) : null}
      <p className="text-center text-sm text-muted-foreground">
        New to Codexa?{" "}
        <Link href="/signup" className="font-medium text-foreground underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await api("/api/auth/forgot-password", { method: "POST", json: { email: fd.get("email") } });
      setDone(true);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }
  if (done) return <Alert variant="success" title="Check your email">If an account exists for that address, we sent a password reset link. It expires in one hour.</Alert>;
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" className="w-full" loading={loading}>
        Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("password") !== fd.get("confirm")) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api("/api/auth/reset-password", { method: "POST", json: { token, password: fd.get("password") } });
      router.push("/login?reset=1");
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Field label="New password" htmlFor="password" hint="At least 8 characters with a letter and a number.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Confirm password" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Button type="submit" className="w-full" loading={loading}>
        Update password
      </Button>
    </form>
  );
}

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
  if (!token) return <Alert variant="warning">This verification link is missing a token. Open the link from your email.</Alert>;
  if (state === "idle") return <p className="text-sm text-muted-foreground">Verifying your email…</p>;
  if (state === "ok")
    return (
      <div className="space-y-4">
        <Alert variant="success" title="Email verified">Your email address has been confirmed.</Alert>
        <Button asChild className="w-full">
          <Link href="/dashboard">Continue to dashboard</Link>
        </Button>
      </div>
    );
  return <Alert variant="danger">{message}</Alert>;
}

export function ResendVerificationButton() {
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
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
