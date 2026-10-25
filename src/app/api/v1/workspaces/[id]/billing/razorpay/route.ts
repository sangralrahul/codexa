import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertWorkspaceRole } from "@/lib/services/access";
import { enforceRateLimit } from "@/lib/rate-limit";
import { completeRazorpayCheckout } from "@/lib/billing/service";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_subscription_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(200),
});

/** POST /api/v1/workspaces/:id/billing/razorpay — verify the Checkout.js return signature and activate. */
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { workspace } = await assertWorkspaceRole(user, id, "admin");
  await enforceRateLimit(`billing:rzp-verify:${id}`, 20, 10 * 60_000);
  const body = await parseBody(req, schema);
  const subscription = await completeRazorpayCheckout({
    workspace,
    actorId: user.id,
    paymentId: body.razorpay_payment_id,
    subscriptionId: body.razorpay_subscription_id,
    signature: body.razorpay_signature,
  });
  return json({ subscription });
});
