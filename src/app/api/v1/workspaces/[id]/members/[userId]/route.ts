import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { changeMemberRole, removeMember } from "@/lib/billing/team-service";

type Ctx = { params: Promise<{ id: string; userId: string }> };
const schema = z.object({ role: z.enum(["owner", "admin", "editor", "viewer"]) });

/** PATCH /api/v1/workspaces/:id/members/:userId { role } */
export const PATCH = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id, userId } = await ctx.params;
  const { workspace, role } = await assertWorkspaceRole(user, id, "admin");
  const body = await parseBody(req, schema);
  return json({ member: await changeMemberRole({ workspace, actor: user, actorRole: role, targetUserId: userId, role: body.role }) });
});

/** DELETE /api/v1/workspaces/:id/members/:userId — remove a member, or leave (userId === self). */
export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, userId } = await ctx.params;
  const { workspace, role } = await assertWorkspaceRole(user, id, "viewer");
  return json(await removeMember({ workspace, actor: user, actorRole: role, targetUserId: userId }));
});
