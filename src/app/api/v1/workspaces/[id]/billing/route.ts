import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { getBillingOverview } from "@/lib/billing/service";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/v1/workspaces/:id/billing → { plan, subscription, invoices, providers } */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { workspace } = await assertWorkspaceRole(user, id, "viewer");
  return json(await getBillingOverview(workspace));
});
