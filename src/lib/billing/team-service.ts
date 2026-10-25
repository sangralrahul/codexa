/**
 * Workspace team operations (members, roles, invitations) with audit trail.
 */
import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { workspaceInvites, workspaceMembers, workspaces, users, type User, type Workspace, type WorkspaceRole } from "@/db/schema";
import { ApiError, badRequest, conflict, notFound } from "@/lib/api";
import { audit } from "@/lib/audit";
import { emails } from "@/lib/email";
import { env } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { PLANS } from "@/config/plans";
import { getEffectivePlan } from "@/lib/services/usage";
import { createInvite, listMembers, listPendingInvites, acceptInvite as acceptInviteRaw, findInviteByToken } from "@/lib/services/workspaces";
import { hashToken, randomToken } from "@/lib/crypto";
import { canChangeRole, canInviteRole, canRemoveMember, seatsAvailable } from "./teams";

export type Actor = Pick<User, "id" | "email" | "name" | "role">;

export function serializeInvite(i: typeof workspaceInvites.$inferSelect) {
  return { id: i.id, email: i.email, role: i.role, invitedBy: i.invitedBy, expiresAt: i.expiresAt.toISOString(), createdAt: i.createdAt.toISOString(), expired: i.expiresAt < new Date() };
}

export async function getTeam(workspaceId: string) {
  const [members, invites] = await Promise.all([listMembers(workspaceId), listPendingInvites(workspaceId)]);
  return {
    members: members.map((m) => ({ ...m, joinedAt: m.joinedAt.toISOString() })),
    invites: invites.map(serializeInvite),
  };
}
export type TeamMember = Awaited<ReturnType<typeof getTeam>>["members"][number];
export type TeamInvite = ReturnType<typeof serializeInvite>;

async function seatCheck(workspace: Workspace) {
  const plan = await getEffectivePlan(workspace);
  const limit = PLANS[plan].limits.members;
  const [members, pending] = await Promise.all([listMembers(workspace.id), listPendingInvites(workspace.id)]);
  const activePending = pending.filter((p) => p.expiresAt > new Date()).length;
  if (!seatsAvailable(limit, members.length, activePending)) {
    throw new ApiError(402, `Your ${PLANS[plan].name} plan allows ${limit} member${limit === 1 ? "" : "s"} (including pending invitations). Upgrade to add more.`, "quota_exceeded", {
      kind: "members",
      used: members.length + activePending,
      limit,
    });
  }
  return { plan, limit };
}

function inviteUrl(token: string) {
  return `${env.APP_URL}/invite/${encodeURIComponent(token)}`;
}

export async function inviteMember(input: { workspace: Workspace; actor: Actor; actorRole: WorkspaceRole; email: string; role: WorkspaceRole; ip?: string | null }) {
  const { workspace, actor } = input;
  const rule = canInviteRole({ userId: actor.id, role: input.actorRole }, input.role);
  if (!rule.ok) throw new ApiError(rule.status, rule.message, rule.status === 403 ? "forbidden" : "bad_request");
  await enforceRateLimit(`invites:ws:${workspace.id}`, 20, 60 * 60_000);
  const email = input.email.trim().toLowerCase();
  const members = await listMembers(workspace.id);
  if (members.some((m) => m.email.toLowerCase() === email)) throw conflict("That person is already a member of this workspace");
  const pending = await listPendingInvites(workspace.id);
  if (pending.some((p) => p.email === email && p.expiresAt > new Date())) throw conflict("An invitation for that email is already pending");
  await seatCheck(workspace);
  const { invite, token } = await createInvite(workspace.id, email, input.role, actor.id);
  let emailStatus: "sent" | "outbox" | "failed" = "outbox";
  try {
    const r = await emails.workspaceInvite(email, workspace.name, actor.name || actor.email, inviteUrl(token));
    emailStatus = r.provider === "resend" ? "sent" : "outbox";
  } catch {
    emailStatus = "failed";
  }
  await audit({ actorId: actor.id, workspaceId: workspace.id, action: "team.invite_created", targetType: "invite", targetId: invite.id, metadata: { email, role: input.role, emailStatus }, ip: input.ip });
  return { invite: serializeInvite(invite), emailStatus };
}

export async function revokeInvite(workspace: Workspace, actor: Actor, inviteId: string) {
  const rows = await db
    .delete(workspaceInvites)
    .where(and(eq(workspaceInvites.id, inviteId), eq(workspaceInvites.workspaceId, workspace.id), isNull(workspaceInvites.acceptedAt)))
    .returning();
  if (!rows[0]) throw notFound("Invitation");
  await audit({ actorId: actor.id, workspaceId: workspace.id, action: "team.invite_revoked", targetType: "invite", targetId: inviteId, metadata: { email: rows[0].email } });
}

/** Re-issue the token (old link stops working), extend expiry, resend the email. */
export async function resendInvite(workspace: Workspace, actor: Actor, inviteId: string) {
  await enforceRateLimit(`invites:ws:${workspace.id}`, 20, 60 * 60_000);
  const [existing] = await db
    .select()
    .from(workspaceInvites)
    .where(and(eq(workspaceInvites.id, inviteId), eq(workspaceInvites.workspaceId, workspace.id), isNull(workspaceInvites.acceptedAt)))
    .limit(1);
  if (!existing) throw notFound("Invitation");
  const token = randomToken(24);
  const [invite] = await db
    .update(workspaceInvites)
    .set({ tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 86400_000) })
    .where(eq(workspaceInvites.id, inviteId))
    .returning();
  let emailStatus: "sent" | "outbox" | "failed" = "outbox";
  try {
    const r = await emails.workspaceInvite(invite.email, workspace.name, actor.name || actor.email, inviteUrl(token));
    emailStatus = r.provider === "resend" ? "sent" : "outbox";
  } catch {
    emailStatus = "failed";
  }
  await audit({ actorId: actor.id, workspaceId: workspace.id, action: "team.invite_resent", targetType: "invite", targetId: inviteId, metadata: { email: invite.email, emailStatus } });
  return { invite: serializeInvite(invite), emailStatus };
}

export async function changeMemberRole(input: { workspace: Workspace; actor: Actor; actorRole: WorkspaceRole; targetUserId: string; role: WorkspaceRole }) {
  const { workspace, actor } = input;
  const members = await listMembers(workspace.id);
  const target = members.find((m) => m.userId === input.targetUserId);
  if (!target) throw notFound("Member");
  const rule = canChangeRole({ userId: actor.id, role: input.actorRole }, { userId: target.userId, role: target.role }, input.role, members);
  if (!rule.ok) throw new ApiError(rule.status, rule.message, rule.status === 403 ? "forbidden" : "bad_request");
  if (target.role === input.role) return { userId: target.userId, role: target.role };
  await db.transaction(async (tx) => {
    await tx.update(workspaceMembers).set({ role: input.role }).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, target.userId)));
    // Ownership transfer: the workspace's ownerId follows the (new) owner.
    if (input.role === "owner") await tx.update(workspaces).set({ ownerId: target.userId, updatedAt: new Date() }).where(eq(workspaces.id, workspace.id));
    else if (workspace.ownerId === target.userId) {
      const other = members.find((m) => m.role === "owner" && m.userId !== target.userId);
      if (other) await tx.update(workspaces).set({ ownerId: other.userId, updatedAt: new Date() }).where(eq(workspaces.id, workspace.id));
    }
  });
  await audit({ actorId: actor.id, workspaceId: workspace.id, action: input.role === "owner" ? "team.ownership_transferred" : "team.role_changed", targetType: "user", targetId: target.userId, metadata: { from: target.role, to: input.role } });
  return { userId: target.userId, role: input.role };
}

export async function removeMember(input: { workspace: Workspace; actor: Actor; actorRole: WorkspaceRole; targetUserId: string }) {
  const { workspace, actor } = input;
  const members = await listMembers(workspace.id);
  const target = members.find((m) => m.userId === input.targetUserId);
  if (!target) throw notFound("Member");
  const rule = canRemoveMember({ userId: actor.id, role: input.actorRole }, { userId: target.userId, role: target.role }, members);
  if (!rule.ok) throw new ApiError(rule.status, rule.message, rule.status === 403 ? "forbidden" : "bad_request");
  await db.delete(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, target.userId)));
  await audit({ actorId: actor.id, workspaceId: workspace.id, action: actor.id === target.userId ? "team.member_left" : "team.member_removed", targetType: "user", targetId: target.userId, metadata: { role: target.role } });
  return { userId: target.userId, left: actor.id === target.userId };
}

/** Public preview of an invitation (no auth): workspace name, role, invitee email domain hint. */
export async function previewInvite(token: string) {
  const found = await findInviteByToken(token);
  if (!found) return null;
  const { invite, workspace } = found;
  const inviter = invite.invitedBy ? (await db.select({ name: users.name }).from(users).where(eq(users.id, invite.invitedBy)).limit(1))[0] : null;
  return {
    workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
    role: invite.role,
    email: invite.email,
    inviterName: inviter?.name ?? null,
    expiresAt: invite.expiresAt.toISOString(),
    expired: invite.expiresAt < new Date(),
    accepted: Boolean(invite.acceptedAt),
  };
}

export async function acceptInvite(token: string, user: Actor, ip?: string | null) {
  const found = await findInviteByToken(token);
  if (found && !found.invite.acceptedAt && found.invite.expiresAt > new Date() && found.invite.email === user.email.toLowerCase()) {
    await seatCheck(found.workspace).catch((err) => {
      // The seat was reserved by the pending invite; only block if the limit is now genuinely exceeded by members alone.
      if (!(err instanceof ApiError && err.code === "quota_exceeded")) throw err;
    });
  }
  const result = await acceptInviteRaw(token, user.id, user.email);
  if (!result.ok) throw badRequest(result.reason);
  await audit({ actorId: user.id, workspaceId: result.workspace.id, action: "team.invite_accepted", targetType: "workspace", targetId: result.workspace.id, ip });
  return result.workspace;
}
