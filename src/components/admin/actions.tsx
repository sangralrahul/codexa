"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";

type Flash = { kind: "ok" | "error"; message: string } | null;

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);
  async function run(fn: () => Promise<string | void>, fallback = "Action failed") {
    setBusy(true);
    setFlash(null);
    try {
      const msg = await fn();
      if (msg) setFlash({ kind: "ok", message: msg });
      router.refresh();
    } catch (err) {
      setFlash({ kind: "error", message: err instanceof ClientApiError ? err.message : fallback });
    } finally {
      setBusy(false);
    }
  }
  return { busy, flash, run };
}

function FlashLine({ flash }: { flash: Flash }) {
  if (!flash) return null;
  return (
    <p role={flash.kind === "error" ? "alert" : "status"} className={flash.kind === "error" ? "text-xs text-danger" : "text-xs text-success"}>
      {flash.message}
    </p>
  );
}

// --- Users ------------------------------------------------------------------
export function UserActions({ user, actorRole, isSelf }: { user: { id: string; email: string; role: "user" | "staff" | "admin"; deletedAt: string | null }; actorRole: "user" | "staff" | "admin"; isSelf: boolean }) {
  const { busy, flash, run } = useAction();
  const suspended = Boolean(user.deletedAt);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actorRole === "admin" ? (
        <>
          <label htmlFor={`role-${user.id}`} className="sr-only">
            Role for {user.email}
          </label>
          <Select
            id={`role-${user.id}`}
            className="h-8 w-28 text-xs"
            defaultValue={user.role}
            disabled={busy || isSelf}
            onChange={(e) => run(async () => {
              await api(`/api/v1/admin/users/${user.id}`, { method: "PATCH", json: { role: e.target.value } });
              return `Role set to ${e.target.value}`;
            })}
          >
            <option value="user">user</option>
            <option value="staff">staff</option>
            <option value="admin">admin</option>
          </Select>
        </>
      ) : null}
      {!isSelf ? (
        <Button
          size="sm"
          variant={suspended ? "outline" : "danger"}
          loading={busy}
          onClick={() => {
            if (!suspended && !window.confirm(`Suspend ${user.email}? They are signed out everywhere and cannot sign in until restored.`)) return;
            void run(async () => {
              await api(`/api/v1/admin/users/${user.id}`, { method: "PATCH", json: { suspended: !suspended } });
              return suspended ? "User restored" : "User suspended";
            });
          }}
        >
          {suspended ? "Restore" : "Suspend"}
        </Button>
      ) : null}
      <FlashLine flash={flash} />
    </div>
  );
}

// --- Workspaces: manual plan override ----------------------------------------
export function PlanOverrideDialog({ workspace }: { workspace: { id: string; name: string; plan: string } }) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(workspace.plan);
  const [periodEnd, setPeriodEnd] = useState("");
  const [note, setNote] = useState("");
  const { busy, flash, run } = useAction();
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Override plan
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={`Set plan for ${workspace.name}`} description="Creates a manual subscription that takes precedence over the stored plan. Use for enterprise agreements, trials or support credits. Every change is audited.">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await api(`/api/v1/admin/workspaces/${workspace.id}`, { method: "PATCH", json: { plan, periodEnd: periodEnd ? new Date(periodEnd).toISOString() : null, note } });
                setOpen(false);
                return "Plan updated";
              });
            }}
          >
            <Field label="Plan" htmlFor="ov-plan">
              <Select id="ov-plan" value={plan} onChange={(e) => setPlan(e.target.value)}>
                <option value="free">Free (removes override)</option>
                <option value="pro">Pro</option>
                <option value="team">Team</option>
                <option value="enterprise">Enterprise</option>
              </Select>
            </Field>
            <Field label="Valid until" htmlFor="ov-end" hint="Leave empty for no end date. After this date the workspace falls back to Free.">
              <Input id="ov-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </Field>
            <Field label="Note" htmlFor="ov-note" hint="Stored in the audit log.">
              <Textarea id="ov-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} />
            </Field>
            {flash?.kind === "error" ? <Alert variant="danger">{flash.message}</Alert> : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" loading={busy}>
                Apply override
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Status selects (tickets, abuse) ----------------------------------------
export function StatusSelect({ endpoint, id, status, label }: { endpoint: "support" | "abuse"; id: string; status: "open" | "in_progress" | "closed"; label: string }) {
  const { busy, flash, run } = useAction();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`st-${id}`} className="sr-only">
        {label}
      </label>
      <Select
        id={`st-${id}`}
        className="h-8 w-32 text-xs"
        defaultValue={status}
        disabled={busy}
        onChange={(e) => run(async () => {
          await api(`/api/v1/admin/${endpoint}/${id}`, { method: "PATCH", json: { status: e.target.value } });
          return "Status updated";
        })}
      >
        <option value="open">Open</option>
        <option value="in_progress">In progress</option>
        <option value="closed">Closed</option>
      </Select>
      <FlashLine flash={flash} />
    </div>
  );
}

// --- Jobs ---------------------------------------------------------------------
export function RetryJobButton({ id }: { id: string }) {
  const { busy, flash, run } = useAction();
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" loading={busy} onClick={() => run(async () => {
        await api(`/api/v1/admin/jobs/${id}/retry`, { method: "POST" });
        return "Re-queued";
      })}>
        <RefreshCw className="size-3.5" aria-hidden="true" /> Retry
      </Button>
      <FlashLine flash={flash} />
    </div>
  );
}
export function RetryAllFailedButton({ count }: { count: number }) {
  const { busy, flash, run } = useAction();
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={count === 0} loading={busy} onClick={() => run(async () => {
        const r = await api<{ retried: number }>("/api/v1/admin/jobs/retry-failed", { method: "POST" });
        return `${r.retried} job${r.retried === 1 ? "" : "s"} re-queued`;
      })}>
        Retry all failed ({count})
      </Button>
      <FlashLine flash={flash} />
    </div>
  );
}

// --- Feature flags ------------------------------------------------------------
export function FlagRowActions({ flag }: { flag: { key: string; enabled: boolean } }) {
  const { busy, flash, run } = useAction();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant={flag.enabled ? "outline" : "primary"}
        loading={busy}
        aria-pressed={flag.enabled}
        onClick={() => run(async () => {
          await api(`/api/v1/admin/feature-flags/${encodeURIComponent(flag.key)}`, { method: "PATCH", json: { enabled: !flag.enabled } });
          return flag.enabled ? "Disabled" : "Enabled";
        })}
      >
        {flag.enabled ? "Disable" : "Enable"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-danger"
        disabled={busy}
        onClick={() => {
          if (!window.confirm(`Delete flag "${flag.key}"? Code that checks it will see it as disabled.`)) return;
          void run(async () => {
            await api(`/api/v1/admin/feature-flags/${encodeURIComponent(flag.key)}`, { method: "DELETE" });
            return "Deleted";
          });
        }}
      >
        Delete
      </Button>
      <FlashLine flash={flash} />
    </div>
  );
}

export function NewFlagForm() {
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(false);
  const { busy, flash, run } = useAction();
  return (
    <form
      className="grid gap-3 glow-card rounded-2xl border border-border p-4 sm:grid-cols-[200px_minmax(0,1fr)_auto_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          await api("/api/v1/admin/feature-flags", { method: "POST", json: { key, description, enabled } });
          setKey("");
          setDescription("");
          setEnabled(false);
          return `Flag "${key}" saved`;
        });
      }}
    >
      <Field label="Key" htmlFor="flag-key" hint="e.g. billing.annual_discount">
        <Input id="flag-key" value={key} onChange={(e) => setKey(e.target.value)} required minLength={2} maxLength={64} pattern="[a-z0-9][a-z0-9_.-]{1,63}" className="h-9 font-mono text-xs" />
      </Field>
      <Field label="Description" htmlFor="flag-desc">
        <Input id="flag-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} className="h-9" />
      </Field>
      <label className="flex h-9 items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="size-4 accent-primary" /> Enabled
      </label>
      <Button type="submit" size="sm" className="h-9" loading={busy}>
        Save flag
      </Button>
      {flash ? (
        <div className="sm:col-span-4">
          <FlashLine flash={flash} />
        </div>
      ) : null}
    </form>
  );
}

// --- Showcase -----------------------------------------------------------------
export function ShowcaseReviewButtons({ id, approved }: { id: string; approved: boolean }) {
  const { busy, flash, run } = useAction();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!approved ? (
        <Button size="sm" loading={busy} onClick={() => run(async () => {
          await api(`/api/v1/admin/showcase/${id}`, { method: "PATCH", json: { action: "approve" } });
          return "Approved";
        })}>
          Approve
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        className="text-danger"
        disabled={busy}
        onClick={() => {
          if (!window.confirm(approved ? "Remove this entry from the showcase?" : "Reject this submission? The author can resubmit.")) return;
          void run(async () => {
            await api(`/api/v1/admin/showcase/${id}`, { method: "PATCH", json: { action: "reject" } });
            return approved ? "Removed" : "Rejected";
          });
        }}
      >
        {approved ? "Unpublish" : "Reject"}
      </Button>
      <FlashLine flash={flash} />
    </div>
  );
}
