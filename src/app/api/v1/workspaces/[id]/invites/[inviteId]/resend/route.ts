import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { resendInvite } from "@/lib/billing/team-service";

type Ctx = { params: Promise<{ id: string; inviteId: string }> };

/** POST /api/v1/workspaces/:id/invites/:inviteId/resend — new token, new expiry, email again. */
export const POST = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, inviteId } = await ctx.params;
  const { workspace } = await assertWorkspaceRole(user, id, "admin");
  return json(await resendInvite(workspace, user, inviteId));
});
