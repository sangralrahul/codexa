import { routeMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/marketing/page-header";
import { Section, SectionHeader } from "@/components/marketing/section";
import { PricingTable } from "@/components/marketing/pricing-table";
import { LimitsTable } from "@/components/marketing/limits-table";
import { CTABand } from "@/components/marketing/cta-band";

export const metadata = routeMetadata("/pricing/compare-plans");

export default function ComparePlansPage() {
  return (
    <div data-tone="pricing">
      <PageHeader
        variant="pricing"
        crumbs={[
          { name: "Pricing", path: "/pricing" },
          { name: "Compare plans", path: "/pricing/compare-plans" },
        ]}
        kicker="Compare plans"
        headline="Every limit, side by side."
        mark="side by side."
        lede="Every limit and feature, straight from the plan configuration the server enforces. Nothing on this page is typed in by hand."
      >
        <PricingTable compact />
      </PageHeader>
      <Section size="sm">
        <SectionHeader index="01" eyebrow="The full table" title="Limits and features." description="Groups collapse. On a phone the plan column stays pinned while the table scrolls sideways." />
        <LimitsTable full className="mt-10" />
      </Section>
      <CTABand variant="sales" tone="pricing" />
    </div>
  );
}
