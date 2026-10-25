import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { getTeam } from "@/lib/billing/team-service";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/v1/workspaces/:id/members → { members, invites, role } (invites visible to admins only) */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { role } = await assertWorkspaceRole(user, id, "viewer");
  const team = await getTeam(id);
  const canManage = role === "owner" || role === "admin";
  return json({ members: team.members, invites: canManage ? team.invites : [], role });
});
