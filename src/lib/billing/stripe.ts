import "server-only";
import Stripe from "stripe";
import { env, capabilities } from "@/lib/env";
import { ApiError } from "@/lib/api";
import { getPlanPrice, stripeProductName, type BillingInterval } from "./plans";
import type { Currency, Plan } from "@/db/schema";

export const billingNotConfigured = (provider: string) =>
  new ApiError(503, `${provider} payments are not configured on this deployment`, "billing_not_configured");

let client: Stripe | null = null;
export function getStripe(): Stripe {
  if (!capabilities.stripe) throw billingNotConfigured("Stripe");
  if (!client) client = new Stripe(env.STRIPE_SECRET_KEY as string, { typescript: true });
  return client;
}

/**
 * Create a Checkout Session for a plan. Prices are built inline from PLANS
 * via price_data, so no pre-created Stripe price ids are required.
 */
export async function createStripeCheckout(input: {
  workspaceId: string;
  plan: Plan;
  interval: BillingInterval;
  currency: Currency;
  customerEmail: string;
  customerId?: string | null;
}): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe();
  const quote = getPlanPrice(input.plan, input.currency, input.interval);
  if (!quote || quote.totalMinor <= 0) throw new ApiError(400, "This plan cannot be purchased online", "bad_request");
  const metadata = { workspaceId: input.workspaceId, plan: input.plan, interval: input.interval };
  const base = env.APP_URL;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    ...(input.customerId ? { customer: input.customerId } : { customer_email: input.customerEmail }),
    client_reference_id: input.workspaceId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: quote.totalMinor,
          recurring: { interval: input.interval },
          product_data: { name: stripeProductName(input.plan, input.interval) },
        },
      },
    ],
    metadata,
    subscription_data: { metadata },
    allow_promotion_codes: true,
    success_url: `${base}/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/settings/billing?checkout=cancelled`,
  });
  if (!session.url) throw new ApiError(502, "Stripe did not return a checkout URL", "provider_error");
  return { url: session.url, sessionId: session.id };
}

export async function createStripePortalSession(customerId: string): Promise<{ url: string }> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${env.APP_URL}/settings/billing` });
  return { url: session.url };
}

export async function setStripeCancelAtPeriodEnd(subscriptionId: string, cancel: boolean) {
  const stripe = getStripe();
  const sub = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: cancel });
  return { cancelAtPeriodEnd: sub.cancel_at_period_end, status: sub.status };
}

/** Verify + parse a webhook. Throws ApiError(400) on a bad signature. */
export function constructStripeEvent(rawBody: string, signature: string | null): Stripe.Event {
  if (!env.STRIPE_WEBHOOK_SECRET) throw billingNotConfigured("Stripe webhooks");
  if (!signature) throw new ApiError(400, "Missing Stripe-Signature header", "invalid_signature");
  try {
    // constructEvent is static-safe: it only needs the secret, not an API key.
    return Stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    throw new ApiError(400, `Invalid Stripe signature: ${err instanceof Error ? err.message : "unknown"}`, "invalid_signature");
  }
}
