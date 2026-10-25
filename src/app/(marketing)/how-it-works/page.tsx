import { routeMetadata } from "@/lib/seo";
import { HOW_IT_WORKS_STEPS, AI_KEY_LIMIT } from "@/content/marketing/product";
import { HOW_IT_WORKS_DETAIL, HOW_IT_WORKS_FAQ } from "@/content/marketing/features";
import { Hero } from "@/components/marketing/hero";
import { Section, SectionHeader } from "@/components/marketing/section";
import { Steps } from "@/components/marketing/steps";
import { ContentSections } from "@/components/marketing/content-blocks";
import { FAQ } from "@/components/marketing/faq";
import { CTABand } from "@/components/marketing/cta-band";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { ProductScreenshot } from "@/components/marketing/product-screenshot";
import { Alert } from "@/components/ui/misc";

export const metadata = routeMetadata("/how-it-works");

export default function HowItWorksPage() {
  return (
    <>
      <Hero
        eyebrow="How it works"
        title="From a prompt to a deployed application, step by step."
        subtitle="Codexa runs a bounded loop: plan, generate, validate, run, ship. Every step is visible, every change is snapshotted, and every run can be reverted."
        primary={{ label: "Start Building Free", href: "/signup" }}
        secondary={{ label: "Read the docs", href: "/docs" }}
      >
        <Breadcrumbs items={[{ name: "How it works", path: "/how-it-works" }]} className="[&_ol]:justify-center" />
      </Hero>
      <Section>
        <Steps steps={HOW_IT_WORKS_STEPS} />
        <Alert variant="info" title="Requires an AI provider" className="mt-8 max-w-3xl">
          {AI_KEY_LIMIT}
        </Alert>
      </Section>
      <Section tone="surface">
        <SectionHeader title="What you see while it runs" align="center" />
        <ProductScreenshot className="mt-10" />
      </Section>
      <Section>
        <div className="max-w-3xl space-y-10">
          <ContentSections sections={HOW_IT_WORKS_DETAIL} />
        </div>
      </Section>
      <Section tone="surface">
        <SectionHeader title="Frequently asked questions" />
        <FAQ items={HOW_IT_WORKS_FAQ} className="mt-8 max-w-3xl" />
      </Section>
      <CTABand />
    </>
  );
}
