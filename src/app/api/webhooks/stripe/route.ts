import { handler, json } from "@/lib/api";
import { capabilities } from "@/lib/env";
import { constructStripeEvent } from "@/lib/billing/stripe";
import { processWebhook } from "@/lib/billing/webhooks";
import { stripeTransition } from "@/lib/billing/state";

/**
 * POST /api/webhooks/stripe
 * Verified with stripe.webhooks.constructEvent(rawBody, Stripe-Signature, STRIPE_WEBHOOK_SECRET).
 * Idempotent: duplicate event ids return 200 without re-processing.
 */
export const POST = handler(async (req) => {
  if (!capabilities.stripe) return json({ error: { code: "billing_not_configured", message: "Stripe is not configured" } }, { status: 503 });
  const raw = await req.text();
  const event = constructStripeEvent(raw, req.headers.get("stripe-signature"));
  const outcome = await processWebhook("stripe", event.id, event.type, event, stripeTransition({ type: event.type, data: { object: event.data.object } }));
  if (outcome.error) return json({ received: true, ...outcome }, { status: 500 });
  return json({ received: true, ...outcome });
});
