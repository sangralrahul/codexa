import { routeMetadata } from "@/lib/seo";
import { FEATURE_GROUPS } from "@/content/marketing/features";
import { Hero } from "@/components/marketing/hero";
import { Section } from "@/components/marketing/section";
import { ScrollSpyNav } from "@/components/marketing/scroll-spy-nav";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { CTABand } from "@/components/marketing/cta-band";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Alert } from "@/components/ui/misc";

export const metadata = routeMetadata("/features");

export default function FeaturesPage() {
  return (
    <>
      <Hero
        eyebrow="Features"
        title="Everything in Codexa, grouped by what you are doing."
        subtitle="AI generation, editor, preview, databases, integrations, version history, collaboration, deployment, billing, and administration. Items marked as roadmap are not shipped yet."
        primary={{ label: "Start Building Free", href: "/signup" }}
        secondary={{ label: "Compare plans", href: "/pricing/compare-plans" }}
      >
        <Breadcrumbs items={[{ name: "Features", path: "/features" }]} className="[&_ol]:justify-center" />
      </Hero>
      {/* One long spec sheet with a sticky index, rather than ten stacked bands. */}
      <Section className="pt-6 sm:pt-10">
        <div className="grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)] xl:gap-20">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <ScrollSpyNav items={FEATURE_GROUPS.map((g) => ({ id: g.id, title: g.title }))} label="Features" />
            </div>
          </aside>
          <div className="min-w-0">
            {FEATURE_GROUPS.map((g, i) => (
              <section key={g.id} id={g.id} aria-labelledby={`${g.id}-title`} className="scroll-mt-24 pb-16 last:pb-0">
                <header data-reveal className="grid gap-x-10 gap-y-3 border-t border-foreground/80 pt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                  <h2 id={`${g.id}-title`} className="flex items-baseline gap-4 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                    <span className="font-mono text-sm font-normal tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    {g.title}
                  </h2>
                  <p className="text-pretty text-muted-foreground md:pt-1">{g.description}</p>
                </header>
                <FeatureGrid features={g.features} columns={2} className="mt-6" />
                {g.note ? (
                  <Alert variant="info" className="mt-6 max-w-3xl">
                    {g.note}
                  </Alert>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      </Section>
      <CTABand />
    </>
  );
}
