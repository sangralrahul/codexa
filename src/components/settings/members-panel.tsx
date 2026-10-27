"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronRight, Lock, Mail, MoreHorizontal, Plus, RefreshCw, Trash2, UserPlus, X } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { cn, isValidEmail } from "@/lib/utils";
import { shakeElement } from "@/lib/client/motion";
import { PLANS } from "@/config/plans";
import type { Plan } from "@/db/schema";
import type { TeamInvite, TeamMember } from "@/lib/billing/team-service";
import { Button, buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { Avatar } from "@/components/ui/avatar";
import { SelectMenu } from "@/components/ui/select-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { SettingsCard, tableHead, tableRow } from "./section";
import { nextSeatsPlan, relativeTime, absoluteTime } from "./usage-model";

type Role = "owner" | "admin" | "editor" | "viewer";
const ROLES: Role[] = ["owner", "admin", "editor", "viewer"];
const ROLE_LABEL: Record<Role, string> = { owner: "Owner", admin: "Admin", editor: "Editor", viewer: "Viewer" };
const ROLE_HELP: Record<Role, string> = {
  owner: "Full control including billing, ownership transfer and deleting the workspace.",
  admin: "Manage members, settings and integrations. Cannot change owners.",
  editor: "Create and edit projects, run the AI agent and deploy.",
  viewer: "Read-only access to projects and activity.",
};

/** What each role can do, mirroring the server's checks (assertWorkspaceRole / teams rules). */
const MATRIX: { label: string; roles: Partial<Record<Role, true | "partial">>; note?: string }[] = [
  { label: "View projects, files and activity", roles: { owner: true, admin: true, editor: true, viewer: true } },
  { label: "Edit files, run the AI agent, preview and deploy", roles: { owner: true, admin: true, editor: true } },
  { label: "Test integration connections", roles: { owner: true, admin: true, editor: true } },
  { label: "Roll back deployments and delete projects", roles: { owner: true, admin: true } },
  { label: "Invite and remove members, change roles", roles: { owner: true, admin: "partial" }, note: "Admins cannot change or remove owners." },
  { label: "Workspace settings and integrations", roles: { owner: true, admin: true } },
  { label: "Change the plan and payment method", roles: { owner: true, admin: true } },
  { label: "Cancel or resume the subscription", roles: { owner: true } },
  { label: "Grant or transfer ownership", roles: { owner: true } },
];

type Props = {
  workspaceId: string;
  currentUserId: string;
  role: Role;
  members: TeamMember[];
  invites: TeamInvite[];
  seats: { used: number; limit: number };
  emailConfigured: boolean;
  /** Effective plan (for the locked seats of the next plan). */
  plan?: Plan;
  /** Pending, unexpired invitations; used for the seat count when `invites` is withheld (non-managers). */
  pendingCount?: number;
};

function fail(err: unknown, fallback: string) {
  toast.error(err instanceof ClientApiError ? err.message : fallback);
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function MembersPanel({ workspaceId, currentUserId, role, members: initialMembers, invites: initialInvites, seats, emailConfigured, plan, pendingCount }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "remove" | "transfer"; member: TeamMember } | null>(null);
  const canManage = role === "owner" || role === "admin";
  const activeInvites = invites.filter((i) => !i.expired && !leaving.has(i.id));
  const hiddenPending = canManage ? 0 : (pendingCount ?? 0);
  const seatsUsed = members.length + activeInvites.length + hiddenPending;
  const seatsLeft = seats.limit < 0 ? Infinity : Math.max(0, seats.limit - seatsUsed);
  const owners = members.filter((m) => m.role === "owner").length;

  /** Collapse a row (240ms), then drop it from state. */
  function collapse(id: string, after: () => void) {
    setLeaving((s) => new Set(s).add(id));
    window.setTimeout(() => {
      after();
      setLeaving((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }, 260);
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
      toast.success(`${m.name || m.email} is now ${ROLE_LABEL[next].toLowerCase()}`);
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
      toast.success(`${m.name || m.email} is now an owner`, "You keep your owner role until you change it.");
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
      setConfirm(null);
      if (r.left) {
        document.cookie = "codexa_workspace=; path=/; max-age=0; samesite=lax";
        router.push("/dashboard");
        router.refresh();
        return;
      }
      collapse(m.userId, () => setMembers((s) => s.filter((x) => x.userId !== m.userId)));
      toast.success(`${m.name || m.email} was removed`);
      router.refresh();
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
      collapse(i.id, () => setInvites((s) => s.filter((x) => x.id !== i.id)));
      toast.success(`Invitation for ${i.email} revoked`);
      router.refresh();
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
      emailToast(i.email, r.emailStatus);
    } catch (err) {
      fail(err, "Could not resend the invitation.");
    } finally {
      setBusy(null);
    }
  }

  const focusInvite = () => {
    const el = document.getElementById("invite-email");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  };

  return (
    <div className="space-y-6">
      <SettingsCard
        id="members"
        title={
          <>
            Members <span className="font-normal text-muted-foreground">{members.length}</span>
          </>
        }
        description="Everyone with access to this workspace. Pending invitations hold a seat until they are accepted or revoked."
        bodyClassName="p-0 pt-4"
      >
        <SeatStrip members={members} invites={activeInvites} hiddenPending={hiddenPending} limit={seats.limit} plan={plan} canManage={canManage} onAdd={focusInvite} />
        <div className="mt-5 hidden grid-cols-[minmax(0,1fr)_10rem_2.5rem] items-center border-t border-border/80 sm:grid">
          <span className={cn(tableHead, "pl-5 sm:pl-6")}>Member</span>
          <span className={tableHead}>Role</span>
          <span className="sr-only">Actions</span>
        </div>
        <ul className="max-sm:mt-4">
          {members.map((m) => {
            const self = m.userId === currentUserId;
            const canEditThis = canManage && !(role === "admin" && m.role === "owner");
            const soleOwner = m.role === "owner" && owners <= 1;
            const display = m.name || m.email;
            return (
              <li key={m.userId} className="diff-row" data-collapsed={leaving.has(m.userId) ? "" : undefined}>
                <div className={cn(tableRow, "flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_10rem_2.5rem] sm:px-6")}>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={display} src={m.avatarUrl} size="md" />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        <span className="truncate">{display}</span>
                        {self ? <span className="rounded-full border border-border px-1.5 text-[10.5px] font-medium leading-4 text-muted-foreground">You</span> : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.email} · joined{" "}
                        <time dateTime={m.joinedAt} title={absoluteTime(m.joinedAt)} suppressHydrationWarning>
                          {shortDate(m.joinedAt)}
                        </time>
                      </p>
                    </div>
                  </div>
                  <div>
                    {canEditThis && !(self && soleOwner) ? (
                      <>
                        <label htmlFor={`role-${m.userId}`} className="sr-only">
                          Role for {m.email}
                        </label>
                        <SelectMenu
                          id={`role-${m.userId}`}
                          size="sm"
                          className="w-36"
                          contentClassName="w-72"
                          value={m.role}
                          disabled={busy === m.userId}
                          onValueChange={(v) => void changeRole(m, v as Role)}
                          options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r], description: ROLE_HELP[r], disabled: (r === "owner" && role !== "owner") || (m.role === "owner" && soleOwner && r !== "owner") }))}
                        />
                      </>
                    ) : (
                      <Tooltip content={self && soleOwner ? "You're the only owner. Make someone else an owner before changing your role." : ROLE_HELP[m.role]}>
                        <span tabIndex={0} className={cn("role-swap inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium outline-none focus-visible:outline-2 focus-visible:outline-ring", m.role === "owner" ? "bg-foreground text-background" : "bg-muted text-foreground shadow-[inset_0_0_0_1px_var(--border)]")}>
                          {m.role === "owner" ? <Lock className="size-3" aria-hidden="true" /> : null}
                          {ROLE_LABEL[m.role]}
                          <span className="sr-only">{self && soleOwner ? ", you're the only owner" : ""}</span>
                        </span>
                      </Tooltip>
                    )}
                  </div>
                  <div className="flex justify-end">
                    {canEditThis || self ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" aria-label={`More actions for ${m.email}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuLabel className="font-normal text-muted-foreground">{ROLE_HELP[m.role]}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {role === "owner" && !self && m.role !== "owner" ? <DropdownMenuItem onSelect={() => setConfirm({ kind: "transfer", member: m })}>Make owner</DropdownMenuItem> : null}
                          <DropdownMenuItem className="text-danger" onSelect={() => setConfirm({ kind: "remove", member: m })}>
                            <Trash2 className="size-4" aria-hidden="true" /> {self ? "Leave workspace" : "Remove from workspace"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </SettingsCard>

      {canManage ? (
        seatsLeft === 0 ? (
          <SeatsFullCard plan={plan} limit={seats.limit} pending={activeInvites.length} />
        ) : (
          <InviteForm
            workspaceId={workspaceId}
            actorRole={role}
            seatsLeft={seatsLeft}
            emailConfigured={emailConfigured}
            onInvited={(invite, status) => {
              setInvites((s) => [invite, ...s.filter((x) => x.id !== invite.id)]);
              setFresh((s) => new Set(s).add(invite.id));
              emailToast(invite.email, status);
            }}
          />
        )
      ) : null}

      {canManage ? (
        <SettingsCard
          id="pending"
          icon={<Mail />}
          title={
            <>
              Pending invitations <span className="font-normal text-muted-foreground">{invites.length}</span>
            </>
          }
          description="Invitations stay here until they are accepted, revoked or expire after 7 days."
          bodyClassName={invites.length === 0 ? "pt-2" : "p-0 pt-3"}
        >
          {invites.length === 0 ? (
            <p className="flex items-center gap-2.5 rounded-[12px] border border-dashed border-border-strong px-4 py-3.5 text-[13px] text-muted-foreground">
              <Mail className="size-4 shrink-0 text-foreground-dim" aria-hidden="true" />
              No pending invitations. People you invite appear here until they accept.
            </p>
          ) : (
            <ul>
              {invites.map((i) => (
                <li key={i.id} className={cn("diff-row", fresh.has(i.id) && "materialize")} data-collapsed={leaving.has(i.id) ? "" : undefined}>
                  <div className={cn(tableRow, "flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm sm:px-6", fresh.has(i.id) && "row-sweep")}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong font-mono text-[11px] uppercase text-muted-foreground">
                        {i.email.slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-medium">
                          <span className="truncate">{i.email}</span>
                          <span className="rounded-full bg-muted px-1.5 text-[10.5px] font-medium leading-4 text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">{ROLE_LABEL[i.role as Role]}</span>
                          {i.expired ? <span className="rounded-full bg-warning/12 px-1.5 text-[10.5px] font-medium leading-4 text-warning">Expired</span> : null}
                        </p>
                        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                          Sent <time dateTime={i.createdAt} title={absoluteTime(i.createdAt)}>{relativeTime(i.createdAt)}</time> · {i.expired ? "expired" : "expires"}{" "}
                          <time dateTime={i.expiresAt} className="font-mono">
                            {shortDate(i.expiresAt)}
                          </time>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => resend(i)} loading={busy === i.id}>
                        <RefreshCw className="size-3.5" aria-hidden="true" /> Resend
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => revoke(i)} disabled={busy === i.id} aria-label={`Revoke invitation for ${i.email}`}>
                        Revoke
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SettingsCard>
      ) : null}

      <RolesMatrix />

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
            <div className="flex items-center gap-3 rounded-[12px] border border-border bg-surface/60 p-3">
              <Avatar name={confirm.member.name || confirm.member.email} src={confirm.member.avatarUrl} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{confirm.member.name || confirm.member.email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {confirm.member.email} · {ROLE_LABEL[confirm.member.role]}
                  {confirm.kind === "transfer" ? " → Owner" : ""}
                </p>
              </div>
            </div>
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

/**
 * Seats as physical slots: members (avatars), pending invitations (dashed, slowly pulsing),
 * free seats ("+", focuses the invite field) and, on capped plans, locked ghost seats showing
 * what the next plan adds (from PLANS). Capacity is neutral: a full strip is never red.
 */
function SeatStrip({ members, invites, hiddenPending = 0, limit, plan, canManage, onAdd }: { members: TeamMember[]; invites: TeamInvite[]; hiddenPending?: number; limit: number; plan?: Plan; canManage: boolean; onAdd: () => void }) {
  const capped = limit >= 0;
  const pendingTotal = invites.length + hiddenPending;
  const used = members.length + pendingTotal;
  const free = capped ? Math.max(0, limit - used) : 1;
  const shownFree = free <= 10 ? free : 8;
  const next = plan ? nextSeatsPlan(plan) : null;
  const locked = capped && next ? Math.min(3, next.seats < 0 ? 3 : Math.max(0, next.seats - limit)) : 0;
  let i = 0;
  const slot = "seat flex size-10 shrink-0 items-center justify-center rounded-full";
  return (
    <div className="px-5 sm:px-6">
      <div className="flex flex-wrap items-center gap-2" role="list" aria-label="Seats">
        {members.map((m) => (
          <Tooltip key={m.userId} content={`${m.name || m.email} · ${ROLE_LABEL[m.role]}`}>
            <span role="listitem" tabIndex={0} className={cn(slot, "seat-in rounded-full p-[2px] outline-none ring-1 ring-border-strong focus-visible:outline-2 focus-visible:outline-ring")} style={{ "--i": i++ } as React.CSSProperties}>
              <Avatar name={m.name || m.email} src={m.avatarUrl} size="lg" className="[&>span]:size-9" labelled />
            </span>
          </Tooltip>
        ))}
        {invites.map((inv) => (
          <Tooltip key={inv.id} content={`Invitation pending · ${inv.email}`}>
            <span role="listitem" tabIndex={0} aria-label={`Pending invitation for ${inv.email}`} className={cn(slot, "seat--pending border border-dashed border-border-strong font-mono text-xs uppercase text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring")} style={{ "--i": i++ } as React.CSSProperties}>
              {inv.email.slice(0, 1)}
            </span>
          </Tooltip>
        ))}
        {Array.from({ length: hiddenPending }).map((_, k) => (
          <span key={`h${k}`} role="listitem" aria-label="Pending invitation" className={cn(slot, "seat--pending border border-dashed border-border-strong text-muted-foreground")} style={{ "--i": i++ } as React.CSSProperties}>
            <Mail className="size-3.5" aria-hidden="true" />
          </span>
        ))}
        {Array.from({ length: shownFree }).map((_, k) =>
          canManage ? (
            <span key={`f${k}`} role="listitem" className="flex">
              <button type="button" onClick={onAdd} aria-label="Free seat: invite a teammate" className={cn(slot, "seat-in border border-dashed border-border-strong text-foreground-dim outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring")} style={{ "--i": i++ } as React.CSSProperties}>
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </span>
          ) : (
            <span key={`f${k}`} role="listitem" aria-label="Free seat" className={cn(slot, "seat-in border border-dashed border-border text-foreground-dim")} style={{ "--i": i++ } as React.CSSProperties}>
              <Plus className="size-4" aria-hidden="true" />
            </span>
          ),
        )}
        {free > shownFree ? <span className="font-mono text-xs text-muted-foreground">+{free - shownFree} free</span> : null}
        {locked > 0 && next ? (
          <>
            <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
            {Array.from({ length: locked }).map((_, k) => (
              <span key={`l${k}`} aria-hidden="true" className={cn(slot, "seat-in border border-border bg-[repeating-linear-gradient(135deg,transparent_0_4px,color-mix(in_oklab,var(--foreground)_5%,transparent)_4px_8px)] text-foreground-dim/70")} style={{ "--i": i++ } as React.CSSProperties}>
                <Lock className="size-3.5" />
              </span>
            ))}
            <Link href="/settings/billing#plans" className="link-draw ml-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              {next.name} has {next.seats < 0 ? "unlimited" : next.seats} seats <ChevronRight className="size-3" aria-hidden="true" />
            </Link>
          </>
        ) : null}
      </div>
      <p className="mt-2.5 text-xs text-muted-foreground">
        {capped ? (
          <>
            <span className="font-medium tabular-nums text-foreground">
              {used} of {limit}
            </span>{" "}
            seat{limit === 1 ? "" : "s"} used{pendingTotal ? `, including ${pendingTotal} pending` : ""}.
          </>
        ) : (
          <>
            <span className="font-medium tabular-nums text-foreground">{used}</span> seat{used === 1 ? "" : "s"} used · unlimited on this plan.
          </>
        )}
      </p>
    </div>
  );
}

/** Replaces the invite form when every seat is taken: what to do next, not a wall of disabled fields. */
function SeatsFullCard({ plan, limit, pending }: { plan?: Plan; limit: number; pending: number }) {
  const next = plan ? nextSeatsPlan(plan) : null;
  return (
    <SettingsCard
      id="invite"
      icon={<UserPlus />}
      title="No seats left on your plan"
      description={`Every seat${plan ? ` on the ${PLANS[plan].name} plan` : ""} is taken (${limit} of ${limit}, pending invitations included).`}
    >
      <div className="flex flex-col gap-4 rounded-[14px] border border-border bg-surface/50 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium">{next ? `${next.name} has ${next.seats < 0 ? "unlimited" : next.seats} seats` : "Need more seats?"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {next ? `Upgrade to ${next.name} to invite teammates${pending ? ", or revoke a pending invitation to free a seat" : ""}.` : "Contact sales about Enterprise for custom seat counts."}
          </p>
        </div>
        <Link href={next ? "/settings/billing#plans" : "/contact-sales"} className={cn(buttonClasses("primary", "sm"), "shrink-0")}>
          {next ? `See ${next.name}` : "Contact sales"} <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </SettingsCard>
  );
}

function RolesMatrix() {
  return (
    <details id="roles" className="settings-card group overflow-hidden rounded-[16px] [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-6">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold tracking-[-0.01em]">Roles &amp; permissions</span>
          <span className="block text-[13px] text-muted-foreground">What owners, admins, editors and viewers can do. The server enforces these.</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-90" aria-hidden="true" />
      </summary>
      <div className="overflow-x-auto border-t border-border/80">
        <table className="w-full min-w-[560px] text-[13px]">
          <caption className="sr-only">Permissions by role</caption>
          <thead>
            <tr>
              <th scope="col" className={cn(tableHead, "pl-5 sm:pl-6")}>
                Capability
              </th>
              {ROLES.map((r) => (
                <th key={r} scope="col" className={cn(tableHead, "w-20 text-center")}>
                  {ROLE_LABEL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((row) => (
              <tr key={row.label} className={tableRow}>
                <th scope="row" className="py-2.5 pl-5 pr-3 text-left font-normal sm:pl-6">
                  {row.label}
                  {row.note ? <span className="block text-xs text-muted-foreground">{row.note}</span> : null}
                </th>
                {ROLES.map((r) => {
                  const v = row.roles[r];
                  return (
                    <td key={r} className="py-2.5 text-center">
                      {v === true ? (
                        <Check className="mx-auto size-4 text-foreground" aria-label="Yes" />
                      ) : v === "partial" ? (
                        <span className="font-mono text-xs text-muted-foreground" aria-label="Partly">
                          ◐
                        </span>
                      ) : (
                        <span className="text-foreground-dim" aria-label="No">
                          –
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function emailStatusText(email: string, status: "sent" | "outbox" | "failed") {
  if (status === "sent") return `Invitation emailed to ${email}.`;
  if (status === "outbox") return `Invitation created for ${email}. Email delivery is not configured on this deployment, so the message is in the outbox (CUSTOMERIO_APP_API_KEY or RESEND_API_KEY). Ask them to sign in with that address, or share the link from the email outbox.`;
  return `Invitation created for ${email}, but the email could not be sent. Use Resend to try again.`;
}

function emailToast(email: string, status: "sent" | "outbox" | "failed") {
  const text = emailStatusText(email, status);
  if (status === "sent") toast.success(`Invited ${email}`, text);
  else if (status === "outbox") toast.info(`Invitation created for ${email}`, text.replace(`Invitation created for ${email}. `, ""));
  else toast.error(`Email to ${email} failed`, text.replace(`Invitation created for ${email}, but the`, "The"));
}

type Chip = { id: number; email: string; valid: boolean; error?: string };

/** Invite several people at once: emails become chips (invalid ones shake), one role for all. */
function InviteForm({
  workspaceId,
  actorRole,
  seatsLeft,
  emailConfigured,
  onInvited,
}: {
  workspaceId: string;
  actorRole: Role;
  seatsLeft: number;
  emailConfigured: boolean;
  onInvited: (invite: TeamInvite, status: "sent" | "outbox" | "failed") => void;
}) {
  const [chips, setChips] = useState<Chip[]>([]);
  const [text, setText] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const add = (raw: string) => {
    const parts = raw
      .split(/[\s,;]+/)
      .map((s) => s.trim().replace(/^<|>$/g, ""))
      .filter(Boolean);
    if (!parts.length) return;
    setError(null);
    const have = new Set(chips.map((c) => c.email.toLowerCase()));
    const created: Chip[] = [];
    for (const p of parts) {
      if (have.has(p.toLowerCase())) continue;
      have.add(p.toLowerCase());
      created.push({ id: ++seq.current, email: p, valid: isValidEmail(p) });
    }
    if (!created.length) return;
    setChips((cur) => [...cur, ...created]);
    // Invalid chips shake once they are on screen.
    requestAnimationFrame(() => {
      for (const c of created) if (!c.valid) shakeElement(boxRef.current?.querySelector(`[data-chip="${c.id}"]`), 4);
    });
  };

  const valid = chips.filter((c) => c.valid);
  const invalid = chips.filter((c) => !c.valid);
  const over = Number.isFinite(seatsLeft) && valid.length > seatsLeft;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pendingText = text.trim();
    let list = valid;
    if (pendingText) {
      const extra = pendingText.split(/[\s,;]+/).filter(Boolean);
      const bad = extra.filter((x) => !isValidEmail(x));
      add(pendingText);
      setText("");
      if (bad.length) return;
      list = [...valid, ...extra.filter((x) => !valid.some((v) => v.email.toLowerCase() === x.toLowerCase())).map((x) => ({ id: -1, email: x, valid: true }))];
    }
    if (!list.length) {
      setError(invalid.length ? "Fix or remove the invalid addresses first." : "Enter at least one email address.");
      shakeElement(boxRef.current, 4);
      return;
    }
    if (invalid.length) {
      setError("Fix or remove the invalid addresses first.");
      invalid.forEach((c) => shakeElement(boxRef.current?.querySelector(`[data-chip="${c.id}"]`), 4));
      return;
    }
    if (Number.isFinite(seatsLeft) && list.length > seatsLeft) {
      setError(`Only ${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left on your plan.`);
      shakeElement(boxRef.current, 4);
      return;
    }
    setBusy(true);
    setError(null);
    for (const c of list) {
      try {
        const r = await api<{ invite: TeamInvite; emailStatus: "sent" | "outbox" | "failed" }>(`/api/v1/workspaces/${workspaceId}/invites`, { method: "POST", json: { email: c.email, role } });
        onInvited(r.invite, r.emailStatus);
        setChips((s) => s.filter((x) => x.email.toLowerCase() !== c.email.toLowerCase()));
      } catch (err) {
        const msg = err instanceof ClientApiError ? (err.fieldErrors().email ?? err.message) : "Could not send the invitation.";
        setChips((s) => s.map((x) => (x.email.toLowerCase() === c.email.toLowerCase() ? { ...x, valid: false, error: msg } : x)));
        toast.error(`Could not invite ${c.email}`, msg);
        setError(msg);
      }
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <SettingsCard
        id="invite"
        icon={<UserPlus />}
        title="Invite teammates"
        description="They get an email with a link to join this workspace. Paste a list to add several at once."
        bodyClassName="space-y-4"
        hint={`${ROLE_HELP[role]} Invitations expire after 7 days.${!emailConfigured ? " Email delivery is not configured here; invitations are stored in the outbox." : ""}`}
        footer={
          <Button type="submit" size="sm" loading={busy} disabled={over}>
            <UserPlus className="size-3.5" aria-hidden="true" /> {valid.length > 1 ? `Send ${valid.length} invites` : "Send invite"}
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <div className="space-y-1.5">
            <label htmlFor="invite-email" className="text-[13px] font-medium leading-none">
              Email addresses
            </label>
            <div
              ref={boxRef}
              onClick={() => document.getElementById("invite-email")?.focus()}
              className={cn(
                "chip-field flex min-h-10 cursor-text flex-wrap items-center gap-1.5 rounded-md border border-border bg-input px-2 py-1.5 shadow-[inset_0_1px_0_var(--hairline)] transition-[border-color,box-shadow] hover:border-border-strong",
                error && "border-danger",
              )}
            >
              {chips.map((c) => (
                <span
                  key={c.id}
                  data-chip={c.id}
                  title={c.error ?? (c.valid ? undefined : "Not a valid email address")}
                  className={cn("chip-in inline-flex h-6 max-w-full items-center gap-1 rounded-full pl-2 pr-0.5 text-xs", c.valid ? "bg-muted text-foreground shadow-[inset_0_0_0_1px_var(--border)]" : "bg-danger/12 text-danger shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--danger)_35%,transparent)]")}
                >
                  <span className="truncate">{c.email}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setChips((s) => s.filter((x) => x.id !== c.id));
                      document.getElementById("invite-email")?.focus();
                    }}
                    aria-label={`Remove ${c.email}`}
                    className="flex size-5 items-center justify-center rounded-full hover:bg-foreground/10"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
              <input
                id="invite-email"
                type="email"
                multiple
                autoComplete="off"
                value={text}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/[,;\s]$/.test(v)) {
                    add(v);
                    setText("");
                  } else setText(v);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && text.trim()) {
                    e.preventDefault();
                    add(text);
                    setText("");
                  } else if (e.key === "Backspace" && !text && chips.length) {
                    setChips((s) => s.slice(0, -1));
                  }
                }}
                onPaste={(e) => {
                  const t = e.clipboardData.getData("text");
                  if (/[,;\s]/.test(t.trim())) {
                    e.preventDefault();
                    add(`${text}${t}`);
                    setText("");
                  }
                }}
                onBlur={() => {
                  if (text.trim()) {
                    add(text);
                    setText("");
                  }
                }}
                placeholder={chips.length ? "" : "teammate@example.com, another@example.com"}
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={error ? "invite-email-error" : "invite-email-hint"}
                className="h-7 min-w-[10rem] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/80"
              />
            </div>
            {error ? (
              <p id="invite-email-error" role="alert" className="pop-in text-xs text-danger">
                {error}
              </p>
            ) : (
              <p id="invite-email-hint" className="text-xs text-muted-foreground">
                {Number.isFinite(seatsLeft) ? `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left. ` : ""}Press Enter or comma after each address.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="invite-role" className="text-[13px] font-medium leading-none">
              Role
            </label>
            <SelectMenu
              id="invite-role"
              value={role}
              onValueChange={(v) => setRole(v as Role)}
              contentClassName="w-72"
              options={(["admin", "editor", "viewer", "owner"] as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r], description: ROLE_HELP[r], disabled: r === "owner" && actorRole !== "owner" }))}
            />
          </div>
        </div>
        {over ? <Alert variant="warning">You have {valid.length} addresses but only {seatsLeft} seat{seatsLeft === 1 ? "" : "s"} left. Remove some, or upgrade on the Billing page.</Alert> : null}
      </SettingsCard>
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
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
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
