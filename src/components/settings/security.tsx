"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Download, Eye, EyeOff, KeyRound, Laptop, LogOut, Monitor, Smartphone, Tablet, Terminal, TriangleAlert, type LucideIcon } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import type { SessionItem } from "@/lib/billing/account-service";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert, LiveDot } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { SettingsCard, tableRow } from "./section";
import { absoluteTime, relativeTime } from "./usage-model";

type Status = { kind: "idle" | "busy" | "ok" | "error"; message?: string };

/** The same rule the server applies (src/lib/auth/flows.ts validatePassword). Informational only. */
const RULES: { id: string; label: string; test: (pw: string) => boolean }[] = [
  { id: "len", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { id: "letter", label: "A letter", test: (pw) => /[a-zA-Z]/.test(pw) },
  { id: "number", label: "A number", test: (pw) => /[0-9]/.test(pw) },
];

function PasswordInput({ id, value, onChange, autoComplete, invalid, show, onToggle, ...rest }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean; show: boolean; onToggle: () => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined} className="pr-10" spellCheck={false} {...rest} />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        aria-controls={id}
        className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    if (next !== confirm) {
      setErrors({ confirm: "Passwords do not match" });
      return;
    }
    setStatus({ kind: "busy" });
    try {
      const r = await api<{ revokedSessions: number }>("/api/v1/account/password", { method: "POST", json: { currentPassword: current, newPassword: next } });
      const message = `Password updated. ${r.revokedSessions} other session${r.revokedSessions === 1 ? "" : "s"} signed out.`;
      setStatus({ kind: "ok", message });
      toast.success("Password updated", `${r.revokedSessions} other session${r.revokedSessions === 1 ? "" : "s"} signed out.`);
      setCurrent("");
      setNext("");
      setConfirm("");
      setShow(false);
    } catch (err) {
      if (err instanceof ClientApiError) {
        const fe = err.fieldErrors();
        if (err.code === "invalid_password") fe.currentPassword = err.message;
        setErrors(fe);
        setStatus({ kind: "error", message: err.message });
      } else setStatus({ kind: "error", message: "Could not change the password." });
    }
  }

  const matches = confirm.length > 0 && confirm === next;
  return (
    <form onSubmit={onSubmit} noValidate>
      <SettingsCard
        id="password"
        icon={<KeyRound />}
        title="Password"
        description="Changing your password signs out every other device."
        bodyClassName="space-y-4"
        hint={
          status.kind === "ok" ? (
            <span role="status" className="pop-in inline-block text-success">
              {status.message}
            </span>
          ) : (
            "Use at least 8 characters with a letter and a number."
          )
        }
        footer={
          <Button type="submit" size="sm" state={status.kind === "busy" ? "loading" : status.kind === "ok" ? "success" : "idle"} successLabel="Updated" successDuration={1800}>
            {hasPassword ? "Change password" : "Set password"}
          </Button>
        }
      >
        {hasPassword ? (
          <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword}>
            <PasswordInput id="currentPassword" autoComplete="current-password" value={current} onChange={setCurrent} invalid={Boolean(errors.currentPassword)} show={show} onToggle={() => setShow((s) => !s)} required />
          </Field>
        ) : (
          <Alert variant="info" live={false}>
            You signed up with GitHub and have no password yet. Set one to also sign in with email.
          </Alert>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="New password" htmlFor="newPassword" error={errors.newPassword}>
            <PasswordInput id="newPassword" autoComplete="new-password" value={next} onChange={setNext} invalid={Boolean(errors.newPassword)} show={show} onToggle={() => setShow((s) => !s)} required minLength={8} aria-describedby="password-rules" />
          </Field>
          <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirm}>
            <PasswordInput id="confirmPassword" autoComplete="new-password" value={confirm} onChange={setConfirm} invalid={Boolean(errors.confirm)} show={show} onToggle={() => setShow((s) => !s)} required />
          </Field>
        </div>
        <ul id="password-rules" className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs" aria-label="Password rules">
          {[...RULES.map((r) => ({ id: r.id, label: r.label, ok: r.test(next) })), { id: "match", label: "Both entries match", ok: matches }].map((r) => (
            <li key={r.id} data-ok={r.ok ? "" : undefined} className={cn("pw-rule inline-flex items-center gap-1.5 transition-colors", r.ok ? "text-foreground" : "text-muted-foreground")}>
              <span className={cn("flex size-4 items-center justify-center rounded-full transition-colors", r.ok ? "bg-success text-background" : "border border-border-strong")}>
                {r.ok ? (
                  <svg key="ok" viewBox="0 0 16 16" className="check-draw size-2.5" aria-hidden="true">
                    <path d="M3.5 8.5 6.6 11.5 12.5 5" pathLength={1} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </span>
              {r.label}
              <span className="sr-only">{r.ok ? ": met" : ": not yet"}</span>
            </li>
          ))}
        </ul>
        {status.kind === "error" && !Object.keys(errors).length ? <Alert variant="danger">{status.message}</Alert> : null}
      </SettingsCard>
    </form>
  );
}

function describeAgent(ua: string | null): { label: string; Icon: LucideIcon } {
  if (!ua) return { label: "Unknown device", Icon: Monitor };
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : /curl/i.test(ua) ? "curl" : /node|undici|axios|python|go-http/i.test(ua) ? "API client" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /iPad/.test(ua) ? "iPadOS" : /iPhone/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : "";
  const Icon = browser === "curl" || browser === "API client" ? Terminal : /iPad|Tablet/.test(ua) ? Tablet : /iPhone|Android.*Mobile|Mobile/.test(ua) ? Smartphone : os ? Laptop : Monitor;
  return { label: os ? `${browser} on ${os}` : browser, Icon };
}

/** The client IP as recorded at sign-in; the API stores "unknown" when no proxy header carried one. */
function ipLabel(ip: string | null) {
  const v = ip?.trim();
  return v && v.toLowerCase() !== "unknown" ? v : "IP not recorded";
}

/** Rows shown before the disclosure: this device plus the most recently active others. */
const SESSIONS_PREVIEW = 5;

export function SessionsList({ initial }: { initial: SessionItem[] }) {
  const [sessions, setSessions] = useState(initial);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  function collapse(ids: string[]) {
    setLeaving((s) => new Set([...s, ...ids]));
    window.setTimeout(() => {
      setSessions((list) => list.filter((x) => !ids.includes(x.id)));
      setLeaving((s) => new Set([...s].filter((x) => !ids.includes(x))));
    }, 260);
  }

  async function revoke(id: string) {
    setBusyId(id);
    try {
      await api(`/api/v1/account/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
      collapse([id]);
      setStatus({ kind: "ok", message: "Session signed out." });
      toast.success("Session signed out");
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Could not revoke the session." });
    } finally {
      setBusyId(null);
    }
  }
  async function revokeOthers() {
    setStatus({ kind: "busy" });
    try {
      const r = await api<{ revoked: number }>("/api/v1/account/sessions", { method: "DELETE" });
      collapse(sessions.filter((x) => !x.current).map((x) => x.id));
      const message = `${r.revoked} session${r.revoked === 1 ? "" : "s"} signed out.`;
      setStatus({ kind: "ok", message });
      toast.success(message);
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Could not revoke sessions." });
    }
  }

  const others = sessions.filter((s) => !s.current && !leaving.has(s.id)).length;
  const count = sessions.length - leaving.size;
  // This device first, then the rest by last activity (the server already orders them that way).
  const ordered = [...sessions.filter((s) => s.current), ...sessions.filter((s) => !s.current)];
  const hidden = Math.max(0, ordered.length - SESSIONS_PREVIEW);
  const shown = expanded ? ordered : ordered.slice(0, SESSIONS_PREVIEW);
  return (
    <SettingsCard
      id="sessions"
      icon={<Laptop />}
      title={
        <>
          Active sessions <span className="font-normal text-muted-foreground">{count}</span>
        </>
      }
      description="Devices currently signed in to your account. Sessions expire after 30 days."
      flush
      hint={
        status.kind === "ok" ? (
          <span role="status" className="pop-in inline-block text-success">
            {status.message}
          </span>
        ) : (
          `${count} active session${count === 1 ? "" : "s"}`
        )
      }
      footer={
        <Button variant="outline" size="sm" onClick={revokeOthers} disabled={others === 0} loading={status.kind === "busy"}>
          <LogOut className="size-3.5" aria-hidden="true" /> Sign out other sessions
        </Button>
      }
    >
      <ul id="sessions-list">
        {shown.map((s) => {
          const { label, Icon } = describeAgent(s.userAgent);
          return (
            <li key={s.id} className="diff-row" data-collapsed={leaving.has(s.id) ? "" : undefined}>
              <div className={cn(tableRow, "flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm sm:px-6")}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cn("relative flex size-9 shrink-0 items-center justify-center rounded-[10px]", s.current ? "bg-foreground text-background" : "icon-tile text-muted-foreground")}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {label}
                      {s.current ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-medium text-success">
                          <LiveDot /> This device
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      <span>{ipLabel(s.ip)}</span> · active{" "}
                      <Tooltip content={absoluteTime(s.lastSeenAt)}>
                        <time dateTime={s.lastSeenAt} tabIndex={0} className="rounded underline decoration-dotted decoration-border-strong underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-ring" suppressHydrationWarning>
                          {s.current ? "now" : relativeTime(s.lastSeenAt)}
                        </time>
                      </Tooltip>{" "}
                      · expires{" "}
                      <time dateTime={s.expiresAt} suppressHydrationWarning>
                        {new Date(s.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </time>
                    </p>
                  </div>
                </div>
                {!s.current ? (
                  <Button variant="outline" size="sm" onClick={() => revoke(s.id)} loading={busyId === s.id}>
                    Sign out
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {hidden > 0 ? (
        <div className={cn(tableRow, "px-5 py-2.5 sm:px-6")}>
          <Button variant="ghost" size="sm" className="-ml-2.5 text-muted-foreground hover:text-foreground" aria-expanded={expanded} aria-controls="sessions-list" onClick={() => setExpanded((v) => !v)}>
            <ChevronDown className={cn("size-3.5 transition-transform duration-200 calm:transition-none", expanded && "rotate-180")} aria-hidden="true" />
            {expanded ? "Show fewer" : `Show ${hidden} more`}
          </Button>
        </div>
      ) : null}
      {status.kind === "error" ? (
        <div className="px-5 pb-4 sm:px-6">
          <Alert variant="danger">{status.message}</Alert>
        </div>
      ) : null}
    </SettingsCard>
  );
}

export function ExportCard() {
  return (
    <SettingsCard
      id="export"
      icon={<Download />}
      title="Export your data"
      description="Download a JSON file with your profile, workspace memberships, and every project (with files) in workspaces you own."
      hint="Limited to 5 exports per hour."
      footer={
        <a href="/api/v1/account/export" download className={buttonClasses("outline", "sm")}>
          <Download className="size-3.5" aria-hidden="true" /> Download export
        </a>
      }
    />
  );
}

export function DeleteAccountCard({ hasPassword, email }: { hasPassword: boolean; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "busy" });
    try {
      await api("/api/v1/account/delete", { method: "POST", json: { password } });
      router.push("/?account=deleted");
      router.refresh();
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Could not delete the account." });
    }
  }

  return (
    <SettingsCard
      id="delete-account"
      tone="danger"
      icon={<TriangleAlert />}
      title="Delete account"
      description="Deleting your account anonymises your profile, signs you out everywhere and removes your credentials."
      hint="Workspaces where you are the only member are deleted; shared workspaces you own go to the next most senior member."
      footer={
        <Dialog open={open} onOpenChange={setOpen}>
          <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
            Delete account
          </Button>
          <DialogContent title="Delete your account?" description="This cannot be undone. Export your data first if you want to keep it.">
            <form onSubmit={onConfirm} className="space-y-4">
              <Field label={hasPassword ? "Confirm with your password" : "Type your email address to confirm"} htmlFor="deleteConfirm">
                <Input
                  id="deleteConfirm"
                  type={hasPassword ? "password" : "email"}
                  autoComplete={hasPassword ? "current-password" : "email"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={hasPassword ? "" : email}
                  required
                />
              </Field>
              {status.kind === "error" ? <Alert variant="danger">{status.message}</Alert> : null}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Keep my account
                  </Button>
                </DialogClose>
                <Button type="submit" variant="danger" loading={status.kind === "busy"}>
                  Permanently delete
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    />
  );
}
