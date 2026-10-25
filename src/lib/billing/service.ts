/**
 * Workspace-facing billing operations used by the API routes and settings pages.
 */
import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, subscriptions, workspaces, type Currency, type Plan, type Subscription, type Workspace } from "@/db/schema";
import { capabilities } from "@/lib/env";
import { ApiError, badRequest, conflict } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getEffectivePlan } from "@/lib/services/usage";
import { PLANS } from "@/config/plans";
import { getPlanPrice, isPurchasable, type BillingInterval } from "./plans";
import { createStripeCheckout, createStripePortalSession, setStripeCancelAtPeriodEnd, billingNotConfigured } from "./stripe";
import { cancelRazorpaySubscription, createRazorpaySubscription, fetchRazorpaySubscription, verifyRazorpayPaymentSignature } from "./razorpay";
import { latestSubscription, syncWorkspacePlan, upsertSubscription } from "./webhooks";
import { grantsEntitlements } from "./state";

export type BillingProviders = { stripe: boolean; razorpay: boolean };
export function providerAvailability(): BillingProviders {
  return { stripe: capabilities.stripe, razorpay: capabilities.razorpay };
}

export function serializeSubscription(s: Subscription | null) {
  if (!s) return null;
  return {
    id: s.id,
    plan: s.plan,
    status: s.status,
    provider: s.provider,
    interval: s.interval,
    currency: s.currency,
    amountMinor: s.amountMinor,
    currentPeriodStart: s.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    canceledAt: s.canceledAt?.toISOString() ?? null,
    hasPortal: s.provider === "stripe" && Boolean(s.providerCustomerId),
    createdAt: s.createdAt.toISOString(),
  };
}
export type SerializedSubscription = NonNullable<ReturnType<typeof serializeSubscription>>;

export async function listInvoices(workspaceId: string, limit = 24) {
  const rows = await db.select().from(invoices).where(eq(invoices.workspaceId, workspaceId)).orderBy(desc(invoices.createdAt)).limit(limit);
  return rows.map((i) => ({
    id: i.id,
    provider: i.provider,
    providerInvoiceId: i.providerInvoiceId,
    amountMinor: i.amountMinor,
    currency: i.currency,
    status: i.status,
    hostedUrl: i.hostedUrl,
    periodStart: i.periodStart?.toISOString() ?? null,
    periodEnd: i.periodEnd?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
  }));
}
export type SerializedInvoice = Awaited<ReturnType<typeof listInvoices>>[number];

export async function getBillingOverview(workspace: Workspace) {
  const [sub, inv, effectivePlan] = await Promise.all([latestSubscription(workspace.id), listInvoices(workspace.id), getEffectivePlan(workspace)]);
  return {
    plan: effectivePlan,
    storedPlan: workspace.plan,
    currency: workspace.billingCurrency,
    subscription: serializeSubscription(sub),
    invoices: inv,
    providers: providerAvailability(),
  };
}
export type BillingOverview = Awaited<ReturnType<typeof getBillingOverview>>;

function providerForCurrency(currency: Currency): "stripe" | "razorpay" {
  return currency === "INR" ? "razorpay" : "stripe";
}

/**
 * Start a checkout. INR → Razorpay subscription (client opens Checkout.js), USD → Stripe Checkout (redirect).
 * Falls back to whichever provider is configured when the preferred one is not.
 */
export async function startCheckout(input: { workspace: Workspace; actorId: string; actorEmail: string; plan: Plan; interval: BillingInterval; currency: Currency }) {
  const { workspace, plan, interval } = input;
  if (!isPurchasable(plan)) throw badRequest("Choose Pro or Team. Enterprise plans are arranged through sales.");
  const providers = providerAvailability();
  if (!providers.stripe && !providers.razorpay) throw billingNotConfigured("Online");
  let currency = input.currency;
  let provider = providerForCurrency(currency);
  if (provider === "razorpay" && !providers.razorpay) {
    provider = "stripe";
  } else if (provider === "stripe" && !providers.stripe) {
    provider = "razorpay";
    currency = "INR";
  }
  const current = await latestSubscription(workspace.id);
  if (current && grantsEntitlements(current.status) && current.provider !== "manual" && !current.cancelAtPeriodEnd && current.plan === plan && current.interval === interval) {
    throw conflict("This workspace is already on that plan");
  }
  const quote = getPlanPrice(plan, currency, interval);
  if (!quote) throw badRequest("Price unavailable");

  if (workspace.billingCurrency !== currency) {
    await db.update(workspaces).set({ billingCurrency: currency, updatedAt: new Date() }).where(eq(workspaces.id, workspace.id));
  }
  await audit({ actorId: input.actorId, workspaceId: workspace.id, action: "billing.checkout_started", targetType: "workspace", targetId: workspace.id, metadata: { plan, interval, currency, provider } });

  if (provider === "stripe") {
    const { url, sessionId } = await createStripeCheckout({
      workspaceId: workspace.id,
      plan,
      interval,
      currency,
      customerEmail: input.actorEmail,
      customerId: current?.provider === "stripe" ? current.providerCustomerId : null,
    });
    return { provider: "stripe" as const, url, sessionId };
  }
  const order = await createRazorpaySubscription({ workspaceId: workspace.id, plan, interval, customerEmail: input.actorEmail });
  return {
    provider: "razorpay" as const,
    order: { ...order, plan, interval, currency: "INR" as const, amountMinor: quote.totalMinor, name: "Codexa", description: `Codexa ${PLANS[plan].name} (${interval})`, email: input.actorEmail },
  };
}

/** Razorpay return: verify the signature, then record the subscription as active pending webhook confirmation. */
export async function completeRazorpayCheckout(input: { workspace: Workspace; actorId: string; paymentId: string; subscriptionId: string; signature: string }) {
  if (!verifyRazorpayPaymentSignature({ paymentId: input.paymentId, subscriptionId: input.subscriptionId, signature: input.signature })) {
    throw new ApiError(400, "Payment signature could not be verified", "invalid_signature");
  }
  const remote = await fetchRazorpaySubscription(input.subscriptionId);
  if (remote.notes?.workspaceId && remote.notes.workspaceId !== input.workspace.id) throw new ApiError(403, "Subscription belongs to a different workspace", "forbidden");
  const plan = (remote.notes?.plan as Plan | undefined) ?? "pro";
  const interval = (remote.notes?.interval as BillingInterval | undefined) ?? "month";
  const quote = getPlanPrice(plan, "INR", interval);
  const row = await upsertSubscription({
    provider: "razorpay",
    providerSubscriptionId: input.subscriptionId,
    workspaceId: input.workspace.id,
    plan,
    interval,
    currency: "INR",
    amountMinor: quote?.totalMinor,
    status: "active",
    currentPeriodStart: remote.current_start ? new Date(remote.current_start * 1000) : new Date(),
    currentPeriodEnd: remote.current_end ? new Date(remote.current_end * 1000) : new Date(Date.now() + (interval === "year" ? 366 : 31) * 86400_000),
  });
  await syncWorkspacePlan(input.workspace.id);
  await audit({ actorId: input.actorId, workspaceId: input.workspace.id, action: "billing.subscription_activated", targetType: "subscription", targetId: row?.id, metadata: { provider: "razorpay", plan, interval } });
  return serializeSubscription(row);
}

export async function cancelSubscription(workspace: Workspace, actorId: string) {
  const sub = await latestSubscription(workspace.id);
  if (!sub || !grantsEntitlements(sub.status)) throw badRequest("There is no active subscription to cancel");
  if (sub.cancelAtPeriodEnd) throw conflict("This subscription is already scheduled to cancel at the end of the period");
  if (sub.provider === "stripe" && sub.providerSubscriptionId) await setStripeCancelAtPeriodEnd(sub.providerSubscriptionId, true);
  else if (sub.provider === "razorpay" && sub.providerSubscriptionId) await cancelRazorpaySubscription(sub.providerSubscriptionId, true);
  const [row] = await db.update(subscriptions).set({ cancelAtPeriodEnd: true, updatedAt: new Date() }).where(eq(subscriptions.id, sub.id)).returning();
  await audit({ actorId, workspaceId: workspace.id, action: "billing.cancel_scheduled", targetType: "subscription", targetId: sub.id, metadata: { provider: sub.provider, periodEnd: sub.currentPeriodEnd } });
  return serializeSubscription(row);
}

export async function resumeSubscription(workspace: Workspace, actorId: string) {
  const sub = await latestSubscription(workspace.id);
  if (!sub || !grantsEntitlements(sub.status) || !sub.cancelAtPeriodEnd) throw badRequest("There is no cancellation to undo");
  if (sub.provider === "razorpay") {
    throw badRequest("Razorpay subscriptions scheduled for cancellation cannot be resumed. Subscribe again after the current period ends.");
  }
  if (sub.provider === "stripe" && sub.providerSubscriptionId) await setStripeCancelAtPeriodEnd(sub.providerSubscriptionId, false);
  const [row] = await db.update(subscriptions).set({ cancelAtPeriodEnd: false, updatedAt: new Date() }).where(eq(subscriptions.id, sub.id)).returning();
  await audit({ actorId, workspaceId: workspace.id, action: "billing.cancel_reverted", targetType: "subscription", targetId: sub.id });
  return serializeSubscription(row);
}

export async function portalUrl(workspace: Workspace) {
  const sub = await latestSubscription(workspace.id);
  if (!sub || sub.provider !== "stripe" || !sub.providerCustomerId) throw badRequest("The billing portal is available for Stripe subscriptions only");
  return createStripePortalSession(sub.providerCustomerId);
}

/** Staff-only manual plan override: a `manual` subscription row that getEffectivePlan honours. */
export async function setManualPlan(input: { workspaceId: string; actorId: string; plan: Plan; periodEnd: Date | null; note?: string }) {
  const providerSubscriptionId = `manual:${input.workspaceId}`;
  const status = input.plan === "free" ? "canceled" : "active";
  const row = await upsertSubscription({
    provider: "manual",
    providerSubscriptionId,
    workspaceId: input.workspaceId,
    plan: input.plan,
    status,
    interval: "year",
    currency: "USD",
    amountMinor: 0,
    currentPeriodStart: new Date(),
    currentPeriodEnd: input.periodEnd,
    cancelAtPeriodEnd: false,
    canceledAt: status === "canceled" ? new Date() : null,
  });
  // Make the manual row the most recent one so getEffectivePlan picks it.
  if (row) await db.update(subscriptions).set({ createdAt: new Date() }).where(eq(subscriptions.id, row.id));
  const plan = await syncWorkspacePlan(input.workspaceId);
  await audit({ actorId: input.actorId, workspaceId: input.workspaceId, action: "billing.manual_override", targetType: "workspace", targetId: input.workspaceId, metadata: { plan: input.plan, periodEnd: input.periodEnd, note: input.note ?? "" } });
  return plan;
}

/** Workspace general settings (name, slug, billing currency). Owner/admin only — checked by the caller. */
export async function updateWorkspaceSettings(workspaceId: string, actorId: string, patch: { name?: string; slug?: string; billingCurrency?: Currency }) {
  const set: Partial<typeof workspaces.$inferInsert> = { updatedAt: new Date() };
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.billingCurrency !== undefined) set.billingCurrency = patch.billingCurrency;
  if (patch.slug !== undefined) {
    const taken = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, patch.slug)).limit(1);
    if (taken[0] && taken[0].id !== workspaceId) throw conflict("That slug is already in use");
    set.slug = patch.slug;
  }
  const [row] = await db.update(workspaces).set(set).where(eq(workspaces.id, workspaceId)).returning();
  await audit({ actorId, workspaceId, action: "workspace.settings_updated", targetType: "workspace", targetId: workspaceId, metadata: patch });
  return row;
}
