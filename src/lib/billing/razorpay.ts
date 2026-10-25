import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { env, capabilities } from "@/lib/env";
import { ApiError } from "@/lib/api";
import { logger } from "@/lib/logger";
import { getPlanPrice, providerPlanKey, stripeProductName, type BillingInterval } from "./plans";
import { billingNotConfigured } from "./stripe";
import type { Plan } from "@/db/schema";

const API = "https://api.razorpay.com/v1";

function authHeader() {
  if (!capabilities.razorpay) throw billingNotConfigured("Razorpay");
  return "Basic " + Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
}

async function rp<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { description?: string; code?: string } };
  if (!res.ok) {
    logger.warn("razorpay api error", { path, status: res.status, code: data.error?.code });
    throw new ApiError(502, `Razorpay error: ${data.error?.description ?? res.status}`, "provider_error");
  }
  return data;
}

type RazorpayPlan = { id: string; notes?: Record<string, string> };
type RazorpaySubscription = { id: string; status: string; short_url?: string; current_start?: number; current_end?: number };

const planCache = new Map<string, string>();

/**
 * Find or create the Razorpay plan object for (plan, interval, INR).
 * Lookup order: process cache → workspace.settings.razorpayPlans → list by notes → create.
 */
export async function ensureRazorpayPlan(workspaceId: string, plan: Plan, interval: BillingInterval): Promise<string> {
  const key = providerPlanKey(plan, interval, "INR");
  const cached = planCache.get(key);
  if (cached) return cached;

  const [ws] = await db.select({ settings: workspaces.settings }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const stored = (ws?.settings?.razorpayPlans as Record<string, string> | undefined)?.[key];
  if (stored) {
    planCache.set(key, stored);
    return stored;
  }

  const quote = getPlanPrice(plan, "INR", interval);
  if (!quote || quote.totalMinor <= 0) throw new ApiError(400, "This plan cannot be purchased online", "bad_request");

  let planId: string | undefined;
  const list = await rp<{ items: RazorpayPlan[] }>("/plans?count=100");
  planId = list.items.find((p) => p.notes?.codexaKey === key)?.id;
  if (!planId) {
    const created = await rp<RazorpayPlan>("/plans", {
      method: "POST",
      body: {
        period: interval === "year" ? "yearly" : "monthly",
        interval: 1,
        item: { name: stripeProductName(plan, interval), amount: quote.totalMinor, currency: "INR", description: `Codexa ${plan} plan billed ${interval}ly` },
        notes: { codexaKey: key, plan, interval },
      },
    });
    planId = created.id;
  }
  planCache.set(key, planId);
  await db
    .update(workspaces)
    .set({ settings: { ...(ws?.settings ?? {}), razorpayPlans: { ...((ws?.settings?.razorpayPlans as Record<string, string>) ?? {}), [key]: planId } } })
    .where(eq(workspaces.id, workspaceId));
  return planId;
}

/** Create a subscription and return what Razorpay Checkout.js needs on the client. */
export async function createRazorpaySubscription(input: { workspaceId: string; plan: Plan; interval: BillingInterval; customerEmail: string }) {
  const planId = await ensureRazorpayPlan(input.workspaceId, input.plan, input.interval);
  const sub = await rp<RazorpaySubscription>("/subscriptions", {
    method: "POST",
    body: {
      plan_id: planId,
      total_count: input.interval === "year" ? 10 : 120,
      quantity: 1,
      customer_notify: 1,
      notes: { workspaceId: input.workspaceId, plan: input.plan, interval: input.interval, email: input.customerEmail },
    },
  });
  return { subscriptionId: sub.id, keyId: env.RAZORPAY_KEY_ID as string, shortUrl: sub.short_url ?? null };
}

export async function cancelRazorpaySubscription(subscriptionId: string, atCycleEnd = true) {
  return rp<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, { method: "POST", body: { cancel_at_cycle_end: atCycleEnd ? 1 : 0 } });
}

export async function fetchRazorpaySubscription(subscriptionId: string) {
  return rp<RazorpaySubscription & { notes?: Record<string, string>; plan_id: string }>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

function hmacHex(secret: string, data: string) {
  return createHmac("sha256", secret).update(data).digest("hex");
}
function safeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Checkout return: hmac_sha256(payment_id + "|" + subscription_id, key_secret). Pure, injectable secret for tests. */
export function verifyRazorpayPaymentSignature(input: { paymentId: string; subscriptionId: string; signature: string }, secret: string = env.RAZORPAY_KEY_SECRET ?? ""): boolean {
  if (!secret || !input.signature) return false;
  return safeEq(hmacHex(secret, `${input.paymentId}|${input.subscriptionId}`), input.signature.toLowerCase());
}

/** Webhook: hmac_sha256(raw body, webhook secret) compared with X-Razorpay-Signature. */
export function verifyRazorpayWebhookSignature(rawBody: string, signature: string | null, secret: string | undefined = env.RAZORPAY_WEBHOOK_SECRET): boolean {
  if (!secret || !signature) return false;
  return safeEq(hmacHex(secret, rawBody), signature.toLowerCase());
}
