import * as React from "react";
import Link from "next/link";
import type { Solution } from "@/content/marketing/solutions";
import { Alert } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/session";
import { PageHeader, Kicker } from "./page-header";
import { Section, SectionHeader } from "./section";
import { FeatureGrid } from "./feature-grid";
import { CTABand } from "./cta-band";
import { Inline } from "./inline";
import { FinePrint } from "./fine-print";
import { storyStages } from "./vignette-window";
import { StoryScroll } from "./story-scroll";
import { IdeaPrompts } from "./idea-prompts";
import { TemplateFan, TemplateRail } from "./template-rail";

/** The regulated-industry notice (healthcare, fintech): visible, static, never softened. */
function RegulatedNotice() {
  return (
    <Alert variant="warning" live={false} title="No regulatory compliance claims" className="mt-4">
      Codexa does not claim compliance with any regulatory framework (for example HIPAA, PCI DSS, RBI or SEBI guidelines, or GDPR certification). You are responsible for assessing whether the
      platform and your deployment meet your obligations. Read how the platform is built on the{" "}
      <Link href="/security" className="font-medium text-foreground underline underline-offset-4">
        security page
      </Link>
      .
    </Alert>
  );
}

/**
 * Solution page (PLAN §5.3): a statement hero with the audience word marked and real starter
 * screenshots, a "Start from" rail of mapped templates, the workflow beside a sticky vignette,
 * "Try this prompt" chips (idea passport) beside the fine print, and the prompt CTA.
 */
export async function SolutionPageTemplate({ solution }: { solution: Solution }) {
  const signedIn = Boolean(await getCurrentUser());
  return (
    <div data-tone="product">
      <PageHeader
        variant="product"
        crumbs={[{ name: "Solutions", path: "/solutions" }, { name: solution.navLabel ?? solution.name, path: `/solutions/${solution.slug}` }]}
        kicker={`Codexa for ${solution.audience}`}
        headline={solution.headline}
        mark={solution.mark}
        highlight={solution.highlight}
        lede={solution.title}
        actions={[
          { label: "Start building", href: "/signup" },
          { label: "Browse templates", href: "/templates" },
        ]}
        visual={<TemplateFan ids={solution.templates} />}
      />

      <Section size="sm">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <SectionHeader index="01" eyebrow="Start from" title="A real starter, not a blank page." className="lg:col-span-7" />
          <p className="text-lead lg:col-span-5">{solution.intro}</p>
        </div>
        <TemplateRail ids={solution.templates} signedIn={signedIn} className="mt-12" />
      </Section>

      <Section size="lg" className="border-t border-border/60">
        <SectionHeader index="02" eyebrow="A typical workflow" title={solution.workflowIntro} className="mb-14 lg:mb-6" />
        {/* Each step drives the sticky workspace window beside it (scroll picks the step; the vignette plays once). */}
        <StoryScroll
          steps={solution.workflow.map((s) => ({ title: s.title, body: <Inline text={s.description} /> }))}
          stages={storyStages(solution.workflow.map((s) => s.visual ?? solution.visual))}
          label={`A typical workflow for ${solution.audience}`}
        />
      </Section>

      <Section size="sm" className="border-t border-border/60">
        <SectionHeader index="03" eyebrow="Features that matter here" title={`What ${solution.audience} use most.`} />
        <FeatureGrid features={solution.features} className="mt-10" />
      </Section>

      <Section size="sm" className="border-t border-border/60">
        <div className="grid gap-10 lg:grid-cols-[7fr_5fr] lg:gap-14">
          <div>
            <Kicker>Try this prompt</Kicker>
            <h2 className="text-display-3 mt-5 max-w-[20ch]">Start with an idea that fits.</h2>
            <p className="text-lead mt-4">Each one goes with you through sign-up and lands in the composer, ready to send. Or copy it and change the details first.</p>
            <IdeaPrompts ideas={solution.ideas} signedIn={signedIn} className="mt-8" />
          </div>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <FinePrint items={solution.limitations} title="Limitations to know about" />
            {solution.regulated ? <RegulatedNotice /> : null}
          </div>
        </div>
      </Section>

      <CTABand variant="prompt" title={`Build your first ${solution.ctaNoun}.`} description="Start on the Free plan. Upgrade when you need more AI requests, runtime, or collaborators." />
    </div>
  );
}
