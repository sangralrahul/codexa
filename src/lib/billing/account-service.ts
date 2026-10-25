/**
 * Account-level operations: profile, password, sessions, export, deletion.
 */
import "server-only";
import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { authTokens, oauthAccounts, projectFiles, projects, sessions, users, workspaceMembers, workspaces, type User } from "@/db/schema";
import { ApiError, badRequest } from "@/lib/api";
import { audit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { validatePassword } from "@/lib/auth/flows";
import { toSafeUser } from "@/lib/auth/session";
import { listUserWorkspaces } from "@/lib/services/workspaces";

export const LOCALES = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी (Hindi) — translation in progress" },
] as const;

export function isValidTimezone(tz: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function updateProfile(user: User, patch: { name?: string; timezone?: string; locale?: string; avatarUrl?: string | null }) {
  const set: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.timezone !== undefined) set.timezone = patch.timezone;
  if (patch.locale !== undefined) set.locale = patch.locale;
  if (patch.avatarUrl !== undefined) set.avatarUrl = patch.avatarUrl || null;
  const [row] = await db.update(users).set(set).where(eq(users.id, user.id)).returning();
  await audit({ actorId: user.id, action: "account.profile_updated", targetType: "user", targetId: user.id, metadata: { fields: Object.keys(patch) } });
  return toSafeUser(row);
}

export async function changePassword(user: User, currentPassword: string, newPassword: string, currentSessionId: string | null) {
  if (user.passwordHash) {
    if (!(await verifyPassword(currentPassword, user.passwordHash))) throw new ApiError(400, "Current password is incorrect", "invalid_password");
  }
  const problem = validatePassword(newPassword);
  if (problem) throw badRequest(problem);
  if (currentPassword === newPassword) throw badRequest("Choose a password you have not used before");
  await db.update(users).set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() }).where(eq(users.id, user.id));
  // Sign out every other device.
  const where = currentSessionId ? and(eq(sessions.userId, user.id), ne(sessions.id, currentSessionId)) : eq(sessions.userId, user.id);
  const revoked = await db.delete(sessions).where(where).returning({ id: sessions.id });
  await audit({ actorId: user.id, action: "account.password_changed", targetType: "user", targetId: user.id, metadata: { revokedSessions: revoked.length } });
  return { revokedSessions: revoked.length };
}

export async function listSessions(userId: string, currentSessionId: string | null) {
  const rows = await db.select().from(sessions).where(eq(sessions.userId, userId)).orderBy(desc(sessions.lastSeenAt));
  return rows.map((s) => ({
    id: s.id,
    current: s.id === currentSessionId,
    ip: s.ip,
    userAgent: s.userAgent,
    createdAt: s.createdAt.toISOString(),
    lastSeenAt: s.lastSeenAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
  }));
}
export type SessionItem = Awaited<ReturnType<typeof listSessions>>[number];

export async function revokeSession(userId: string, sessionId: string) {
  const rows = await db.delete(sessions).where(and(eq(sessions.userId, userId), eq(sessions.id, sessionId))).returning({ id: sessions.id });
  if (!rows.length) throw new ApiError(404, "Session not found", "not_found");
  await audit({ actorId: userId, action: "account.session_revoked", targetType: "session", targetId: sessionId });
}

export async function revokeOtherSessions(userId: string, currentSessionId: string | null) {
  const where = currentSessionId ? and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId)) : eq(sessions.userId, userId);
  const rows = await db.delete(sessions).where(where).returning({ id: sessions.id });
  await audit({ actorId: userId, action: "account.sessions_revoked", targetType: "user", targetId: userId, metadata: { count: rows.length } });
  return rows.length;
}

/** Everything we hold about the user: profile, memberships, and projects (with files) of workspaces they own. */
export async function exportAccount(user: User) {
  const memberships = await listUserWorkspaces(user.id);
  const owned = memberships.filter((m) => m.role === "owner").map((m) => m.workspace.id);
  const ownedProjects = owned.length ? await db.select().from(projects).where(and(inArray(projects.workspaceId, owned), isNull(projects.deletedAt))) : [];
  const files = ownedProjects.length
    ? await db
        .select({ projectId: projectFiles.projectId, path: projectFiles.path, content: projectFiles.content, isBinary: projectFiles.isBinary, updatedAt: projectFiles.updatedAt })
        .from(projectFiles)
        .where(inArray(projectFiles.projectId, ownedProjects.map((p) => p.id)))
    : [];
  const byProject = new Map<string, typeof files>();
  for (const f of files) byProject.set(f.projectId, [...(byProject.get(f.projectId) ?? []), f]);
  await audit({ actorId: user.id, action: "account.exported", targetType: "user", targetId: user.id });
  return {
    exportedAt: new Date().toISOString(),
    format: "codexa-account-export/v1",
    user: toSafeUser(user),
    workspaces: memberships.map((m) => ({ id: m.workspace.id, name: m.workspace.name, slug: m.workspace.slug, plan: m.workspace.plan, role: m.role, createdAt: m.workspace.createdAt })),
    projects: ownedProjects.map((p) => ({
      id: p.id,
      workspaceId: p.workspaceId,
      name: p.name,
      slug: p.slug,
      description: p.description,
      framework: p.framework,
      visibility: p.visibility,
      settings: p.settings,
      githubRepo: p.githubRepo,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      files: (byProject.get(p.id) ?? []).map((f) => ({ path: f.path, content: f.isBinary ? null : f.content, isBinary: f.isBinary, updatedAt: f.updatedAt })),
    })),
  };
}

/**
 * Soft-delete the account: anonymise, purge credentials/sessions/tokens, and
 * either transfer or soft-delete owned workspaces. Returns what happened so the
 * caller can audit and sign the user out.
 */
export async function deleteAccount(user: User, password: string, ip?: string | null) {
  if (user.passwordHash) {
    if (!(await verifyPassword(password, user.passwordHash))) throw new ApiError(400, "Password is incorrect", "invalid_password");
  } else if (password !== user.email) {
    throw new ApiError(400, "Type your email address to confirm", "invalid_password");
  }
  const memberships = await listUserWorkspaces(user.id);
  const transferred: string[] = [];
  const deleted: string[] = [];
  await db.transaction(async (tx) => {
    for (const m of memberships) {
      const wsId = m.workspace.id;
      if (m.role === "owner") {
        const others = await tx
          .select({ userId: workspaceMembers.userId, role: workspaceMembers.role, joined: workspaceMembers.createdAt })
          .from(workspaceMembers)
          .where(and(eq(workspaceMembers.workspaceId, wsId), ne(workspaceMembers.userId, user.id)))
          .orderBy(workspaceMembers.createdAt);
        if (others.length === 0) {
          await tx.update(workspaces).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(workspaces.id, wsId));
          deleted.push(wsId);
        } else {
          const rank = { owner: 3, admin: 2, editor: 1, viewer: 0 } as const;
          const heir = [...others].sort((a, b) => rank[b.role] - rank[a.role] || a.joined.getTime() - b.joined.getTime())[0];
          await tx.update(workspaceMembers).set({ role: "owner" }).where(and(eq(workspaceMembers.workspaceId, wsId), eq(workspaceMembers.userId, heir.userId)));
          await tx.update(workspaces).set({ ownerId: heir.userId, updatedAt: new Date() }).where(eq(workspaces.id, wsId));
          transferred.push(wsId);
        }
      }
      await tx.delete(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, wsId), eq(workspaceMembers.userId, user.id)));
    }
    await tx.delete(sessions).where(eq(sessions.userId, user.id));
    await tx.delete(authTokens).where(eq(authTokens.userId, user.id));
    await tx.delete(oauthAccounts).where(eq(oauthAccounts.userId, user.id));
    await tx
      .update(users)
      .set({
        email: `deleted+${user.id}@invalid`,
        name: "Deleted user",
        avatarUrl: null,
        passwordHash: null,
        emailVerifiedAt: null,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
  });
  await audit({ actorId: user.id, action: "account.deleted", targetType: "user", targetId: user.id, metadata: { transferredWorkspaces: transferred, deletedWorkspaces: deleted }, ip });
  return { transferred, deleted };
}
