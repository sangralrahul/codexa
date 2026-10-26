import * as React from "react";
import { routeMetadata } from "@/lib/seo";
import { HOW_IT_WORKS_STEPS, AI_KEY_LIMIT } from "@/content/marketing/product";
import { HOW_IT_WORKS_DETAIL, HOW_IT_WORKS_FAQ } from "@/content/marketing/features";
import { PageHeader } from "@/components/marketing/page-header";
import { Section, SectionHeader } from "@/components/marketing/section";
import { LandingSections } from "@/components/marketing/content-blocks";
import { FAQ } from "@/components/marketing/faq";
import { CTABand } from "@/components/marketing/cta-band";
import { Inline } from "@/components/marketing/inline";
import { StoryScroll } from "@/components/marketing/story-scroll";
import { VignetteWindow, storyStages } from "@/components/marketing/vignette-window";
import { Alert } from "@/components/ui/misc";

export const metadata = routeMetadata("/how-it-works");

export default function HowItWorksPage() {
  const stages = storyStages(HOW_IT_WORKS_STEPS.map((s) => s.visual ?? "agent-run"));
  return (
    <div data-tone="product">
      <PageHeader
        variant="product"
        crumbs={[{ name: "How it works", path: "/how-it-works" }]}
        kicker="How it works"
        headline="Prompt to production, step by step."
        mark="step by step."
        lede="Codexa runs a bounded loop: plan, generate, validate, run, ship. Every step is visible, every change is snapshotted, and every run can be reverted."
        actions={[
          { label: "Start building", href: "/signup" },
          { label: "Read the docs", href: "/docs" },
        ]}
        visual={<VignetteWindow id="terminal-stream" />}
      />

      <Section size="lg">
        <SectionHeader index="01" eyebrow="The loop" title="Plan, generate, validate, run and ship." className="mb-14 lg:mb-6" />
        <StoryScroll steps={HOW_IT_WORKS_STEPS.map((s) => ({ title: s.title, body: <Inline text={s.description} /> }))} stages={stages} label="The five steps" />
        <Alert variant="info" live={false} title="Requires an AI provider" className="mt-16 max-w-3xl">
          {AI_KEY_LIMIT}
        </Alert>
      </Section>

      <Section size="sm" className="border-t border-border/60">
        <SectionHeader index="02" eyebrow="In detail" title="What happens at each step." className="mb-14" />
        <LandingSections sections={HOW_IT_WORKS_DETAIL} />
      </Section>

      <Section size="sm" className="border-t border-border/60">
        <div className="grid gap-10 lg:grid-cols-[5fr_7fr] lg:gap-14">
          <SectionHeader index="03" eyebrow="FAQ" title="Questions, answered." description="Short answers here; the docs have the full detail for every step." />
          <FAQ items={HOW_IT_WORKS_FAQ} />
        </div>
      </Section>

      <CTABand variant="prompt" title="Try the loop on your own idea." />
    </div>
  );
}
