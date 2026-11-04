import { routeMetadata } from "@/lib/seo";
import { PricingTable } from "@/components/marketing/pricing-table";
import { LimitsTable } from "@/components/marketing/limits-table";
import { CTABand } from "@/components/marketing/cta-band";
import { GridFrame, GridRow, PageHero, RowHead } from "@/components/marketing/page-grid";

export const metadata = routeMetadata("/pricing/compare-plans");

export default function ComparePlansPage() {
  return (
    <div data-tone="pricing" className="relative overflow-x-clip">
      <PageHero
        crumbs={[
          { name: "Pricing", path: "/pricing" },
          { name: "Compare plans", path: "/pricing/compare-plans" },
        ]}
        eyebrow="Compare plans"
        title="Every limit,"
        dim="side by side."
        lede="Every limit and feature, straight from the plan configuration the server enforces. Nothing on this page is typed in by hand."
        align="center"
      />
      <GridFrame>
        <GridRow aria-labelledby="plans-title" crosshairs={false}>
          <h2 id="plans-title" className="sr-only">
            Plans
          </h2>
          <PricingTable compact />
        </GridRow>
        <GridRow aria-labelledby="table-title">
          <RowHead id="table-title" index="01" label="The full table" title="Limits" dim="and features.">
            <p>Monthly limits reset on the first of each month (UTC). Anything not shipped yet is marked Roadmap.</p>
          </RowHead>
          <div className="border-t border-border">
            <LimitsTable full />
          </div>
        </GridRow>
      </GridFrame>
      <CTABand variant="sales" tone="pricing" secondary={{ label: "See pricing", href: "/pricing" }} />
    </div>
  );
}
