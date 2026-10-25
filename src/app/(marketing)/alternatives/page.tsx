import { routeMetadata } from "@/lib/seo";
import { ALTERNATIVES_FAQ } from "@/content/marketing/product";
import { ALTERNATIVES_INTRO, ALTERNATIVES_TABLE, ALTERNATIVES_TRADEOFFS } from "@/content/marketing/features";
import { Hero } from "@/components/marketing/hero";
import { Section, SectionHeader } from "@/components/marketing/section";
import { ComparisonTable } from "@/components/marketing/comparison-table";
import { ContentSections } from "@/components/marketing/content-blocks";
import { FAQ } from "@/components/marketing/faq";
import { CTABand } from "@/components/marketing/cta-band";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Inline } from "@/components/marketing/inline";

export const metadata = routeMetadata("/alternatives");

export default function AlternativesPage() {
  return (
    <>
      <Hero
        eyebrow="Alternatives"
        title="How Codexa compares, by category rather than by brand."
        subtitle="We describe three common approaches to AI-assisted development and where Codexa sits between them. We do not restate other vendors' claims, because they change faster than we can keep up."
        primary={{ label: "Start Building Free", href: "/signup" }}
        secondary={{ label: "See features", href: "/features" }}
      >
        <Breadcrumbs items={[{ name: "Alternatives", path: "/alternatives" }]} className="[&_ol]:justify-center" />
      </Hero>
      <Section className="py-10 sm:py-12">
        <p className="mx-auto max-w-3xl text-center text-lg leading-relaxed text-foreground/90">
          <Inline text={ALTERNATIVES_INTRO} />
        </p>
      </Section>
      <Section tone="surface">
        <SectionHeader title="Approach comparison" description="Ratings describe the typical product in each category, not any specific one. Codexa's column describes what is implemented today." />
        <ComparisonTable caption="Comparison of Codexa with hosted AI builders, IDE assistants, and no-code tools" columns={ALTERNATIVES_TABLE.columns} groups={ALTERNATIVES_TABLE.groups} highlightColumn={0} className="mt-8" />
      </Section>
      <Section>
        <div className="max-w-3xl space-y-10">
          <ContentSections sections={ALTERNATIVES_TRADEOFFS} />
        </div>
      </Section>
      <Section tone="surface">
        <SectionHeader title="Frequently asked questions" />
        <FAQ items={ALTERNATIVES_FAQ} className="mt-8 max-w-3xl" />
      </Section>
      <CTABand />
    </>
  );
}
