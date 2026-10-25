import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { projects, workspaceMembers, workspaces, type Project, type Workspace, type WorkspaceRole, type User } from "@/db/schema";
import { forbidden, notFound } from "@/lib/api";
import { isStaff } from "@/lib/auth/guards";

export const ROLE_RANK: Record<WorkspaceRole, number> = { viewer: 0, editor: 1, admin: 2, owner: 3 };

export function roleAtLeast(role: WorkspaceRole, min: WorkspaceRole) {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export async function getMembership(workspaceId: string, userId: string) {
  const rows = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Throws 404 if the workspace does not exist, 403 if the user lacks the role. */
export async function assertWorkspaceRole(
  user: Pick<User, "id" | "role">,
  workspaceId: string,
  min: WorkspaceRole = "viewer",
): Promise<{ workspace: Workspace; role: WorkspaceRole }> {
  const rows = await db.select().from(workspaces).where(and(eq(workspaces.id, workspaceId), isNull(workspaces.deletedAt))).limit(1);
  const workspace = rows[0];
  if (!workspace) throw notFound("Workspace");
  const membership = await getMembership(workspaceId, user.id);
  if (!membership) {
    if (isStaff(user)) return { workspace, role: "admin" };
    throw notFound("Workspace"); // do not reveal existence
  }
  if (!roleAtLeast(membership.role, min)) throw forbidden();
  return { workspace, role: membership.role };
}

export type ProjectAccess = { project: Project; workspace: Workspace; role: WorkspaceRole };

/** Throws 404 if project missing or user has no access; 403 if role insufficient. */
export async function assertProjectAccess(
  user: Pick<User, "id" | "role">,
  projectId: string,
  min: WorkspaceRole = "viewer",
): Promise<ProjectAccess> {
  const rows = await db.select().from(projects).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1);
  const project = rows[0];
  if (!project) throw notFound("Project");
  const { workspace, role } = await assertWorkspaceRole(user, project.workspaceId, min);
  return { project, workspace, role };
}

/** Public/unlisted read access without authentication (for share pages). */
export async function getPublicProject(projectId: string): Promise<Project | null> {
  const rows = await db.select().from(projects).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1);
  const p = rows[0];
  if (!p || p.visibility === "private") return null;
  return p;
}
