/**
 * Webhook pipeline against the real test database: signature → record → apply → mark.
 * Uses synthetic Stripe/Razorpay payloads with genuine signatures (no network).
 */
import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
vi.mock("server-only", () => ({}));

// Hoisted so the provider keys exist before src/lib/env is evaluated by any static import.
vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_integration";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_integration";
  process.env.RAZORPAY_KEY_ID = "rzp_test_integration";
  process.env.RAZORPAY_KEY_SECRET = "rzp_key_secret";
  process.env.RAZORPAY_WEBHOOK_SECRET = "rzp_webhook_secret";
});

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, subscriptions, users, webhookEvents, workspaces, type User, type Workspace } from "@/db/schema";
import { createUserWithWorkspace } from "@/lib/auth/users";
import { getEffectivePlan } from "@/lib/services/usage";

let stripeRoute: typeof import("@/app/api/webhooks/stripe/route");
let razorpayRoute: typeof import("@/app/api/webhooks/razorpay/route");
let user: User;
let ws: Workspace;
const suffix = Date.now().toString(36);
const now = Math.floor(Date.now() / 1000);

beforeAll(async () => {
  stripeRoute = await import("@/app/api/webhooks/stripe/route");
  razorpayRoute = await import("@/app/api/webhooks/razorpay/route");
  const r = await createUserWithWorkspace({ email: `wh-${suffix}@example.com`, password: "password123", name: "Webhook" });
  user = r.user;
  ws = r.workspace;
});

afterAll(async () => {
  await db.delete(webhookEvents).where(eq(webhookEvents.provider, "stripe")).catch(() => undefined);
  await db.delete(workspaces).where(eq(workspaces.id, ws.id));
  await db.delete(users).where(eq(users.id, user.id));
});

function stripeReq(event: Record<string, unknown>, secret = "whsec_integration") {
  const payload = JSON.stringify(event);
  const sig = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://test.local/api/webhooks/stripe", { method: "POST", headers: { "stripe-signature": sig, "content-type": "application/json" }, body: payload });
}
function razorpayReq(body: Record<string, unknown>, eventId: string, secret = "rzp_webhook_secret") {
  const raw = JSON.stringify(body);
  const sig = createHmac("sha256", secret).update(raw).digest("hex");
  return new Request("http://test.local/api/webhooks/razorpay", { method: "POST", headers: { "x-razorpay-signature": sig, "x-razorpay-event-id": eventId, "content-type": "application/json" }, body: raw });
}

describe("Stripe webhooks", () => {
  const subId = `sub_${suffix}`;
  const checkout = {
    id: `evt_checkout_${suffix}`,
    object: "event",
    type: "checkout.session.completed",
    data: { object: { id: "cs_1", mode: "subscription", subscription: subId, customer: "cus_1", payment_status: "paid", currency: "usd", amount_total: 2000, metadata: { workspaceId: "", plan: "pro", interval: "month" } } },
  };

  it("rejects an invalid signature with 400 and records nothing", async () => {
    const res = await stripeRoute.POST(stripeReq(checkout, "whsec_wrong"), undefined);
    expect(res.status).toBe(400);
    const rows = await db.select().from(webhookEvents).where(and(eq(webhookEvents.provider, "stripe"), eq(webhookEvents.eventId, checkout.id)));
    expect(rows).toHaveLength(0);
  });

  it("activates a subscription from checkout.session.completed and syncs the workspace plan", async () => {
    checkout.data.object.metadata.workspaceId = ws.id;
    const res = await stripeRoute.POST(stripeReq(checkout), undefined);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { duplicate: boolean; applied: boolean };
    expect(body).toMatchObject({ duplicate: false, applied: true });
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.providerSubscriptionId, subId));
    expect(sub).toMatchObject({ workspaceId: ws.id, plan: "pro", status: "active", provider: "stripe", providerCustomerId: "cus_1", currency: "USD", amountMinor: 2000 });
    const [w] = await db.select().from(workspaces).where(eq(workspaces.id, ws.id));
    expect(w.plan).toBe("pro");
    expect(await getEffectivePlan(w)).toBe("pro");
    const [ev] = await db.select().from(webhookEvents).where(and(eq(webhookEvents.provider, "stripe"), eq(webhookEvents.eventId, checkout.id)));
    expect(ev.processedAt).not.toBeNull();
  });

  it("is idempotent: the same event delivered twice returns 200 duplicate and does not update again", async () => {
    const before = await db.select().from(subscriptions).where(eq(subscriptions.providerSubscriptionId, subId));
    const res = await stripeRoute.POST(stripeReq(checkout), undefined);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ duplicate: true, applied: false });
    const after = await db.select().from(subscriptions).where(eq(subscriptions.providerSubscriptionId, subId));
    expect(after).toHaveLength(1);
    expect(after[0].updatedAt.getTime()).toBe(before[0].updatedAt.getTime());
    const events = await db.select().from(webhookEvents).where(and(eq(webhookEvents.provider, "stripe"), eq(webhookEvents.eventId, checkout.id)));
    expect(events).toHaveLength(1);
  });

  it("invoice.paid records an invoice; invoice.payment_failed sets past_due but keeps entitlements until period end", async () => {
    const periodEnd = now + 30 * 86400;
    const paid = {
      id: `evt_inv_paid_${suffix}`,
      object: "event",
      type: "invoice.paid",
      data: { object: { id: `in_paid_${suffix}`, object: "invoice", currency: "usd", amount_paid: 2000, hosted_invoice_url: "https://invoice.stripe.test/x", parent: { subscription_details: { subscription: subId, metadata: { workspaceId: ws.id } } }, lines: { data: [{ period: { start: now, end: periodEnd } }] } } },
    };
    expect((await stripeRoute.POST(stripeReq(paid), undefined)).status).toBe(200);
    const [inv] = await db.select().from(invoices).where(eq(invoices.providerInvoiceId, `in_paid_${suffix}`));
    expect(inv).toMatchObject({ workspaceId: ws.id, status: "paid", amountMinor: 2000, hostedUrl: "https://invoice.stripe.test/x" });
    let [sub] = await db.select().from(subscriptions).where(eq(subscriptions.providerSubscriptionId, subId));
    expect(sub.status).toBe("active");
    expect(sub.currentPeriodEnd?.getTime()).toBe(periodEnd * 1000);

    const failed = {
      id: `evt_inv_failed_${suffix}`,
      object: "event",
      type: "invoice.payment_failed",
      data: { object: { id: `in_failed_${suffix}`, object: "invoice", currency: "usd", amount_due: 2000, subscription: subId, lines: { data: [] } } },
    };
    expect((await stripeRoute.POST(stripeReq(failed), undefined)).status).toBe(200);
    [sub] = await db.select().from(subscriptions).where(eq(subscriptions.providerSubscriptionId, subId));
    expect(sub.status).toBe("past_due");
    const [w] = await db.select().from(workspaces).where(eq(workspaces.id, ws.id));
    expect(w.plan).toBe("pro"); // still inside the paid period
    expect(await getEffectivePlan(w)).toBe("pro");
  });

  it("customer.subscription.deleted cancels and drops the workspace to free", async () => {
    const deleted = { id: `evt_del_${suffix}`, object: "event", type: "customer.subscription.deleted", data: { object: { id: subId, object: "subscription", status: "canceled", customer: "cus_1", metadata: { workspaceId: ws.id, plan: "pro" } } } };
    expect((await stripeRoute.POST(stripeReq(deleted), undefined)).status).toBe(200);
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.providerSubscriptionId, subId));
    expect(sub.status).toBe("canceled");
    const [w] = await db.select().from(workspaces).where(eq(workspaces.id, ws.id));
    expect(w.plan).toBe("free");
    expect(await getEffectivePlan(w)).toBe("free");
  });

  it("acknowledges unhandled event types without applying anything", async () => {
    const res = await stripeRoute.POST(stripeReq({ id: `evt_other_${suffix}`, object: "event", type: "customer.created", data: { object: { id: "cus_x" } } }), undefined);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ applied: false });
  });
});

describe("Razorpay webhooks", () => {
  const subId = `sub_rzp_${suffix}`;
  const entity = () => ({ id: subId, status: "active", customer_id: "cust_1", current_start: now, current_end: now + 30 * 86400, notes: { workspaceId: ws.id, plan: "team", interval: "month" } });

  it("rejects a bad HMAC", async () => {
    const res = await razorpayRoute.POST(razorpayReq({ event: "subscription.activated", payload: { subscription: { entity: entity() } } }, `rzp_bad_${suffix}`, "wrong"), undefined);
    expect(res.status).toBe(400);
  });

  it("activates, charges (invoice), and is idempotent on redelivery", async () => {
    const activated = { event: "subscription.activated", payload: { subscription: { entity: entity() } } };
    expect((await razorpayRoute.POST(razorpayReq(activated, `rzp_act_${suffix}`), undefined)).status).toBe(200);
    let [sub] = await db.select().from(subscriptions).where(eq(subscriptions.providerSubscriptionId, subId));
    expect(sub).toMatchObject({ workspaceId: ws.id, plan: "team", status: "active", provider: "razorpay", currency: "INR" });
    expect(await getEffectivePlan((await db.select().from(workspaces).where(eq(workspaces.id, ws.id)))[0])).toBe("team");

    const charged = { event: "subscription.charged", payload: { subscription: { entity: entity() }, payment: { entity: { id: `pay_${suffix}`, amount: 399900, currency: "INR" } } } };
    expect((await razorpayRoute.POST(razorpayReq(charged, `rzp_chg_${suffix}`), undefined)).status).toBe(200);
    const dup = await razorpayRoute.POST(razorpayReq(charged, `rzp_chg_${suffix}`), undefined);
    expect(await dup.json()).toMatchObject({ duplicate: true });
    const inv = await db.select().from(invoices).where(eq(invoices.providerInvoiceId, `pay_${suffix}`));
    expect(inv).toHaveLength(1);
    expect(inv[0]).toMatchObject({ workspaceId: ws.id, amountMinor: 399900, currency: "INR", status: "paid" });
    [sub] = await db.select().from(subscriptions).where(eq(subscriptions.providerSubscriptionId, subId));
    expect(sub.amountMinor).toBe(399900);
  });

  it("halted → past_due keeps the plan; cancelled → free", async () => {
    expect((await razorpayRoute.POST(razorpayReq({ event: "subscription.halted", payload: { subscription: { entity: { ...entity(), status: "halted" } } } }, `rzp_halt_${suffix}`), undefined)).status).toBe(200);
    let [sub] = await db.select().from(subscriptions).where(eq(subscriptions.providerSubscriptionId, subId));
    expect(sub.status).toBe("past_due");
    expect((await db.select().from(workspaces).where(eq(workspaces.id, ws.id)))[0].plan).toBe("team");
    expect((await razorpayRoute.POST(razorpayReq({ event: "subscription.cancelled", payload: { subscription: { entity: { ...entity(), status: "cancelled", ended_at: now } } } }, `rzp_cancel_${suffix}`), undefined)).status).toBe(200);
    [sub] = await db.select().from(subscriptions).where(eq(subscriptions.providerSubscriptionId, subId));
    expect(sub.status).toBe("canceled");
    expect((await db.select().from(workspaces).where(eq(workspaces.id, ws.id)))[0].plan).toBe("free");
  });
});
