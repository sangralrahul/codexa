import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { HOW_IT_WORKS_STEPS, PLATFORM_FEATURES, PRODUCT_FAQ, AI_KEY_LIMIT } from "@/content/marketing/product";
import { Hero } from "@/components/marketing/hero";
import { Section, SectionHeader } from "@/components/marketing/section";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { Steps } from "@/components/marketing/steps";
import { FAQ } from "@/components/marketing/faq";
import { CTABand } from "@/components/marketing/cta-band";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { ProductScreenshot } from "@/components/marketing/product-screenshot";
import { Alert } from "@/components/ui/misc";

export const metadata = routeMetadata("/product");

const pillars = [
  { title: "Generate", href: "/ai-app-builder", body: "Describe an app and get a real project from a starter template, with a plan you can read before the agent edits anything." },
  { title: "Edit", href: "/code-editor", body: "A Monaco editor with tabs, explorer, search and replace, diagnostics, diff view, autosave, and keyboard shortcuts." },
  { title: "Run", href: "/visual-editor", body: "Preview in an isolated sandbox through a host-based proxy, with streamed logs and responsive viewport controls." },
  { title: "Ship", href: "/app-deployment", body: "Deploy to Codexa static hosting with history and rollback, or to Vercel when a token is configured." },
];

export default function ProductPage() {
  return (
    <>
      <Hero
        eyebrow="Product"
        title="An AI-native development platform, end to end."
        subtitle="Prompt-to-app generation, a real editor, isolated runtimes, databases, GitHub, and deployment in one workspace. Built so the generated code stays yours."
        primary={{ label: "Start Building Free", href: "/signup" }}
        secondary={{ label: "See how it works", href: "/how-it-works" }}
      >
        <Breadcrumbs items={[{ name: "Product", path: "/product" }]} className="[&_ol]:justify-center" />
      </Hero>

      <Section>
        <SectionHeader title="Four things Codexa does" description="Every project moves through the same loop. You can enter at any point: start from a prompt, a template, or an imported GitHub repository." />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {pillars.map((p, i) => (
            <li key={p.title}>
              <Link href={p.href} className="flex h-full gap-4 glow-card rounded-2xl border border-border p-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border-strong text-sm font-semibold tabular-nums" aria-hidden="true">
                  {i + 1}
                </span>
                <span>
                  <span className="flex items-center gap-1 text-base font-semibold tracking-tight">
                    {p.title} <ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">{p.body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="surface">
        <SectionHeader title="The workspace" description="Editor, agent, preview, and logs side by side." align="center" />
        <ProductScreenshot className="mt-10" />
      </Section>

      <Section>
        <SectionHeader title="How the agent works" />
        <Steps steps={HOW_IT_WORKS_STEPS} className="mt-8" />
        <Alert variant="info" title="Requires an AI provider" className="mt-8 max-w-3xl">
          {AI_KEY_LIMIT}
        </Alert>
      </Section>

      <Section tone="surface">
        <SectionHeader title="Everything included" />
        <FeatureGrid features={PLATFORM_FEATURES} columns={3} className="mt-8" />
      </Section>

      <Section>
        <SectionHeader title="Frequently asked questions" />
        <FAQ items={PRODUCT_FAQ} className="mt-8 max-w-3xl" />
      </Section>

      <CTABand />
    </>
  );
}
