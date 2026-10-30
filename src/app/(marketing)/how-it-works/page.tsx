import * as React from "react";
import { routeMetadata } from "@/lib/seo";
import { HOW_IT_WORKS_STEPS, AI_KEY_LIMIT } from "@/content/marketing/product";
import { HOW_IT_WORKS_DETAIL, HOW_IT_WORKS_FAQ } from "@/content/marketing/features";
import { PageHeader } from "@/components/marketing/page-header";
import { Section, SectionHeader } from "@/components/marketing/section";
import { ContentBlocks } from "@/components/marketing/content-blocks";
import { FAQ } from "@/components/marketing/faq";
import { CTABand } from "@/components/marketing/cta-band";
import { Inline } from "@/components/marketing/inline";
import { StoryScroll } from "@/components/marketing/story-scroll";
import { ChevronDown } from "lucide-react";
import { storyStages } from "@/components/marketing/vignette-window";
import { CaptureWindow } from "@/components/marketing/captures";
import { Alert } from "@/components/ui/misc";

export const metadata = routeMetadata("/how-it-works");

/**
 * Each step's one-line summary, with the full technical detail folded under it (native <details>),
 * so the five steps are told once instead of twice.
 */
function StepBody({ summary, id }: { summary: string; id: string }) {
  const detail = HOW_IT_WORKS_DETAIL.find((d) => d.id === id);
  return (
    <>
      <p>
        <Inline text={summary} />
      </p>
      {detail ? (
        <details className="group mt-3">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md text-[13.5px] font-medium text-foreground transition-colors hover:text-signal-ink [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Details</span>
            <span className="hidden group-open:inline">Hide details</span>
            <ChevronDown className="size-3.5 transition-transform duration-300 ease-snap group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-3 space-y-3 border-l border-border pl-4 text-[14.5px] leading-relaxed [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
            <ContentBlocks blocks={detail.blocks} />
          </div>
        </details>
      ) : null}
    </>
  );
}

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
        visual={<CaptureWindow id="agent" priority />}
      />

      <Section size="lg">
        <SectionHeader index="01" eyebrow="The loop" title="Plan, generate, validate, run and ship." className="mb-14 lg:mb-6" />
        <StoryScroll steps={HOW_IT_WORKS_STEPS.map((s) => ({ title: s.title, body: <StepBody summary={s.description} id={s.title.toLowerCase()} /> }))} stages={stages} label="The five steps" />
        <Alert variant="info" live={false} title="Requires an AI provider" className="mt-16 max-w-3xl">
          {AI_KEY_LIMIT}
        </Alert>
      </Section>

      <Section size="sm" className="border-t border-border/60">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <SectionHeader index="02" eyebrow="FAQ" title="Questions, answered." description="Short answers here; the docs have the full detail for every step." />
          <FAQ items={HOW_IT_WORKS_FAQ} />
        </div>
      </Section>

      <CTABand variant="prompt" title="Try the loop on your own idea." />
    </div>
  );
}
