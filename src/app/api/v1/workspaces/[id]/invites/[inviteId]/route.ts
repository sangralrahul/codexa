import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { revokeInvite } from "@/lib/billing/team-service";

type Ctx = { params: Promise<{ id: string; inviteId: string }> };

/** DELETE /api/v1/workspaces/:id/invites/:inviteId — revoke a pending invitation. */
export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, inviteId } = await ctx.params;
  const { workspace } = await assertWorkspaceRole(user, id, "admin");
  await revokeInvite(workspace, user, inviteId);
  return json({ ok: true });
});
