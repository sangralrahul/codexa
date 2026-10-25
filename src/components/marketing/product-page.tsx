import Link from "next/link";
import { AlertCircle, ArrowUpRight } from "lucide-react";
import type { ProductPage } from "@/content/marketing/types";
import { getRoute } from "@/config/routes";
import { Hero } from "./hero";
import { Section, SectionHeader } from "./section";
import { FeatureGrid } from "./feature-grid";
import { Steps } from "./steps";
import { FAQ } from "./faq";
import { CTABand } from "./cta-band";
import { Breadcrumbs } from "./breadcrumbs";
import { ProductScreenshot } from "./product-screenshot";
import { ContentSections } from "./content-blocks";
import { Inline } from "./inline";

export function ProductPageTemplate({ page }: { page: ProductPage }) {
  const route = getRoute(page.path);
  return (
    <>
      <Hero
        eyebrow={page.eyebrow}
        title={page.title}
        subtitle={page.subtitle}
        primary={{ label: "Start Building Free", href: "/signup" }}
        secondary={{ label: "How it works", href: "/how-it-works" }}
      >
        <Breadcrumbs items={[{ name: "Product", path: "/product" }, { name: route?.title ?? page.title, path: page.path }]} className="justify-center [&_ol]:justify-center" />
      </Hero>

      {page.positioning ? (
        <Section className="py-10 sm:py-12">
          <p className="mx-auto max-w-3xl text-center text-lg leading-relaxed text-foreground/90">
            <Inline text={page.positioning} />
          </p>
        </Section>
      ) : null}

      {page.showPreview ? (
        <Section tone="surface" className="py-12">
          <ProductScreenshot />
        </Section>
      ) : null}

      <Section>
        <SectionHeader title={page.featuresHeading ?? "What you get"} />
        <FeatureGrid features={page.features} className="mt-8" />
      </Section>

      {page.steps ? (
        <Section tone="surface">
          <SectionHeader title={page.stepsHeading ?? "How it works"} />
          <Steps steps={page.steps} className="mt-8" />
        </Section>
      ) : null}

      {page.sections?.length ? (
        <Section>
          <div className="max-w-3xl space-y-10">
            <ContentSections sections={page.sections} />
          </div>
        </Section>
      ) : null}

      <Section tone="surface" className="py-12 sm:py-14">
        <div className="max-w-3xl rounded-xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <AlertCircle className="size-5 text-warning" aria-hidden="true" />
            Limitations and requirements
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-6 text-sm text-foreground/90">
            {page.limitations.map((l) => (
              <li key={l}>
                <Inline text={l} />
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {page.faq?.length ? (
        <Section>
          <SectionHeader title="Frequently asked questions" />
          <FAQ items={page.faq} className="mt-8 max-w-3xl" />
        </Section>
      ) : null}

      {page.related?.length ? (
        <Section tone="surface" className="py-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Related</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {page.related.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted">
                  {r.label}
                  <ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <CTABand title={page.cta?.title} description={page.cta?.description} />
    </>
  );
}
