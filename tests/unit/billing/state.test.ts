import { describe, expect, it } from "vitest";
import { effectivePlanFor, grantsEntitlements, mapRazorpayStatus, mapStripeStatus, razorpayTransition, stripeTransition } from "@/lib/billing/state";

const now = 1_800_000_000; // unix seconds

describe("subscription state machine", () => {
  it("maps provider statuses; failed payments become past_due, not canceled", () => {
    expect(mapStripeStatus("active")).toBe("active");
    expect(mapStripeStatus("past_due")).toBe("past_due");
    expect(mapStripeStatus("unpaid")).toBe("past_due");
    expect(mapStripeStatus("canceled")).toBe("canceled");
    expect(mapStripeStatus("incomplete_expired")).toBe("canceled");
    expect(mapRazorpayStatus("authenticated")).toBe("active");
    expect(mapRazorpayStatus("halted")).toBe("past_due");
    expect(mapRazorpayStatus("completed")).toBe("canceled");
    expect(mapRazorpayStatus("created")).toBe("incomplete");
  });

  it("past_due keeps entitlements until the period ends, then falls back to free", () => {
    const end = new Date(Date.now() + 86400_000);
    expect(grantsEntitlements("past_due")).toBe(true);
    expect(effectivePlanFor({ plan: "pro", status: "past_due", currentPeriodEnd: end })).toBe("pro");
    expect(effectivePlanFor({ plan: "pro", status: "past_due", currentPeriodEnd: new Date(Date.now() - 1000) })).toBe("free");
    expect(effectivePlanFor({ plan: "team", status: "canceled", currentPeriodEnd: end })).toBe("free");
    expect(effectivePlanFor({ plan: "team", status: "incomplete", currentPeriodEnd: null })).toBe("free");
    expect(effectivePlanFor({ plan: "team", status: "active", currentPeriodEnd: null })).toBe("team");
    expect(effectivePlanFor(null)).toBe("free");
  });

  describe("stripe transitions", () => {
    it("checkout.session.completed activates the subscription from metadata", () => {
      const t = stripeTransition({
        type: "checkout.session.completed",
        data: { object: { id: "cs_1", mode: "subscription", subscription: "sub_1", customer: "cus_1", payment_status: "paid", currency: "usd", amount_total: 2000, metadata: { workspaceId: "ws_1", plan: "pro", interval: "month" } } },
      });
      expect(t.subscription).toMatchObject({ provider: "stripe", providerSubscriptionId: "sub_1", workspaceId: "ws_1", plan: "pro", interval: "month", status: "active", providerCustomerId: "cus_1", currency: "USD", amountMinor: 2000 });
    });
    it("ignores one-off payment checkouts and unknown events", () => {
      expect(stripeTransition({ type: "checkout.session.completed", data: { object: { mode: "payment" } } }).ignored).toBeDefined();
      expect(stripeTransition({ type: "charge.refunded", data: { object: {} } }).ignored).toMatch(/unhandled/);
    });
    it("customer.subscription.updated reads periods from items (new API) and marks cancel_at_period_end", () => {
      const t = stripeTransition({
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_1",
            status: "active",
            customer: { id: "cus_1" },
            cancel_at_period_end: true,
            metadata: { workspaceId: "ws_1", plan: "team", interval: "year" },
            items: { data: [{ current_period_start: now, current_period_end: now + 86400 * 365, price: { currency: "inr", unit_amount: 3958800, recurring: { interval: "year" } } }] },
          },
        },
      });
      expect(t.subscription).toMatchObject({ plan: "team", interval: "year", status: "active", currency: "INR", amountMinor: 3958800, cancelAtPeriodEnd: true, providerCustomerId: "cus_1" });
      expect(t.subscription?.currentPeriodEnd?.getTime()).toBe((now + 86400 * 365) * 1000);
    });
    it("customer.subscription.deleted forces canceled", () => {
      const t = stripeTransition({ type: "customer.subscription.deleted", data: { object: { id: "sub_1", status: "active", metadata: { workspaceId: "ws_1" } } } });
      expect(t.subscription?.status).toBe("canceled");
      expect(t.subscription?.canceledAt).toBeInstanceOf(Date);
    });
    it("invoice.paid records a paid invoice and activates; invoice.payment_failed records failure and sets past_due", () => {
      const base = { id: "in_1", currency: "usd", hosted_invoice_url: "https://stripe.test/in_1", parent: { subscription_details: { subscription: "sub_1", metadata: { workspaceId: "ws_1" } } }, lines: { data: [{ period: { start: now, end: now + 2592000 } }] } };
      const paid = stripeTransition({ type: "invoice.paid", data: { object: { ...base, amount_paid: 2000 } } });
      expect(paid.invoice).toMatchObject({ provider: "stripe", providerInvoiceId: "in_1", providerSubscriptionId: "sub_1", workspaceId: "ws_1", amountMinor: 2000, status: "paid", hostedUrl: "https://stripe.test/in_1" });
      expect(paid.subscriptionStatusFromInvoice).toBe("active");
      const failed = stripeTransition({ type: "invoice.payment_failed", data: { object: { ...base, id: "in_2", amount_due: 2000, subscription: "sub_1" } } });
      expect(failed.invoice?.status).toBe("failed");
      expect(failed.subscriptionStatusFromInvoice).toBe("past_due");
    });
  });

  describe("razorpay transitions", () => {
    const sub = { id: "sub_r1", status: "active", customer_id: "cust_1", current_start: now, current_end: now + 2592000, notes: { workspaceId: "ws_1", plan: "pro", interval: "month" } };
    it("subscription.activated upserts an active INR subscription", () => {
      const t = razorpayTransition({ event: "subscription.activated", payload: { subscription: { entity: sub } } });
      expect(t.subscription).toMatchObject({ provider: "razorpay", providerSubscriptionId: "sub_r1", workspaceId: "ws_1", plan: "pro", interval: "month", currency: "INR", status: "active", providerCustomerId: "cust_1" });
    });
    it("subscription.charged records an invoice from the payment entity", () => {
      const t = razorpayTransition({ event: "subscription.charged", payload: { subscription: { entity: sub }, payment: { entity: { id: "pay_1", amount: 149900, currency: "INR" } } } });
      expect(t.subscription?.status).toBe("active");
      expect(t.subscription?.amountMinor).toBe(149900);
      expect(t.invoice).toMatchObject({ providerInvoiceId: "pay_1", providerSubscriptionId: "sub_r1", amountMinor: 149900, status: "paid", currency: "INR" });
    });
    it("halted → past_due; cancelled/completed → canceled", () => {
      expect(razorpayTransition({ event: "subscription.halted", payload: { subscription: { entity: { ...sub, status: "halted" } } } }).subscription?.status).toBe("past_due");
      const c = razorpayTransition({ event: "subscription.cancelled", payload: { subscription: { entity: { ...sub, status: "cancelled", ended_at: now } } } }).subscription!;
      expect(c.status).toBe("canceled");
      expect(c.cancelAtPeriodEnd).toBe(false);
      expect(razorpayTransition({ event: "subscription.completed", payload: { subscription: { entity: { ...sub, status: "completed" } } } }).subscription?.status).toBe("canceled");
    });
    it("payment.failed records a failed invoice and sets past_due", () => {
      const t = razorpayTransition({ event: "payment.failed", payload: { payment: { entity: { id: "pay_f", amount: 149900, currency: "INR", notes: { subscriptionId: "sub_r1", workspaceId: "ws_1" } } } } });
      expect(t.invoice).toMatchObject({ providerInvoiceId: "pay_f", providerSubscriptionId: "sub_r1", status: "failed" });
      expect(t.subscriptionStatusFromInvoice).toBe("past_due");
    });
    it("ignores events without a subscription entity", () => {
      expect(razorpayTransition({ event: "subscription.activated", payload: {} }).ignored).toBeDefined();
      expect(razorpayTransition({ event: "order.paid", payload: {} }).ignored).toMatch(/unhandled/);
    });
  });
});
