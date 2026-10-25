import { routeMetadata } from "@/lib/seo";
import { Section, SectionHeader } from "@/components/marketing/section";
import { PricingTable } from "@/components/marketing/pricing-table";
import { LimitsTable } from "@/components/marketing/limits-table";
import { CTABand } from "@/components/marketing/cta-band";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { PageTitle } from "@/components/marketing/backdrop";

export const metadata = routeMetadata("/pricing/compare-plans");

export default function ComparePlansPage() {
  return (
    <>
      <section>
        <div className="container-x py-12 sm:py-16">
          <Breadcrumbs items={[{ name: "Pricing", path: "/pricing" }, { name: "Compare plans", path: "/pricing/compare-plans" }]} />
          <PageTitle className="mt-6">Compare plans</PageTitle>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Every limit and feature, side by side, straight from the plan configuration.</p>
        </div>
      </section>
      <Section className="py-12">
        <PricingTable compact />
      </Section>
      <Section tone="surface">
        <SectionHeader title="Limits and features" />
        <LimitsTable full className="mt-8" />
      </Section>
      <CTABand secondary={{ label: "Contact sales", href: "/contact-sales" }} />
    </>
  );
}
