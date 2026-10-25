/**
 * Subscription state machine: pure functions that turn provider webhook
 * payloads into subscription row patches. No I/O here so the transitions can
 * be unit tested with synthetic payloads.
 */
import type { Currency, Plan } from "@/db/schema";
import type { BillingInterval } from "./plans";

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete";
export type BillingProvider = "stripe" | "razorpay" | "manual";

export type SubscriptionPatch = {
  provider: BillingProvider;
  providerSubscriptionId: string;
  workspaceId?: string;
  plan?: Plan;
  status?: SubscriptionStatus;
  interval?: BillingInterval;
  currency?: Currency;
  amountMinor?: number;
  providerCustomerId?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date | null;
};

export type InvoiceRecord = {
  provider: BillingProvider;
  providerInvoiceId: string;
  providerSubscriptionId: string | null;
  workspaceId?: string;
  amountMinor: number;
  currency: Currency;
  status: "paid" | "open" | "void" | "failed";
  hostedUrl: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
};

export type Transition = {
  subscription?: SubscriptionPatch;
  invoice?: InvoiceRecord;
  /** Status to force on the subscription referenced by `invoice.providerSubscriptionId` (used by invoice events). */
  subscriptionStatusFromInvoice?: SubscriptionStatus;
  ignored?: string;
};

const PLAN_IDS = new Set<string>(["free", "pro", "team", "enterprise"]);
export function asPlan(v: unknown): Plan | undefined {
  return typeof v === "string" && PLAN_IDS.has(v) ? (v as Plan) : undefined;
}
export function asInterval(v: unknown): BillingInterval | undefined {
  return v === "month" || v === "year" ? v : undefined;
}
export function asCurrency(v: unknown): Currency | undefined {
  if (typeof v !== "string") return undefined;
  const u = v.toUpperCase();
  return u === "INR" || u === "USD" ? (u as Currency) : undefined;
}
const unix = (v: unknown): Date | null => (typeof v === "number" && v > 0 ? new Date(v * 1000) : null);
const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

/**
 * Status mapping. Failed payments map to past_due: entitlements keep working
 * until currentPeriodEnd (getEffectivePlan checks the period), then fall back to free.
 */
export function mapStripeStatus(s: unknown): SubscriptionStatus {
  switch (s) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "incomplete":
      return "incomplete";
    case "canceled":
    case "incomplete_expired":
    case "paused":
    default:
      return "canceled";
  }
}

export function mapRazorpayStatus(s: unknown): SubscriptionStatus {
  switch (s) {
    case "active":
    case "authenticated":
      return "active";
    case "pending":
    case "halted":
      return "past_due";
    case "created":
      return "incomplete";
    case "cancelled":
    case "completed":
    case "expired":
    case "paused":
    default:
      return "canceled";
  }
}

/** Whether a subscription in this status grants its plan's entitlements (period end permitting). */
export function grantsEntitlements(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

/** Plan a workspace should be set to given its latest subscription row. */
export function effectivePlanFor(sub: { plan: Plan; status: SubscriptionStatus; currentPeriodEnd: Date | null } | null, now = new Date()): Plan {
  if (!sub) return "free";
  if (!grantsEntitlements(sub.status)) return "free";
  if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() <= now.getTime()) return "free";
  return sub.plan;
}

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------
function stripeSubscriptionPatch(sub: Record<string, unknown>): SubscriptionPatch {
  const meta = rec(sub.metadata);
  const items = rec(sub.items);
  const firstItem = rec((Array.isArray(items.data) ? items.data[0] : undefined) as unknown);
  const price = rec(firstItem.price);
  const recurring = rec(price.recurring);
  const patch: SubscriptionPatch = {
    provider: "stripe",
    providerSubscriptionId: String(sub.id),
    workspaceId: str(meta.workspaceId),
    plan: asPlan(meta.plan),
    interval: asInterval(meta.interval) ?? asInterval(recurring.interval),
    status: mapStripeStatus(sub.status),
    providerCustomerId: typeof sub.customer === "string" ? sub.customer : str(rec(sub.customer).id) ?? null,
    // Stripe moved current_period_* onto subscription items in newer API versions; support both.
    currentPeriodStart: unix(sub.current_period_start) ?? unix(firstItem.current_period_start),
    currentPeriodEnd: unix(sub.current_period_end) ?? unix(firstItem.current_period_end),
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    canceledAt: unix(sub.canceled_at),
  };
  const currency = asCurrency(price.currency ?? sub.currency);
  if (currency) patch.currency = currency;
  if (typeof price.unit_amount === "number") patch.amountMinor = price.unit_amount;
  return patch;
}

export function stripeTransition(event: { type: string; data: { object: unknown } }): Transition {
  const obj = rec(event.data.object);
  switch (event.type) {
    case "checkout.session.completed": {
      if (obj.mode !== "subscription" || typeof obj.subscription !== "string") return { ignored: "not a subscription checkout" };
      const meta = rec(obj.metadata);
      const patch: SubscriptionPatch = {
        provider: "stripe",
        providerSubscriptionId: obj.subscription,
        workspaceId: str(meta.workspaceId) ?? str(obj.client_reference_id),
        plan: asPlan(meta.plan),
        interval: asInterval(meta.interval),
        status: obj.payment_status === "paid" || obj.payment_status === "no_payment_required" ? "active" : "incomplete",
        providerCustomerId: typeof obj.customer === "string" ? obj.customer : null,
      };
      const currency = asCurrency(obj.currency);
      if (currency) patch.currency = currency;
      if (typeof obj.amount_total === "number") patch.amountMinor = obj.amount_total;
      return { subscription: patch };
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
      return { subscription: stripeSubscriptionPatch(obj) };
    case "customer.subscription.deleted": {
      const patch = stripeSubscriptionPatch(obj);
      patch.status = "canceled";
      patch.canceledAt = patch.canceledAt ?? new Date();
      return { subscription: patch };
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const paid = event.type === "invoice.paid";
      const parent = rec(obj.parent);
      const subDetails = rec(parent.subscription_details);
      const subId =
        (typeof obj.subscription === "string" ? obj.subscription : str(rec(obj.subscription).id)) ?? str(subDetails.subscription) ?? null;
      const lines = rec(obj.lines);
      const firstLine = rec((Array.isArray(lines.data) ? lines.data[0] : undefined) as unknown);
      const period = rec(firstLine.period);
      const currency = asCurrency(obj.currency) ?? "USD";
      const invoice: InvoiceRecord = {
        provider: "stripe",
        providerInvoiceId: String(obj.id),
        providerSubscriptionId: subId,
        workspaceId: str(rec(subDetails.metadata).workspaceId) ?? str(rec(obj.metadata).workspaceId),
        amountMinor: typeof (paid ? obj.amount_paid : obj.amount_due) === "number" ? ((paid ? obj.amount_paid : obj.amount_due) as number) : 0,
        currency,
        status: paid ? "paid" : "failed",
        hostedUrl: str(obj.hosted_invoice_url) ?? null,
        periodStart: unix(period.start) ?? unix(obj.period_start),
        periodEnd: unix(period.end) ?? unix(obj.period_end),
      };
      return { invoice, subscriptionStatusFromInvoice: paid ? "active" : "past_due" };
    }
    default:
      return { ignored: `unhandled event type ${event.type}` };
  }
}

// ---------------------------------------------------------------------------
// Razorpay
// ---------------------------------------------------------------------------
function razorpaySubscriptionPatch(sub: Record<string, unknown>): SubscriptionPatch {
  const notes = rec(sub.notes);
  return {
    provider: "razorpay",
    providerSubscriptionId: String(sub.id),
    workspaceId: str(notes.workspaceId),
    plan: asPlan(notes.plan),
    interval: asInterval(notes.interval),
    currency: "INR",
    status: mapRazorpayStatus(sub.status),
    providerCustomerId: str(sub.customer_id) ?? null,
    currentPeriodStart: unix(sub.current_start),
    currentPeriodEnd: unix(sub.current_end),
    cancelAtPeriodEnd: sub.status === "active" && Boolean(sub.has_scheduled_changes) ? true : sub.status === "cancelled" ? false : undefined,
    canceledAt: unix(sub.ended_at),
  };
}

export function razorpayTransition(body: { event: string; payload?: Record<string, unknown> }): Transition {
  const payload = rec(body.payload);
  const sub = rec(rec(payload.subscription).entity);
  const payment = rec(rec(payload.payment).entity);
  switch (body.event) {
    case "subscription.authenticated":
    case "subscription.activated":
    case "subscription.updated":
    case "subscription.pending":
    case "subscription.resumed": {
      if (!sub.id) return { ignored: "missing subscription entity" };
      return { subscription: razorpaySubscriptionPatch(sub) };
    }
    case "subscription.charged": {
      if (!sub.id) return { ignored: "missing subscription entity" };
      const patch = razorpaySubscriptionPatch(sub);
      patch.status = "active";
      if (typeof payment.amount === "number") patch.amountMinor = payment.amount;
      const invoice: InvoiceRecord | undefined = payment.id
        ? {
            provider: "razorpay",
            providerInvoiceId: String(payment.id),
            providerSubscriptionId: String(sub.id),
            workspaceId: patch.workspaceId,
            amountMinor: typeof payment.amount === "number" ? payment.amount : 0,
            currency: asCurrency(payment.currency) ?? "INR",
            status: "paid",
            hostedUrl: str(sub.short_url) ?? null,
            periodStart: patch.currentPeriodStart ?? null,
            periodEnd: patch.currentPeriodEnd ?? null,
          }
        : undefined;
      return { subscription: patch, invoice };
    }
    case "subscription.halted": {
      if (!sub.id) return { ignored: "missing subscription entity" };
      const patch = razorpaySubscriptionPatch(sub);
      patch.status = "past_due";
      return { subscription: patch };
    }
    case "subscription.cancelled":
    case "subscription.completed":
    case "subscription.expired": {
      if (!sub.id) return { ignored: "missing subscription entity" };
      const patch = razorpaySubscriptionPatch(sub);
      patch.status = "canceled";
      patch.cancelAtPeriodEnd = false;
      patch.canceledAt = patch.canceledAt ?? new Date();
      return { subscription: patch };
    }
    case "payment.failed": {
      const subId = str(sub.id) ?? str(rec(payment.notes).subscriptionId) ?? null;
      if (!payment.id) return { ignored: "missing payment entity" };
      const invoice: InvoiceRecord = {
        provider: "razorpay",
        providerInvoiceId: String(payment.id),
        providerSubscriptionId: subId,
        workspaceId: str(rec(payment.notes).workspaceId),
        amountMinor: typeof payment.amount === "number" ? payment.amount : 0,
        currency: asCurrency(payment.currency) ?? "INR",
        status: "failed",
        hostedUrl: null,
        periodStart: null,
        periodEnd: null,
      };
      return { invoice, subscriptionStatusFromInvoice: "past_due" };
    }
    default:
      return { ignored: `unhandled event ${body.event}` };
  }
}
