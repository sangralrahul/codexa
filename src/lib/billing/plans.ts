/**
 * Plan catalog helpers over the central PLANS config.
 * Prices in PLANS are minor units (paise/cents) PER MONTH; annual plans are
 * displayed per month but billed once per year (12 × monthly-equivalent).
 */
import { PLANS, PLAN_ORDER, isUnlimited, formatPrice, type PlanDefinition } from "@/config/plans";
import type { Currency, Plan } from "@/db/schema";

export type BillingInterval = "month" | "year";
export const BILLING_INTERVALS: BillingInterval[] = ["month", "year"];
export const CURRENCIES: Currency[] = ["USD", "INR"];

export type PlanPriceQuote = {
  plan: Plan;
  currency: Currency;
  interval: BillingInterval;
  /** Displayed per-month amount in minor units. */
  perMonthMinor: number;
  /** Amount actually charged per billing period in minor units (monthly: ×1, yearly: ×12). */
  totalMinor: number;
  /** Savings vs paying monthly for a year, in minor units (0 for monthly). */
  savingsMinor: number;
};

export function isPurchasable(plan: Plan): boolean {
  return PLANS[plan].prices !== null && plan !== "free";
}

export function getPlanPrice(plan: Plan, currency: Currency, interval: BillingInterval): PlanPriceQuote | null {
  const def = PLANS[plan];
  if (!def.prices) return null;
  const perMonthMinor = def.prices[currency][interval];
  const totalMinor = interval === "year" ? perMonthMinor * 12 : perMonthMinor;
  const monthlyForYear = def.prices[currency].month * 12;
  const savingsMinor = interval === "year" ? Math.max(0, monthlyForYear - totalMinor) : 0;
  return { plan, currency, interval, perMonthMinor, totalMinor, savingsMinor };
}

export function formatQuote(q: PlanPriceQuote): { perMonth: string; total: string; savings: string | null } {
  return {
    perMonth: formatPrice(q.perMonthMinor, q.currency),
    total: formatPrice(q.totalMinor, q.currency),
    savings: q.savingsMinor > 0 ? formatPrice(q.savingsMinor, q.currency) : null,
  };
}

export function comparePlans(a: Plan, b: Plan): number {
  return PLAN_ORDER.indexOf(a) - PLAN_ORDER.indexOf(b);
}

export function isUpgrade(from: Plan, to: Plan): boolean {
  return comparePlans(to, from) > 0;
}

export function listPurchasablePlans(): PlanDefinition[] {
  return PLAN_ORDER.filter(isPurchasable).map((p) => PLANS[p]);
}

/** Human readable limit (e.g. "Unlimited" or "1,000"). */
export function formatLimit(n: number, unit?: string): string {
  if (isUnlimited(n)) return "Unlimited";
  const s = n.toLocaleString("en-US");
  return unit ? `${s} ${unit}` : s;
}

/** Stripe product name for a plan + interval. */
export function stripeProductName(plan: Plan, interval: BillingInterval): string {
  return `Codexa ${PLANS[plan].name} (${interval === "year" ? "annual" : "monthly"})`;
}

/** Stable key used to look up/cached provider-side plan objects (Razorpay). */
export function providerPlanKey(plan: Plan, interval: BillingInterval, currency: Currency): string {
  return `${plan}:${interval}:${currency}`;
}
