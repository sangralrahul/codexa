import type { Project, Workspace, WorkspaceRole } from "@/db/schema";

/** Public shape of a project for API responses (no internal-only columns). */
export function serializeProject(p: Project) {
  return {
    id: p.id,
    workspaceId: p.workspaceId,
    name: p.name,
    slug: p.slug,
    description: p.description,
    templateId: p.templateId,
    framework: p.framework,
    visibility: p.visibility,
    createdBy: p.createdBy,
    settings: p.settings,
    githubRepo: p.githubRepo,
    githubBranch: p.githubBranch,
    lastOpenedAt: p.lastOpenedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export type SerializedProject = ReturnType<typeof serializeProject>;

export function serializeWorkspace(w: Workspace, role?: WorkspaceRole) {
  return {
    id: w.id,
    slug: w.slug,
    name: w.name,
    ownerId: w.ownerId,
    plan: w.plan,
    billingCurrency: w.billingCurrency,
    createdAt: w.createdAt,
    ...(role ? { role } : {}),
  };
}
