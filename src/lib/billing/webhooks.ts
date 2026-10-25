/**
 * Webhook application layer shared by Stripe and Razorpay:
 *   1. insert into webhook_events (unique provider+eventId) — duplicates are acknowledged without re-processing
 *   2. apply the transition (upsert subscription by provider subscription id, record invoice, sync workspace plan)
 *   3. mark processedAt (or error)
 */
import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, subscriptions, webhookEvents, workspaces, type Plan } from "@/db/schema";
import { logger } from "@/lib/logger";
import { getPlanPrice } from "./plans";
import { effectivePlanFor, type BillingProvider, type InvoiceRecord, type SubscriptionPatch, type SubscriptionStatus, type Transition } from "./state";

export type WebhookOutcome = { duplicate: boolean; applied: boolean; ignored?: string; error?: string };

/** Insert the event; returns false when it was already recorded. */
export async function recordWebhookEvent(provider: BillingProvider, eventId: string, type: string, payload: unknown): Promise<boolean> {
  const inserted = await db
    .insert(webhookEvents)
    .values({ provider, eventId, type, payload })
    .onConflictDoNothing({ target: [webhookEvents.provider, webhookEvents.eventId] })
    .returning({ id: webhookEvents.id });
  return inserted.length > 0;
}

export async function markWebhookProcessed(provider: BillingProvider, eventId: string, error?: string) {
  await db
    .update(webhookEvents)
    .set({ processedAt: new Date(), error: error ?? null })
    .where(and(eq(webhookEvents.provider, provider), eq(webhookEvents.eventId, eventId)));
}

export async function findSubscriptionByProviderId(provider: BillingProvider, providerSubscriptionId: string) {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.provider, provider), eq(subscriptions.providerSubscriptionId, providerSubscriptionId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Latest subscription row for a workspace (any provider). */
export async function latestSubscription(workspaceId: string) {
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.workspaceId, workspaceId)).orderBy(desc(subscriptions.createdAt)).limit(1);
  return rows[0] ?? null;
}

/** Sync workspaces.plan to the effective plan of its latest subscription (free when none). */
export async function syncWorkspacePlan(workspaceId: string): Promise<Plan> {
  const sub = await latestSubscription(workspaceId);
  const plan = effectivePlanFor(sub ? { plan: sub.plan, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd } : null);
  await db.update(workspaces).set({ plan, updatedAt: new Date() }).where(eq(workspaces.id, workspaceId));
  return plan;
}

/** Insert or update a subscription row keyed by (provider, providerSubscriptionId). */
export async function upsertSubscription(patch: SubscriptionPatch) {
  const existing = await findSubscriptionByProviderId(patch.provider, patch.providerSubscriptionId);
  const workspaceId = patch.workspaceId ?? existing?.workspaceId;
  if (!workspaceId) {
    logger.warn("subscription event without workspace reference", { provider: patch.provider, subscription: patch.providerSubscriptionId });
    return null;
  }
  const set: Partial<typeof subscriptions.$inferInsert> = { updatedAt: new Date() };
  if (patch.plan) set.plan = patch.plan;
  if (patch.status) set.status = patch.status;
  if (patch.interval) set.interval = patch.interval;
  if (patch.currency) set.currency = patch.currency;
  if (patch.amountMinor !== undefined) set.amountMinor = patch.amountMinor;
  if (patch.providerCustomerId !== undefined && patch.providerCustomerId !== null) set.providerCustomerId = patch.providerCustomerId;
  if (patch.currentPeriodStart !== undefined && patch.currentPeriodStart !== null) set.currentPeriodStart = patch.currentPeriodStart;
  if (patch.currentPeriodEnd !== undefined && patch.currentPeriodEnd !== null) set.currentPeriodEnd = patch.currentPeriodEnd;
  if (patch.cancelAtPeriodEnd !== undefined) set.cancelAtPeriodEnd = patch.cancelAtPeriodEnd;
  if (patch.canceledAt !== undefined) set.canceledAt = patch.canceledAt;

  if (existing) {
    const [row] = await db.update(subscriptions).set(set).where(eq(subscriptions.id, existing.id)).returning();
    return row;
  }
  const plan = patch.plan ?? "pro";
  const interval = patch.interval ?? "month";
  const currency = patch.currency ?? (patch.provider === "razorpay" ? "INR" : "USD");
  const amountMinor = patch.amountMinor ?? getPlanPrice(plan, currency, interval)?.totalMinor ?? 0;
  const [row] = await db
    .insert(subscriptions)
    .values({
      workspaceId,
      plan,
      status: patch.status ?? "incomplete",
      provider: patch.provider,
      providerSubscriptionId: patch.providerSubscriptionId,
      providerCustomerId: patch.providerCustomerId ?? null,
      interval,
      currency,
      amountMinor,
      currentPeriodStart: patch.currentPeriodStart ?? null,
      currentPeriodEnd: patch.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: patch.cancelAtPeriodEnd ?? false,
      canceledAt: patch.canceledAt ?? null,
    })
    .onConflictDoUpdate({ target: [subscriptions.provider, subscriptions.providerSubscriptionId], set })
    .returning();
  return row;
}

export async function recordInvoice(inv: InvoiceRecord): Promise<{ workspaceId: string } | null> {
  let workspaceId = inv.workspaceId;
  if (!workspaceId && inv.providerSubscriptionId) {
    workspaceId = (await findSubscriptionByProviderId(inv.provider, inv.providerSubscriptionId))?.workspaceId;
  }
  if (!workspaceId) {
    logger.warn("invoice event without workspace reference", { provider: inv.provider, invoice: inv.providerInvoiceId });
    return null;
  }
  await db
    .insert(invoices)
    .values({
      workspaceId,
      provider: inv.provider,
      providerInvoiceId: inv.providerInvoiceId,
      amountMinor: inv.amountMinor,
      currency: inv.currency,
      status: inv.status,
      hostedUrl: inv.hostedUrl,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
    })
    .onConflictDoUpdate({
      target: [invoices.provider, invoices.providerInvoiceId],
      set: { status: inv.status, amountMinor: inv.amountMinor, hostedUrl: inv.hostedUrl, periodStart: inv.periodStart, periodEnd: inv.periodEnd },
    });
  return { workspaceId };
}

async function setSubscriptionStatus(provider: BillingProvider, providerSubscriptionId: string, status: SubscriptionStatus, periodEnd?: Date | null) {
  const rows = await db
    .update(subscriptions)
    .set({
      status,
      updatedAt: new Date(),
      ...(periodEnd ? { currentPeriodEnd: sql`greatest(coalesce(${subscriptions.currentPeriodEnd}, ${periodEnd}), ${periodEnd})` } : {}),
    })
    .where(and(eq(subscriptions.provider, provider), eq(subscriptions.providerSubscriptionId, providerSubscriptionId)))
    .returning({ workspaceId: subscriptions.workspaceId });
  return rows[0] ?? null;
}

/** Apply a transition to the database and sync the workspace plan. */
export async function applyTransition(t: Transition): Promise<{ applied: boolean; ignored?: string }> {
  if (t.ignored && !t.subscription && !t.invoice) return { applied: false, ignored: t.ignored };
  const touched = new Set<string>();
  if (t.subscription) {
    const row = await upsertSubscription(t.subscription);
    if (row) touched.add(row.workspaceId);
  }
  if (t.invoice) {
    const r = await recordInvoice(t.invoice);
    if (r) touched.add(r.workspaceId);
    if (t.subscriptionStatusFromInvoice && t.invoice.providerSubscriptionId) {
      const s = await setSubscriptionStatus(t.invoice.provider, t.invoice.providerSubscriptionId, t.subscriptionStatusFromInvoice, t.invoice.status === "paid" ? t.invoice.periodEnd : null);
      if (s) touched.add(s.workspaceId);
    }
  }
  for (const wsId of touched) await syncWorkspacePlan(wsId);
  return { applied: touched.size > 0, ignored: touched.size ? undefined : "no workspace matched" };
}

/** Full idempotent pipeline: record → apply → mark. Returns early on duplicates. */
export async function processWebhook(provider: BillingProvider, eventId: string, type: string, payload: unknown, transition: Transition): Promise<WebhookOutcome> {
  const fresh = await recordWebhookEvent(provider, eventId, type, payload);
  if (!fresh) return { duplicate: true, applied: false };
  try {
    const result = await applyTransition(transition);
    await markWebhookProcessed(provider, eventId, result.ignored);
    return { duplicate: false, applied: result.applied, ignored: result.ignored };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markWebhookProcessed(provider, eventId, message).catch(() => undefined);
    logger.error("webhook processing failed", { provider, eventId, type, error: message });
    return { duplicate: false, applied: false, error: message };
  }
}
