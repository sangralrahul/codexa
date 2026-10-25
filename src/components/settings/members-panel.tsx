"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MoreHorizontal, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import type { TeamInvite, TeamMember } from "@/lib/billing/team-service";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Alert, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";

type Role = "owner" | "admin" | "editor" | "viewer";
const ROLE_LABEL: Record<Role, string> = { owner: "Owner", admin: "Admin", editor: "Editor", viewer: "Viewer" };
const ROLE_HELP: Record<Role, string> = {
  owner: "Full control including billing, ownership transfer and deleting the workspace.",
  admin: "Manage members, settings and integrations. Cannot change owners.",
  editor: "Create and edit projects, run the AI agent and deploy.",
  viewer: "Read-only access to projects and activity.",
};

type Props = {
  workspaceId: string;
  currentUserId: string;
  role: Role;
  members: TeamMember[];
  invites: TeamInvite[];
  seats: { used: number; limit: number };
  emailConfigured: boolean;
};

type Flash = { kind: "ok" | "error"; message: string } | null;

export function MembersPanel({ workspaceId, currentUserId, role, members: initialMembers, invites: initialInvites, seats, emailConfigured }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [flash, setFlash] = useState<Flash>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "remove" | "transfer"; member: TeamMember } | null>(null);
  const canManage = role === "owner" || role === "admin";
  const seatsUsed = members.length + invites.filter((i) => !i.expired).length;
  const seatsLeft = seats.limit < 0 ? Infinity : Math.max(0, seats.limit - seatsUsed);

  function fail(err: unknown, fallback: string) {
    setFlash({ kind: "error", message: err instanceof ClientApiError ? err.message : fallback });
  }

  async function changeRole(m: TeamMember, next: Role) {
    if (next === m.role) return;
    if (next === "owner") {
      setConfirm({ kind: "transfer", member: m });
      return;
    }
    setBusy(m.userId);
    try {
      await api(`/api/v1/workspaces/${workspaceId}/members/${m.userId}`, { method: "PATCH", json: { role: next } });
      setMembers((s) => s.map((x) => (x.userId === m.userId ? { ...x, role: next } : x)));
      setFlash({ kind: "ok", message: `${m.name || m.email} is now ${ROLE_LABEL[next].toLowerCase()}.` });
    } catch (err) {
      fail(err, "Could not change the role.");
    } finally {
      setBusy(null);
    }
  }

  async function transferOwnership(m: TeamMember) {
    setBusy(m.userId);
    try {
      await api(`/api/v1/workspaces/${workspaceId}/members/${m.userId}`, { method: "PATCH", json: { role: "owner" } });
      setMembers((s) => s.map((x) => (x.userId === m.userId ? { ...x, role: "owner" as const } : x)));
      setFlash({ kind: "ok", message: `${m.name || m.email} is now an owner. You keep your owner role until you change it.` });
      setConfirm(null);
      router.refresh();
    } catch (err) {
      fail(err, "Could not transfer ownership.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(m: TeamMember) {
    setBusy(m.userId);
    try {
      const r = await api<{ left: boolean }>(`/api/v1/workspaces/${workspaceId}/members/${m.userId}`, { method: "DELETE" });
      setMembers((s) => s.filter((x) => x.userId !== m.userId));
      setConfirm(null);
      if (r.left) {
        document.cookie = "codexa_workspace=; path=/; max-age=0; samesite=lax";
        router.push("/dashboard");
        router.refresh();
        return;
      }
      setFlash({ kind: "ok", message: `${m.name || m.email} was removed.` });
    } catch (err) {
      fail(err, "Could not remove the member.");
    } finally {
      setBusy(null);
    }
  }

  async function revoke(i: TeamInvite) {
    setBusy(i.id);
    try {
      await api(`/api/v1/workspaces/${workspaceId}/invites/${i.id}`, { method: "DELETE" });
      setInvites((s) => s.filter((x) => x.id !== i.id));
      setFlash({ kind: "ok", message: `Invitation for ${i.email} revoked.` });
    } catch (err) {
      fail(err, "Could not revoke the invitation.");
    } finally {
      setBusy(null);
    }
  }

  async function resend(i: TeamInvite) {
    setBusy(i.id);
    try {
      const r = await api<{ invite: TeamInvite; emailStatus: "sent" | "outbox" | "failed" }>(`/api/v1/workspaces/${workspaceId}/invites/${i.id}/resend`, { method: "POST" });
      setInvites((s) => s.map((x) => (x.id === i.id ? r.invite : x)));
      setFlash({ kind: r.emailStatus === "failed" ? "error" : "ok", message: emailStatusText(i.email, r.emailStatus) });
    } catch (err) {
      fail(err, "Could not resend the invitation.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      {flash ? <Alert variant={flash.kind === "ok" ? "success" : "danger"}>{flash.message}</Alert> : null}

      <section aria-labelledby="members-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="members-heading" className="text-base font-semibold">
            Members <span className="text-sm font-normal text-muted-foreground">({members.length})</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            {seats.limit < 0 ? "Unlimited seats" : `${seatsUsed} of ${seats.limit} seat${seats.limit === 1 ? "" : "s"} used (pending invitations count)`}
          </p>
        </div>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {members.map((m) => {
            const self = m.userId === currentUserId;
            const canEditThis = canManage && !(role === "admin" && m.role === "owner");
            return (
              <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatarUrl} alt="" className="size-9 rounded-full border border-border object-cover" />
                  ) : (
                    <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                      {(m.name || m.email).slice(0, 2)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span className="truncate">{m.name || m.email}</span>
                      {self ? <Badge variant="outline">You</Badge> : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.email} · joined {new Date(m.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canEditThis ? (
                    <>
                      <label htmlFor={`role-${m.userId}`} className="sr-only">
                        Role for {m.email}
                      </label>
                      <Select id={`role-${m.userId}`} className="h-9 w-32" value={m.role} disabled={busy === m.userId} onChange={(e) => changeRole(m, e.target.value as Role)}>
                        {(["owner", "admin", "editor", "viewer"] as Role[]).map((r) => (
                          <option key={r} value={r} disabled={r === "owner" && role !== "owner"}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </Select>
                    </>
                  ) : (
                    <Badge variant={m.role === "owner" ? "primary" : "default"}>{ROLE_LABEL[m.role]}</Badge>
                  )}
                  {canEditThis || self ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`More actions for ${m.email}`}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{ROLE_HELP[m.role]}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {role === "owner" && !self && m.role !== "owner" ? <DropdownMenuItem onSelect={() => setConfirm({ kind: "transfer", member: m })}>Make owner</DropdownMenuItem> : null}
                        <DropdownMenuItem className="text-danger" onSelect={() => setConfirm({ kind: "remove", member: m })}>
                          <Trash2 className="size-4" aria-hidden="true" /> {self ? "Leave workspace" : "Remove from workspace"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {canManage ? (
        <section aria-labelledby="invite-heading" className="space-y-3">
          <h2 id="invite-heading" className="text-base font-semibold">
            Invite a teammate
          </h2>
          {seatsLeft === 0 ? (
            <Alert variant="warning" title="No seats left on your plan">
              Upgrade on the <a href="/settings/billing" className="underline">Billing</a> page to invite more people, or revoke a pending invitation.
            </Alert>
          ) : null}
          <InviteForm
            workspaceId={workspaceId}
            actorRole={role}
            disabled={seatsLeft === 0}
            emailConfigured={emailConfigured}
            onInvited={(invite, status) => {
              setInvites((s) => [invite, ...s]);
              setFlash({ kind: status === "failed" ? "error" : "ok", message: emailStatusText(invite.email, status) });
            }}
          />
        </section>
      ) : null}

      {canManage ? (
        <section aria-labelledby="pending-heading" className="space-y-3">
          <h2 id="pending-heading" className="text-base font-semibold">
            Pending invitations <span className="text-sm font-normal text-muted-foreground">({invites.length})</span>
          </h2>
          {invites.length === 0 ? (
            <EmptyState icon={<Mail className="size-6" />} title="No pending invitations" description="People you invite appear here until they accept." className="p-6" />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {invites.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      <span className="truncate">{i.email}</span>
                      <Badge>{ROLE_LABEL[i.role]}</Badge>
                      {i.expired ? <Badge variant="warning">Expired</Badge> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sent {new Date(i.createdAt).toLocaleDateString()} · {i.expired ? "expired" : "expires"} {new Date(i.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => resend(i)} loading={busy === i.id}>
                      <RefreshCw className="size-3.5" aria-hidden="true" /> Resend
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => revoke(i)} disabled={busy === i.id} aria-label={`Revoke invitation for ${i.email}`}>
                      Revoke
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <Dialog open={confirm !== null} onOpenChange={(o) => (!o ? setConfirm(null) : null)}>
        {confirm ? (
          <DialogContent
            title={confirm.kind === "transfer" ? "Transfer ownership?" : confirm.member.userId === currentUserId ? "Leave this workspace?" : "Remove member?"}
            description={
              confirm.kind === "transfer"
                ? `${confirm.member.name || confirm.member.email} will become an owner with full control, including billing.`
                : confirm.member.userId === currentUserId
                  ? "You will lose access to every project in this workspace."
                  : `${confirm.member.name || confirm.member.email} will immediately lose access to this workspace.`
            }
          >
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button variant={confirm.kind === "transfer" ? "primary" : "danger"} loading={busy === confirm.member.userId} onClick={() => (confirm.kind === "transfer" ? transferOwnership(confirm.member) : remove(confirm.member))}>
                {confirm.kind === "transfer" ? "Transfer ownership" : confirm.member.userId === currentUserId ? "Leave workspace" : "Remove"}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function emailStatusText(email: string, status: "sent" | "outbox" | "failed") {
  if (status === "sent") return `Invitation emailed to ${email}.`;
  if (status === "outbox") return `Invitation created for ${email}. Email delivery is not configured on this deployment, so the message is in the outbox (RESEND_API_KEY). Ask them to sign in with that address, or share the link from the email outbox.`;
  return `Invitation created for ${email}, but the email could not be sent. Use Resend to try again.`;
}

function InviteForm({
  workspaceId,
  actorRole,
  disabled,
  emailConfigured,
  onInvited,
}: {
  workspaceId: string;
  actorRole: Role;
  disabled: boolean;
  emailConfigured: boolean;
  onInvited: (invite: TeamInvite, status: "sent" | "outbox" | "failed") => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ invite: TeamInvite; emailStatus: "sent" | "outbox" | "failed" }>(`/api/v1/workspaces/${workspaceId}/invites`, { method: "POST", json: { email, role } });
      onInvited(r.invite, r.emailStatus);
      setEmail("");
    } catch (err) {
      setError(err instanceof ClientApiError ? (err.fieldErrors().email ?? err.message) : "Could not send the invitation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end">
        <Field label="Email address" htmlFor="invite-email" error={error}>
          <Input id="invite-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={disabled} placeholder="teammate@example.com" aria-invalid={Boolean(error)} />
        </Field>
        <Field label="Role" htmlFor="invite-role">
          <Select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={disabled}>
            {(["admin", "editor", "viewer", "owner"] as Role[]).map((r) => (
              <option key={r} value={r} disabled={r === "owner" && actorRole !== "owner"}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" loading={busy} disabled={disabled} className="sm:mb-0">
          <UserPlus className="size-4" aria-hidden="true" /> Send invite
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {ROLE_HELP[role]} Invitations expire after 7 days.{!emailConfigured ? " Email delivery is not configured here; invitations are stored in the outbox." : ""}
      </p>
    </form>
  );
}

export function LeaveWorkspaceButton({ workspaceId, userId, workspaceName }: { workspaceId: string; userId: string; workspaceName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function leave() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/v1/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" });
      document.cookie = "codexa_workspace=; path=/; max-age=0; samesite=lax";
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not leave the workspace.");
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Leave {workspaceName}
      </Button>
      <DialogContent title={`Leave ${workspaceName}?`} description="You will lose access to every project in this workspace. An owner can invite you again later.">
        {error ? <Alert variant="danger">{error}</Alert> : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="danger" loading={busy} onClick={leave}>
            Leave workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
