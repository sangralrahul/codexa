import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { listMembers } from "@/lib/services/workspaces";
import { countProjects } from "@/lib/services/projects";
import { serializeWorkspace } from "@/app/api/v1/projects/_lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { workspace, role } = await assertWorkspaceRole(user, id, "viewer");
  const [members, projectCount] = await Promise.all([listMembers(id), countProjects(id)]);
  return json({
    workspace: serializeWorkspace(workspace),
    role,
    projectCount,
    // Member emails are visible to any member of the workspace (needed for the members list / activity attribution).
    members: members.map((m) => ({ userId: m.userId, name: m.name, email: m.email, avatarUrl: m.avatarUrl, role: m.role, joinedAt: m.joinedAt })),
  });
});
