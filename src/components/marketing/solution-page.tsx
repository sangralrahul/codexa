import Link from "next/link";
import { AlertCircle, Lightbulb } from "lucide-react";
import type { Solution } from "@/content/marketing/solutions";
import { Hero } from "./hero";
import { Section, SectionHeader } from "./section";
import { FeatureGrid } from "./feature-grid";
import { Steps } from "./steps";
import { CTABand } from "./cta-band";
import { Breadcrumbs } from "./breadcrumbs";
import { Inline } from "./inline";
import { Alert } from "@/components/ui/misc";

export function SolutionPageTemplate({ solution }: { solution: Solution }) {
  return (
    <>
      <Hero
        eyebrow={`Codexa for ${solution.audience}`}
        title={solution.title}
        subtitle={solution.intro}
        primary={{ label: "Start Building Free", href: "/signup" }}
        secondary={{ label: "Browse templates", href: "/templates" }}
      >
        <Breadcrumbs items={[{ name: "Solutions", path: "/solutions" }, { name: solution.name, path: `/solutions/${solution.slug}` }]} className="[&_ol]:justify-center" />
      </Hero>

      <Section>
        <SectionHeader title="A typical workflow" description={solution.workflowIntro} />
        <Steps steps={solution.workflow} className="mt-8" />
      </Section>

      <Section tone="surface">
        <SectionHeader title="Features that matter here" />
        <FeatureGrid features={solution.features} className="mt-8" />
      </Section>

      <Section>
        <SectionHeader title="Example project ideas" description="Starting prompts you can paste into Codexa. Each one maps to a starter template and produces real, editable code." />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {solution.ideas.map((idea) => (
            <li key={idea} className="flex gap-3 rounded-lg border border-border bg-card p-4 text-sm">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{idea}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="surface" className="py-12 sm:py-14">
        <div className="max-w-3xl space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <AlertCircle className="size-5 text-warning" aria-hidden="true" />
              Limitations to know about
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-6 text-sm text-foreground/90">
              {solution.limitations.map((l) => (
                <li key={l}>
                  <Inline text={l} />
                </li>
              ))}
            </ul>
          </div>
          {solution.regulated ? (
            <Alert variant="warning" title="No regulatory compliance claims">
              Codexa does not claim compliance with any regulatory framework (for example HIPAA, PCI DSS, RBI or SEBI guidelines, or GDPR certification). You are responsible for assessing whether
              the platform and your deployment meet your obligations. Read how the platform is built on the{" "}
              <Link href="/security" className="font-medium text-primary underline underline-offset-4">
                security page
              </Link>
              .
            </Alert>
          ) : null}
        </div>
      </Section>

      <CTABand title={`Build your first ${solution.ctaNoun} with Codexa`} description="Start on the Free plan. Upgrade when you need more AI requests, runtime, or collaborators." />
    </>
  );
}
