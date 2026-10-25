import { PLANS, PLAN_ORDER } from "@/config/plans";
import { PricingTableClient, type PricingPlanView } from "./pricing-table-client";

/** Server wrapper: reads PLANS once and hands a serializable view to the client toggles. */
export function PricingTable({ compact = false, planIds = PLAN_ORDER }: { compact?: boolean; planIds?: (typeof PLAN_ORDER)[number][] }) {
  const plans: PricingPlanView[] = planIds.map((id) => {
    const p = PLANS[id];
    return {
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      audience: p.audience,
      prices: p.prices,
      features: p.features,
      cta: p.cta,
      highlight: Boolean(p.highlight),
    };
  });
  return <PricingTableClient plans={plans} compact={compact} />;
}
