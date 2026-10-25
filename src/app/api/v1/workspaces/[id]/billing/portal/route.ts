import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { portalUrl } from "@/lib/billing/service";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/v1/workspaces/:id/billing/portal → { url } (Stripe customer portal). */
export const POST = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { workspace } = await assertWorkspaceRole(user, id, "admin");
  return json(await portalUrl(workspace));
});
