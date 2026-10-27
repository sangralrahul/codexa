import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { HOW_IT_WORKS_STEPS, PLATFORM_FEATURES, PRODUCT_FAQ, AI_KEY_LIMIT } from "@/content/marketing/product";
import type { IllustrationId } from "@/content/marketing/types";
import { PageHeader } from "@/components/marketing/page-header";
import { Section, SectionHeader } from "@/components/marketing/section";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { Steps } from "@/components/marketing/steps";
import { FAQ } from "@/components/marketing/faq";
import { CTABand } from "@/components/marketing/cta-band";
import { VignettePlate, VignetteWindow } from "@/components/marketing/vignette-window";
import { Alert } from "@/components/ui/misc";

export const metadata = routeMetadata("/product");

const pillars: { title: string; href: string; body: string; visual: IllustrationId; label: string }[] = [
  { title: "Generate", href: "/ai-app-builder", visual: "plan-steps", label: "AI app builder", body: "Describe an app and get a real project from a starter template, with a plan you can read before the agent edits anything." },
  { title: "Edit", href: "/code-editor", visual: "editor-peek", label: "Code editor", body: "A Monaco editor with tabs, explorer, search and replace, diagnostics, diff view, autosave, and keyboard shortcuts." },
  { title: "Run", href: "/visual-editor", visual: "terminal-stream", label: "Previews", body: "Preview in an isolated sandbox through a host-based proxy, with streamed logs and responsive viewport controls." },
  { title: "Ship", href: "/app-deployment", visual: "deploy-history", label: "Deployment", body: "Deploy to Codexa static hosting with history and rollback, or to Vercel when a token is configured." },
];

export default function ProductPage() {
  return (
    <div data-tone="product">
      <PageHeader
        variant="product"
        crumbs={[{ name: "Product", path: "/product" }]}
        kicker="Product"
        headline="One workspace, prompt to production."
        mark="prompt to production."
        lede="Prompt-to-app generation, a real editor, isolated runtimes, databases, GitHub and deployment in one place. Built so the generated code stays yours."
        actions={[
          { label: "Start building", href: "/signup" },
          { label: "See how it works", href: "/how-it-works" },
        ]}
        visual={<VignetteWindow id="agent-run" />}
      />

      <Section size="lg">
        <SectionHeader index="01" eyebrow="The loop" title="Four things Codexa does." description="Every project moves through the same loop. Enter at any point: a prompt, a template, or an imported GitHub repository." />
        {/* From md each pair of tiles shares two rows (subgrid): the illustrations in a row are one height and
            the captions start on one line, so no tile is left with an empty band. */}
        <ul data-spotlight="grid" className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          {pillars.map((p, i) => (
            <li key={p.title} data-reveal data-spotlight-tile style={{ "--reveal-delay": `${(i % 2) * 90}ms` } as React.CSSProperties} className="relative flex flex-col overflow-hidden rounded-[20px] border border-border bg-card p-3 shadow-[inset_0_1px_0_var(--hairline)] md:row-span-2 md:grid md:grid-rows-subgrid md:gap-0">
              <VignettePlate id={p.visual} className="border-0 bg-surface/70" />
              <div className="flex items-start justify-between gap-4 px-3 pb-3 pt-5">
                <div>
                  <p className="text-label text-signal-ink">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="text-display-4 mt-2">{p.title}</h3>
                  <p className="mt-2 max-w-md text-[15px] leading-relaxed text-foreground/75">{p.body}</p>
                </div>
                <Link href={p.href} className="group mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-border-strong">
                  {p.label}
                  <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section size="sm" className="border-t border-border/60">
        <SectionHeader index="02" eyebrow="How the agent works" title="Plan, generate, validate, run and ship." />
        <Steps steps={HOW_IT_WORKS_STEPS} className="mt-12" />
        <Alert variant="info" live={false} title="Requires an AI provider" className="mt-8 max-w-3xl">
          {AI_KEY_LIMIT}
        </Alert>
      </Section>

      <Section size="sm" className="border-t border-border/60">
        <SectionHeader index="03" eyebrow="Everything included" title="The rest of the toolbox." />
        <FeatureGrid features={PLATFORM_FEATURES} columns={3} className="mt-10" />
      </Section>

      <Section size="sm" className="border-t border-border/60">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <SectionHeader index="04" eyebrow="FAQ" title="Questions, answered." description="Ownership, stacks, AI configuration, where code runs, and what is not shipped yet." />
          <FAQ items={PRODUCT_FAQ} />
        </div>
      </Section>

      <CTABand variant="prompt" />
    </div>
  );
}
