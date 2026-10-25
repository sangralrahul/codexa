import { routeMetadata } from "@/lib/seo";
import { FEATURE_GROUPS } from "@/content/marketing/features";
import { Hero } from "@/components/marketing/hero";
import { Section, SectionHeader } from "@/components/marketing/section";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { CTABand } from "@/components/marketing/cta-band";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Alert } from "@/components/ui/misc";

export const metadata = routeMetadata("/features");

export default function FeaturesPage() {
  return (
    <>
      <Hero
        eyebrow="Features"
        title="Everything in Codexa, grouped by what you are doing."
        subtitle="AI generation, editor, preview, databases, integrations, version history, collaboration, deployment, billing, and administration. Items marked as roadmap are not shipped yet."
        primary={{ label: "Start Building Free", href: "/signup" }}
        secondary={{ label: "Compare plans", href: "/pricing/compare-plans" }}
      >
        <Breadcrumbs items={[{ name: "Features", path: "/features" }]} className="[&_ol]:justify-center" />
      </Hero>
      {FEATURE_GROUPS.map((g, i) => (
        <Section key={g.id} id={g.id} tone={i % 2 === 1 ? "surface" : "default"} className="py-12 sm:py-16">
          <SectionHeader title={g.title} description={g.description} />
          <FeatureGrid features={g.features} className="mt-8" />
          {g.note ? (
            <Alert variant="info" className="mt-6 max-w-3xl">
              {g.note}
            </Alert>
          ) : null}
        </Section>
      ))}
      <CTABand />
    </>
  );
}
