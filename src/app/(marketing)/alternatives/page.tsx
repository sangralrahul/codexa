import { routeMetadata } from "@/lib/seo";
import { ALTERNATIVES_FAQ } from "@/content/marketing/product";
import { ALTERNATIVES_INTRO, ALTERNATIVES_TABLE, ALTERNATIVES_TRADEOFFS } from "@/content/marketing/features";
import { PageHeader } from "@/components/marketing/page-header";
import { Section, SectionHeader } from "@/components/marketing/section";
import { ComparisonTable } from "@/components/marketing/comparison-table";
import { LandingSections } from "@/components/marketing/content-blocks";
import { FAQ } from "@/components/marketing/faq";
import { CTABand } from "@/components/marketing/cta-band";
import { Inline } from "@/components/marketing/inline";

export const metadata = routeMetadata("/alternatives");

export default function AlternativesPage() {
  return (
    <div data-tone="product">
      <PageHeader
        variant="editorial"
        crumbs={[{ name: "Alternatives", path: "/alternatives" }]}
        kicker="Alternatives"
        headline="Compared by approach, not brand."
        mark="not brand."
        lede="Three common ways to get AI help building software, and where Codexa sits between them. We do not restate other vendors' claims; they change faster than we could keep up."
        meta={[
          { label: "Approaches", value: `${ALTERNATIVES_TABLE.columns.length - 1} categories` },
          { label: "Named vendors", value: "None, on purpose" },
          { label: "Codexa column", value: "What ships today" },
        ]}
      />
      <Section size="sm">
        <p data-reveal className="text-display-4 max-w-4xl text-pretty text-foreground/90">
          <Inline text={ALTERNATIVES_INTRO} />
        </p>
      </Section>
      <Section size="sm" className="border-t border-border/60">
        <SectionHeader index="01" eyebrow="Side by side" title="Approach comparison." description="Ratings describe the typical product in each category, not any specific one. Codexa's column describes what is implemented today." />
        <ComparisonTable caption="Comparison of Codexa with hosted AI builders, IDE assistants, and no-code tools" columns={ALTERNATIVES_TABLE.columns} groups={ALTERNATIVES_TABLE.groups} highlightColumn={0} collapsible className="mt-10" />
      </Section>
      <Section size="sm" className="border-t border-border/60">
        <SectionHeader index="02" eyebrow="Trade-offs" title="What we gave up, and why." className="mb-14" />
        <LandingSections sections={ALTERNATIVES_TRADEOFFS} />
      </Section>
      <Section size="sm" className="border-t border-border/60">
        <div className="grid gap-10 lg:grid-cols-[5fr_7fr] lg:gap-14">
          <SectionHeader index="03" eyebrow="FAQ" title="Questions, answered." />
          <FAQ items={ALTERNATIVES_FAQ} />
        </div>
      </Section>
      <CTABand variant="prompt" title="Judge it on your own project." />
    </div>
  );
}
