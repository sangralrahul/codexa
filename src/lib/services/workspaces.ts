import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers, workspaces, users, workspaceInvites, type WorkspaceRole } from "@/db/schema";
import { hashToken, randomToken } from "@/lib/crypto";
import { slugify } from "@/lib/utils";

export async function listUserWorkspaces(userId: string) {
  return db
    .select({ workspace: workspaces, role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt)))
    .orderBy(workspaces.createdAt);
}

export async function getDefaultWorkspace(userId: string) {
  const all = await listUserWorkspaces(userId);
  return all.find((w) => w.role === "owner") ?? all[0] ?? null;
}

export async function createWorkspace(ownerId: string, name: string) {
  let slug = slugify(name);
  const existing = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
  if (existing.length) slug = `${slug}-${randomToken(3).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5)}`;
  return db.transaction(async (tx) => {
    const [ws] = await tx.insert(workspaces).values({ slug, name, ownerId }).returning();
    await tx.insert(workspaceMembers).values({ workspaceId: ws.id, userId: ownerId, role: "owner" });
    return ws;
  });
}

export async function listMembers(workspaceId: string) {
  return db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(workspaceMembers.createdAt);
}

export async function createInvite(workspaceId: string, email: string, role: WorkspaceRole, invitedBy: string) {
  const token = randomToken(24);
  const [invite] = await db
    .insert(workspaceInvites)
    .values({
      workspaceId,
      email: email.toLowerCase(),
      role,
      tokenHash: hashToken(token),
      invitedBy,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    })
    .returning();
  return { invite, token };
}

export async function findInviteByToken(token: string) {
  const rows = await db
    .select({ invite: workspaceInvites, workspace: workspaces })
    .from(workspaceInvites)
    .innerJoin(workspaces, eq(workspaces.id, workspaceInvites.workspaceId))
    .where(eq(workspaceInvites.tokenHash, hashToken(token)))
    .limit(1);
  return rows[0] ?? null;
}

export async function acceptInvite(token: string, userId: string, userEmail: string) {
  const found = await findInviteByToken(token);
  if (!found) return { ok: false as const, reason: "Invitation not found" };
  const { invite, workspace } = found;
  if (invite.acceptedAt) return { ok: false as const, reason: "Invitation already used" };
  if (invite.expiresAt < new Date()) return { ok: false as const, reason: "Invitation expired" };
  if (invite.email !== userEmail.toLowerCase()) return { ok: false as const, reason: "This invitation was sent to a different email address" };
  await db.transaction(async (tx) => {
    await tx
      .insert(workspaceMembers)
      .values({ workspaceId: invite.workspaceId, userId, role: invite.role })
      .onConflictDoUpdate({ target: [workspaceMembers.workspaceId, workspaceMembers.userId], set: { role: invite.role } });
    await tx.update(workspaceInvites).set({ acceptedAt: new Date() }).where(eq(workspaceInvites.id, invite.id));
  });
  return { ok: true as const, workspace };
}

export async function listPendingInvites(workspaceId: string) {
  return db
    .select()
    .from(workspaceInvites)
    .where(and(eq(workspaceInvites.workspaceId, workspaceId), isNull(workspaceInvites.acceptedAt)))
    .orderBy(desc(workspaceInvites.createdAt));
}
