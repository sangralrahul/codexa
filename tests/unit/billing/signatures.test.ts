/**
 * Signature verification for both providers using synthetic payloads and real HMACs.
 * Stripe: generateTestHeaderString builds a genuine Stripe-Signature header.
 */
import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import Stripe from "stripe";

process.env.STRIPE_SECRET_KEY = "sk_test_unit";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_unit_test_secret";
process.env.RAZORPAY_KEY_ID = "rzp_test_unit";
process.env.RAZORPAY_KEY_SECRET = "rzp_unit_key_secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "rzp_unit_webhook_secret";

let razorpay: typeof import("@/lib/billing/razorpay");
let stripeMod: typeof import("@/lib/billing/stripe");

beforeAll(async () => {
  razorpay = await import("@/lib/billing/razorpay");
  stripeMod = await import("@/lib/billing/stripe");
});

describe("Razorpay signatures", () => {
  const secret = "rzp_unit_key_secret";
  it("accepts a valid checkout return signature", () => {
    const paymentId = "pay_123";
    const subscriptionId = "sub_456";
    const signature = createHmac("sha256", secret).update(`${paymentId}|${subscriptionId}`).digest("hex");
    expect(razorpay.verifyRazorpayPaymentSignature({ paymentId, subscriptionId, signature }, secret)).toBe(true);
    expect(razorpay.verifyRazorpayPaymentSignature({ paymentId, subscriptionId, signature: signature.toUpperCase() }, secret)).toBe(true);
  });
  it("rejects tampered or empty checkout signatures", () => {
    const signature = createHmac("sha256", secret).update("pay_1|sub_1").digest("hex");
    expect(razorpay.verifyRazorpayPaymentSignature({ paymentId: "pay_2", subscriptionId: "sub_1", signature }, secret)).toBe(false);
    expect(razorpay.verifyRazorpayPaymentSignature({ paymentId: "pay_1", subscriptionId: "sub_1", signature: "" }, secret)).toBe(false);
    expect(razorpay.verifyRazorpayPaymentSignature({ paymentId: "pay_1", subscriptionId: "sub_1", signature }, "")).toBe(false);
    expect(razorpay.verifyRazorpayPaymentSignature({ paymentId: "pay_1", subscriptionId: "sub_1", signature: "ab" }, secret)).toBe(false);
  });
  it("verifies webhook bodies with the webhook secret (default from env)", () => {
    const body = JSON.stringify({ event: "subscription.activated", payload: {} });
    const good = createHmac("sha256", "rzp_unit_webhook_secret").update(body).digest("hex");
    expect(razorpay.verifyRazorpayWebhookSignature(body, good)).toBe(true);
    expect(razorpay.verifyRazorpayWebhookSignature(body + " ", good)).toBe(false);
    expect(razorpay.verifyRazorpayWebhookSignature(body, null)).toBe(false);
    expect(razorpay.verifyRazorpayWebhookSignature(body, good, undefined)).toBe(true);
    expect(razorpay.verifyRazorpayWebhookSignature(body, good, "other")).toBe(false);
  });
});

describe("Stripe signatures", () => {
  const secret = "whsec_unit_test_secret";
  const payload = JSON.stringify({ id: "evt_unit_1", object: "event", type: "invoice.paid", data: { object: { id: "in_1", object: "invoice" } } });

  it("accepts a header generated for the payload", () => {
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    const event = stripeMod.constructStripeEvent(payload, header);
    expect(event.id).toBe("evt_unit_1");
    expect(event.type).toBe("invoice.paid");
  });

  it("rejects a wrong secret, a modified body and a missing header", () => {
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_other" });
    expect(() => stripeMod.constructStripeEvent(payload, header)).toThrowError(/Invalid Stripe signature/);
    const good = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(() => stripeMod.constructStripeEvent(payload.replace("in_1", "in_2"), good)).toThrowError(/Invalid Stripe signature/);
    expect(() => stripeMod.constructStripeEvent(payload, null)).toThrowError(/Missing Stripe-Signature/);
  });

  it("rejects stale timestamps (replay protection)", () => {
    const old = Stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp: Math.floor(Date.now() / 1000) - 3600 });
    expect(() => stripeMod.constructStripeEvent(payload, old)).toThrowError(/Invalid Stripe signature/);
  });
});
