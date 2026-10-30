import * as React from "react";
import type { IllustrationId, ProductPage } from "@/content/marketing/types";
import { PRODUCT_FAQ } from "@/content/marketing/product";
import { FACTS } from "@/content/marketing/facts";
import { getRoute } from "@/config/routes";
import { Odometer } from "@/components/motion/odometer";
import { PageHeader, Kicker } from "./page-header";
import { Section, SectionHeader } from "./section";
import { FeatureGrid } from "./feature-grid";
import { FAQ } from "./faq";
import { CTABand } from "./cta-band";
import { ContentSections } from "./content-blocks";
import { Inline } from "./inline";
import { VignettePlate, VignetteWindow, storyStages } from "./vignette-window";
import { StoryScroll } from "./story-scroll";
import { FinePrint } from "./fine-print";
import { RelatedCards } from "./related-cards";

const RELATED_COPY: Record<string, string> = {
  "/features": "Everything that ships today, group by group.",
  "/how-it-works": "Plan, generate, validate, run, ship.",
  "/pricing": "Free, Pro, Team and Enterprise in INR and USD.",
  "/templates": "Starters with real files and screenshots.",
};

/** Facts computed from the code that enforces them (footnoted). */
function Facts() {
  const facts = [
    { value: FACTS.maxRepairAttempts, label: "repair attempts at most", source: "LIMITS.maxRepairAttempts" },
    { value: FACTS.agentTools, label: "agent tools, each shown as it runs", source: "toolSchemas" },
    { value: FACTS.templates, label: "starter templates", source: "TEMPLATES" },
  ];
  return (
    <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-6">
      {facts.map((f) => (
        <div key={f.label}>
          <dt className="sr-only">{f.label}</dt>
          <dd>
            <Odometer value={f.value} className="mk-num font-display text-[clamp(2rem,1.4rem+1.6vw,2.75rem)] font-bold tracking-[-0.03em] [font-stretch:108%]" />
            <span aria-hidden="true" className="mt-1 block text-[13px] leading-snug text-muted-foreground">
              {f.label}
            </span>
          </dd>
        </div>
      ))}
      <p className="col-span-3 text-[12px] text-muted-foreground" title={`Source: ${facts.map((f) => f.source).join(", ")}`}>
        These numbers come from the product&rsquo;s own configuration, so they change when the product does.
      </p>
    </dl>
  );
}

/** "Plan, edit, validate, repair and report." when every step is one word; otherwise a plain heading. */
function storyTitle(titles: string[]): string {
  if (titles.length > 1 && titles.every((t) => !t.includes(" "))) {
    const words = titles.map((t, i) => (i === 0 ? t : t.toLowerCase()));
    return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}.`;
  }
  return "Step by step, in one workspace.";
}

/**
 * Product page (PLAN §5.3): split hero with the page's vignette, positioning beside facts from
 * code, sticky scrollytelling steps, a feature bento (two vignette tiles and a spec list), the
 * fine print beside the FAQ, three related cards and the prompt CTA.
 */
export function ProductPageTemplate({ page }: { page: ProductPage }) {
  const route = getRoute(page.path);
  const steps = page.steps ?? [];
  const stepVisuals = steps.map((s) => s.visual ?? page.visual);
  // The first two features become illustrated tiles only when the page names two illustrations it
  // does not already show (hero and steps); otherwise every feature sits in the plain grid, so no
  // picture is repeated as filler.
  const bento: [IllustrationId, IllustrationId] | null = page.bento ?? null;
  const [tileA, tileB] = bento ? page.features : [];
  const rest = bento ? page.features.slice(2) : page.features;
  // The page's own questions first, topped up with general product questions so the FAQ is never thinner than the fine print.
  const own = page.faq ?? [];
  const faq = [...own, ...PRODUCT_FAQ.filter((q) => !own.some((o) => o.question === q.question))].slice(0, Math.max(5, own.length));
  const related = (page.related ?? []).slice(0, 3).map((r) => ({ ...r, description: RELATED_COPY[r.href] }));

  return (
    <div data-tone="product">
      <PageHeader
        variant="product"
        crumbs={[{ name: "Product", path: "/product" }, { name: route?.navLabel ?? page.eyebrow, path: page.path }]}
        kicker={page.eyebrow}
        headline={page.headline}
        mark={page.mark}
        highlight={page.highlight}
        lede={page.title}
        actions={[
          { label: "Start building", href: "/signup" },
          { label: "How it works", href: "/how-it-works" },
        ]}
        visual={<VignetteWindow id={page.visual} />}
      />

      <Section size="sm">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          <div data-reveal className="lg:col-span-5">
            <Kicker>What it is</Kicker>
            <p className="text-display-4 mt-5 text-pretty">{page.subtitle}</p>
          </div>
          <div data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties} className="lg:col-span-7 lg:pt-10">
            {page.positioning ? (
              <p className="text-lead max-w-none">
                <Inline text={page.positioning} />
              </p>
            ) : null}
            <Facts />
          </div>
        </div>
      </Section>

      {steps.length ? (
        <Section size="lg" className="border-t border-border/60">
          <SectionHeader index="01" eyebrow={page.stepsHeading ?? "How it works"} title={storyTitle(steps.map((s) => s.title))} className="mb-14 lg:mb-6" />
          <StoryScroll steps={steps.map((s) => ({ title: s.title, body: <Inline text={s.description} /> }))} stages={storyStages(stepVisuals)} label={page.stepsHeading ?? "How it works"} />
        </Section>
      ) : null}

      <Section size="lg" className="border-t border-border/60">
        <SectionHeader index={steps.length ? "02" : "01"} eyebrow={page.featuresHeading ?? "What you get"} title="The parts that matter, in detail." />
        {bento && tileA && tileB ? (
          // From lg the two tiles share their rows (subgrid): illustrations are one height and the captions start on one line.
          <div data-spotlight="grid" className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-y-0">
            {[tileA, tileB].map((f, i) => {
              const Icon = f.icon;
              return (
                <article key={f.title} data-reveal data-spotlight-tile style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties} className="relative flex flex-col overflow-hidden rounded-[20px] border border-border bg-card p-3 shadow-[inset_0_1px_0_var(--hairline)] lg:row-span-2 lg:grid lg:grid-rows-subgrid lg:gap-0">
                  <VignettePlate id={bento[i]} className="border-0 bg-surface/70" />
                  <div className="px-3 pb-3 pt-5">
                    <h3 className="flex items-center gap-2.5 text-[18px] font-semibold tracking-[-0.015em]">
                      {Icon ? <Icon className="size-[18px] text-primary" aria-hidden="true" /> : null}
                      {f.title}
                    </h3>
                    <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-foreground/75">
                      <Inline text={f.description} />
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
        {rest.length ? <FeatureGrid features={rest} columns={2} className="mt-12" /> : null}
      </Section>

      {page.sections?.length ? (
        <Section size="sm">
          <div className="max-w-3xl space-y-10">
            <ContentSections sections={page.sections} />
          </div>
        </Section>
      ) : null}

      <Section size="sm" className="border-t border-border/60">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <FinePrint items={page.limitations} />
          </div>
          <div>
            <h2 className="text-display-3">Questions, answered.</h2>
            <FAQ items={faq} className="mt-8" />
          </div>
        </div>
      </Section>

      {related.length ? (
        <Section size="sm" className="pt-0 sm:pt-0 lg:pt-0">
          <h2 className="text-label mb-5 text-muted-foreground">Keep exploring</h2>
          <RelatedCards items={related} />
        </Section>
      ) : null}

      <CTABand variant="prompt" title={page.cta?.title} description={page.cta?.description} />
    </div>
  );
}
