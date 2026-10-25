import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { enforceRateLimit } from "@/lib/rate-limit";
import { startCheckout } from "@/lib/billing/service";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ plan: z.enum(["pro", "team"]), interval: z.enum(["month", "year"]), currency: z.enum(["USD", "INR"]) });

/** POST /api/v1/workspaces/:id/billing/checkout { plan, interval, currency } → { provider: 'stripe', url } | { provider: 'razorpay', order } */
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { workspace } = await assertWorkspaceRole(user, id, "admin");
  await enforceRateLimit(`billing:checkout:${id}`, 10, 10 * 60_000);
  const body = await parseBody(req, schema);
  const result = await startCheckout({ workspace, actorId: user.id, actorEmail: user.email, plan: body.plan, interval: body.interval, currency: body.currency });
  return json(result);
});
