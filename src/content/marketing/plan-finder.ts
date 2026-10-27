/**
 * Plan finder: pure functions over PLANS (no I/O, safe on the client). Given expected monthly
 * usage it returns the cheapest plan whose server-enforced limits cover it, plus the reason the
 * cheaper plans do not. Prices and limits come only from src/config/plans.ts.
 */
import { PLANS, PLAN_ORDER, isUnlimited, type PlanDefinition } from "@/config/plans";
import type { Currency, Plan } from "@/db/schema";

export type Usage = {
  /** AI requests (generation runs) a month. */
  aiRequests: number;
  /** Preview runtime, hours a month. */
  previewHours: number;
  /** Workspace members. */
  members: number;
};

export type UsageKey = keyof Usage;

const within = (limit: number, need: number) => isUnlimited(limit) || need <= limit;

/** The limits a plan would refuse for this usage (empty = it fits). */
export function shortfalls(plan: PlanDefinition, u: Usage): UsageKey[] {
  const l = plan.limits;
  const out: UsageKey[] = [];
  if (!within(l.aiRequestsPerMonth, u.aiRequests)) out.push("aiRequests");
  if (!within(l.runtimeMinutesPerMonth, u.previewHours * 60)) out.push("previewHours");
  if (!within(l.members, u.members)) out.push("members");
  return out;
}

export function fits(plan: PlanDefinition, u: Usage): boolean {
  return shortfalls(plan, u).length === 0;
}

/** Monthly list price in minor units; contact-sales plans sort last. */
function monthly(plan: PlanDefinition, currency: Currency): number {
  return plan.prices ? plan.prices[currency].month : Number.POSITIVE_INFINITY;
}

/** Plans ordered from cheapest to most expensive (ties keep PLAN_ORDER). */
export function plansByPrice(currency: Currency = "USD"): Plan[] {
  return [...PLAN_ORDER].sort((a, b) => monthly(PLANS[a], currency) - monthly(PLANS[b], currency) || PLAN_ORDER.indexOf(a) - PLAN_ORDER.indexOf(b));
}

/** The cheapest plan that covers `usage`. Enterprise has custom (unlimited) limits, so something always fits. */
export function findPlan(usage: Usage, currency: Currency = "USD"): Plan {
  return plansByPrice(currency).find((p) => fits(PLANS[p], usage)) ?? PLAN_ORDER[PLAN_ORDER.length - 1];
}

/** For the result line: what rules out each cheaper plan. */
export function explainPlan(usage: Usage, currency: Currency = "USD"): { plan: Plan; ruledOut: { plan: Plan; by: UsageKey[] }[] } {
  const plan = findPlan(usage, currency);
  const order = plansByPrice(currency);
  const ruledOut = order.slice(0, order.indexOf(plan)).map((p) => ({ plan: p, by: shortfalls(PLANS[p], usage) }));
  return { plan, ruledOut };
}

/** Slider ranges derived from the largest finite limit on any plan (a little past it, so Enterprise is reachable). */
function rangeFor(pick: (p: PlanDefinition) => number, scale = 1) {
  const finite = PLAN_ORDER.map((id) => pick(PLANS[id])).filter((n) => !isUnlimited(n));
  const top = Math.max(...finite) / scale;
  return { min: 0, max: Math.ceil((top * 1.2) / 10) * 10 };
}

export const FINDER_RANGES: Record<UsageKey, { min: number; max: number; step: number }> = {
  aiRequests: { ...rangeFor((p) => p.limits.aiRequestsPerMonth), step: 10 },
  previewHours: { ...rangeFor((p) => p.limits.runtimeMinutesPerMonth, 60), step: 5 },
  members: { min: 1, max: Math.max(...PLAN_ORDER.map((id) => PLANS[id].limits.members).filter((n) => !isUnlimited(n))) + 5, step: 1 },
};

export const DEFAULT_USAGE: Usage = { aiRequests: 200, previewHours: 20, members: 1 };

/** The largest annual discount across paid plans in a currency, rounded down (never overstated). */
export function maxAnnualSavingPercent(currency: Currency): number {
  let best = 0;
  for (const id of PLAN_ORDER) {
    const p = PLANS[id].prices?.[currency];
    if (!p || p.month <= 0) continue;
    best = Math.max(best, 1 - p.year / p.month);
  }
  // Round away float noise (1 - 0.8 = 0.19999…) before flooring, so 20% reads 20, never 19 or 21.
  return Math.floor(Math.round(best * 10_000) / 100);
}

/** Position on a log scale (0–1) of a limit against the largest finite value of the same limit. Unlimited = 1. */
export function logShare(value: number, pick: (p: PlanDefinition) => number): number {
  if (isUnlimited(value)) return 1;
  const finite = PLAN_ORDER.map((id) => pick(PLANS[id])).filter((n) => !isUnlimited(n));
  const top = Math.max(...finite);
  if (top <= 0) return 0;
  return Math.max(0.04, Math.log10(1 + value) / Math.log10(1 + top));
}
