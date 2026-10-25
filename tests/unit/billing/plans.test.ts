import { describe, expect, it } from "vitest";
import { PLANS } from "@/config/plans";
import { comparePlans, formatLimit, formatQuote, getPlanPrice, isPurchasable, isUpgrade, listPurchasablePlans, providerPlanKey, stripeProductName } from "@/lib/billing/plans";

describe("plan price math", () => {
  it("monthly quotes charge the per-month amount", () => {
    const q = getPlanPrice("pro", "USD", "month");
    expect(q).toEqual({ plan: "pro", currency: "USD", interval: "month", perMonthMinor: 2000, totalMinor: 2000, savingsMinor: 0 });
  });

  it("annual quotes are displayed per month but billed 12x yearly, with savings vs monthly", () => {
    const q = getPlanPrice("pro", "USD", "year")!;
    expect(q.perMonthMinor).toBe(PLANS.pro.prices!.USD.year);
    expect(q.totalMinor).toBe(PLANS.pro.prices!.USD.year * 12);
    expect(q.savingsMinor).toBe(PLANS.pro.prices!.USD.month * 12 - PLANS.pro.prices!.USD.year * 12);
    expect(q.savingsMinor).toBeGreaterThan(0);
  });

  it("INR quotes use paise and the Team plan", () => {
    const q = getPlanPrice("team", "INR", "year")!;
    expect(q.totalMinor).toBe(329900 * 12);
    const f = formatQuote(q);
    expect(f.perMonth).toContain("3,299");
    expect(f.savings).not.toBeNull();
  });

  it("enterprise has no online price; free is not purchasable", () => {
    expect(getPlanPrice("enterprise", "USD", "month")).toBeNull();
    expect(isPurchasable("free")).toBe(false);
    expect(isPurchasable("enterprise")).toBe(false);
    expect(listPurchasablePlans().map((p) => p.id)).toEqual(["pro", "team"]);
  });

  it("orders plans and detects upgrades", () => {
    expect(comparePlans("free", "team")).toBeLessThan(0);
    expect(isUpgrade("free", "pro")).toBe(true);
    expect(isUpgrade("team", "pro")).toBe(false);
    expect(isUpgrade("pro", "pro")).toBe(false);
  });

  it("formats limits and provider keys", () => {
    expect(formatLimit(-1)).toBe("Unlimited");
    expect(formatLimit(1000, "requests")).toBe("1,000 requests");
    expect(stripeProductName("pro", "year")).toBe("Codexa Pro (annual)");
    expect(providerPlanKey("team", "month", "INR")).toBe("team:month:INR");
  });
});
