import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { resumeSubscription } from "@/lib/billing/service";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/v1/workspaces/:id/billing/resume — undo a scheduled cancellation (Stripe). */
export const POST = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { workspace } = await assertWorkspaceRole(user, id, "owner");
  return json({ subscription: await resumeSubscription(workspace, user.id) });
});
