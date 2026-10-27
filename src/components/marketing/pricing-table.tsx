import { PLANS, PLAN_ORDER } from "@/config/plans";
import { logShare } from "@/content/marketing/plan-finder";
import { planCta } from "@/content/marketing/pricing";
import { PricingTableClient, type PricingPlanView } from "./pricing-table-client";

/** Server wrapper: reads PLANS once and hands a serializable view (prices, limits, meter shares) to the client toggles. */
export function PricingTable({ compact = false, planIds = PLAN_ORDER, finder = false }: { compact?: boolean; planIds?: (typeof PLAN_ORDER)[number][]; finder?: boolean }) {
  const plans: PricingPlanView[] = planIds.map((id) => {
    const p = PLANS[id];
    const l = p.limits;
    return {
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      audience: p.audience,
      prices: p.prices,
      features: p.features,
      cta: planCta(p.id),
      highlight: Boolean(p.highlight),
      limits: { aiRequests: l.aiRequestsPerMonth, previewMinutes: l.runtimeMinutesPerMonth, members: l.members },
      meters: [
        { label: "AI requests / month", value: l.aiRequestsPerMonth, share: logShare(l.aiRequestsPerMonth, (x) => x.limits.aiRequestsPerMonth) },
        { label: "Preview hours / month", value: l.runtimeMinutesPerMonth < 0 ? -1 : l.runtimeMinutesPerMonth / 60, share: logShare(l.runtimeMinutesPerMonth, (x) => x.limits.runtimeMinutesPerMonth) },
        { label: "Deployments / month", value: l.deploymentsPerMonth, share: logShare(l.deploymentsPerMonth, (x) => x.limits.deploymentsPerMonth) },
        { label: "Projects", value: l.projects, share: logShare(l.projects, (x) => x.limits.projects) },
      ],
    };
  });
  return <PricingTableClient plans={plans} compact={compact} finder={finder} />;
}
