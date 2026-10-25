"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, LogOut, MonitorSmartphone } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import type { SessionItem } from "@/lib/billing/account-service";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogClose } from "@/components/ui/dialog";

type Status = { kind: "idle" | "busy" | "ok" | "error"; message?: string };

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
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
      setStatus({ kind: "ok", message: `Password updated. ${r.revokedSessions} other session${r.revokedSessions === 1 ? "" : "s"} signed out.` });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      if (err instanceof ClientApiError) {
        const fe = err.fieldErrors();
        if (err.code === "invalid_password") fe.currentPassword = err.message;
        setErrors(fe);
        setStatus({ kind: "error", message: err.message });
      } else setStatus({ kind: "error", message: "Could not change the password." });
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {hasPassword ? (
        <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword}>
          <Input id="currentPassword" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required aria-invalid={Boolean(errors.currentPassword)} />
        </Field>
      ) : (
        <Alert variant="info">You signed up with GitHub and have no password yet. Set one to also sign in with email.</Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="newPassword" error={errors.newPassword} hint="At least 8 characters with a letter and a number.">
          <Input id="newPassword" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} aria-invalid={Boolean(errors.newPassword)} />
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirm}>
          <Input id="confirmPassword" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required aria-invalid={Boolean(errors.confirm)} />
        </Field>
      </div>
      {status.kind === "error" && !Object.keys(errors).length ? <Alert variant="danger">{status.message}</Alert> : null}
      {status.kind === "ok" ? <Alert variant="success">{status.message}</Alert> : null}
      <div className="flex justify-end">
        <Button type="submit" loading={status.kind === "busy"}>
          {hasPassword ? "Change password" : "Set password"}
        </Button>
      </div>
    </form>
  );
}

function describeAgent(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : /curl/.test(ua) ? "curl" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

export function SessionsList({ initial }: { initial: SessionItem[] }) {
  const [sessions, setSessions] = useState(initial);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function revoke(id: string) {
    setBusyId(id);
    try {
      await api(`/api/v1/account/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
      setSessions((s) => s.filter((x) => x.id !== id));
      setStatus({ kind: "ok", message: "Session signed out." });
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
      setSessions((s) => s.filter((x) => x.current));
      setStatus({ kind: "ok", message: `${r.revoked} session${r.revoked === 1 ? "" : "s"} signed out.` });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Could not revoke sessions." });
    }
  }

  const others = sessions.filter((s) => !s.current).length;
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
            <div className="flex min-w-0 items-center gap-3">
              <MonitorSmartphone className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {describeAgent(s.userAgent)}
                  {s.current ? <Badge variant="success">This device</Badge> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.ip ?? "IP unknown"} · last active {new Date(s.lastSeenAt).toLocaleString()} · expires {new Date(s.expiresAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            {!s.current ? (
              <Button variant="outline" size="sm" onClick={() => revoke(s.id)} loading={busyId === s.id}>
                Sign out
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {status.kind === "error" ? <Alert variant="danger">{status.message}</Alert> : null}
      {status.kind === "ok" ? <Alert variant="success">{status.message}</Alert> : null}
      <div className="flex justify-end">
        <Button variant="outline" onClick={revokeOthers} disabled={others === 0} loading={status.kind === "busy"}>
          <LogOut className="size-4" aria-hidden="true" /> Sign out other sessions
        </Button>
      </div>
    </div>
  );
}

export function ExportCard() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Download a JSON file with your profile, workspace memberships, and every project (with files) in workspaces you own. Limited to 5 exports per hour.
      </p>
      <a href="/api/v1/account/export" download className={buttonClasses("outline", "md")}>
        <Download className="size-4" aria-hidden="true" /> Download export
      </a>
    </div>
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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">
        <p>Deleting your account anonymises your profile, signs you out everywhere and removes your credentials.</p>
        <p className="mt-1">Workspaces where you are the only member are deleted; shared workspaces you own are transferred to the next most senior member.</p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <Button variant="danger" onClick={() => setOpen(true)}>
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
    </div>
  );
}
