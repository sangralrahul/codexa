import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { cancelSubscription } from "@/lib/billing/service";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/v1/workspaces/:id/billing/cancel — schedule cancellation at period end. */
export const POST = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { workspace } = await assertWorkspaceRole(user, id, "owner");
  return json({ subscription: await cancelSubscription(workspace, user.id) });
});
