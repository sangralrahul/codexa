import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { FEATURE_GROUPS } from "@/content/marketing/features";
import { PageHeader } from "@/components/marketing/page-header";
import { Section } from "@/components/marketing/section";
import { CTABand } from "@/components/marketing/cta-band";
import { OnThisPage } from "@/components/marketing/on-this-page";
import { SpecStage, type SpecScene } from "@/components/marketing/spec-stage";
import { VignettePlate, VIGNETTE_DETAIL, VIGNETTE_PROJECT } from "@/components/marketing/vignette-window";
import { Inline } from "@/components/marketing/inline";
import { VIGNETTES } from "@/components/vignettes/registry";
import { Odometer } from "@/components/motion/odometer";
import { Alert } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";

export const metadata = routeMetadata("/features");

const shipped = FEATURE_GROUPS.reduce((n, g) => n + g.features.length, 0);
const planned = FEATURE_GROUPS.reduce((n, g) => n + (g.planned?.length ?? 0), 0);

/** Hero visual: the spec sheet's own index, counted from the content model (not a marketing number). */
function SpecIndex() {
  return (
    <div className="e3 overflow-hidden rounded-[18px]">
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
        <div className="p-5 sm:p-6">
          <Odometer value={shipped} className="mk-num font-display text-[clamp(2.5rem,1.8rem+2vw,3.5rem)] font-bold tracking-[-0.04em] [font-stretch:108%]" />
          <p className="mt-1 text-[13px] text-muted-foreground">features listed as shipped</p>
        </div>
        <div className="p-5 sm:p-6">
          <Odometer value={planned} className="mk-num font-display text-[clamp(2.5rem,1.8rem+2vw,3.5rem)] font-bold tracking-[-0.04em] text-foreground-dim [font-stretch:108%]" />
          <p className="mt-1 text-[13px] text-muted-foreground">on the roadmap, marked as such</p>
        </div>
      </div>
      <ol className="divide-y divide-border">
        {FEATURE_GROUPS.map((g, i) => (
          <li key={g.id}>
            <a href={`#${g.id}`} className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-foreground/[0.03] sm:px-6">
              <span className="font-mono text-[11px] tabular-nums text-signal-ink">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-[14px] font-medium">{g.navLabel}</span>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{g.features.length}</span>
              <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ol>
      <p className="border-t border-border px-5 py-3 font-mono text-[10.5px] text-foreground-dim sm:px-6">Counted from src/content/marketing/features.ts</p>
    </div>
  );
}

export default function FeaturesPage() {
  const scenes: SpecScene[] = FEATURE_GROUPS.map((g) => {
    const V = VIGNETTES[g.visual];
    return { id: g.id, label: g.navLabel, node: <V />, detail: VIGNETTE_DETAIL[g.visual], project: VIGNETTE_PROJECT[g.visual] ?? "my-app" };
  });
  return (
    <div data-tone="product">
      <PageHeader
        variant="product"
        crumbs={[{ name: "Features", path: "/features" }]}
        kicker="Features"
        headline="Everything shipped. Nothing implied."
        mark="Nothing implied."
        lede="Everything in Codexa, grouped by what you are doing: generation, the editor, previews, data, history, deployment and teams. Roadmap items are marked as not shipped."
        actions={[
          { label: "Start building", href: "/signup" },
          { label: "Compare plans", href: "/pricing/compare-plans" },
        ]}
        visual={<SpecIndex />}
      />

      <Section size="md" className="pt-12 sm:pt-16 lg:pt-20">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 lg:grid-cols-[150px_minmax(0,1fr)_minmax(0,1.1fr)] xl:grid-cols-[180px_minmax(0,1fr)_minmax(0,1.1fr)] xl:gap-x-14">
          <aside className="contents lg:sticky lg:top-24 lg:block lg:self-start">
            <OnThisPage items={FEATURE_GROUPS.map((g) => ({ id: g.id, title: g.navLabel }))} label="Spec sheet" rootMargin="-40% 0px -59% 0px" />
          </aside>
          <div className="min-w-0">
            {FEATURE_GROUPS.map((g, i) => {
              const [a, b, ...rest] = g.features;
              return (
                <section key={g.id} id={g.id} aria-labelledby={`${g.id}-title`} className="scroll-mt-28 pb-24 last:pb-0 lg:min-h-[70svh]">
                  <header data-reveal className="relative pt-10">
                    <span aria-hidden="true" className="mk-num pointer-events-none absolute -top-2 left-0 select-none font-display text-[120px] font-extrabold leading-none tracking-[-0.06em] text-foreground/[0.07] [font-stretch:112%]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h2 id={`${g.id}-title`} className="text-display-3 relative">
                      {g.title}
                    </h2>
                    <p className="relative mt-4 max-w-xl text-pretty text-muted-foreground">{g.description}</p>
                  </header>
                  <div className="mt-8 lg:hidden">
                    <VignettePlate id={g.visual} />
                  </div>
                  <ul className="mt-8 grid gap-6 border-t border-border pt-8 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {[a, b].filter(Boolean).map((f) => {
                      const Icon = f.icon;
                      return (
                        <li key={f.title} data-reveal className="group">
                          {Icon ? (
                            <span aria-hidden="true" className="mb-4 inline-flex size-9 items-center justify-center text-signal-ink">
                              <Icon className="size-9" strokeWidth={1.25} />
                            </span>
                          ) : null}
                          <h3 className="text-[18px] font-semibold tracking-[-0.015em]">
                            {f.href ? (
                              <Link href={f.href} className="link-draw outline-offset-4">
                                {f.title}
                              </Link>
                            ) : (
                              f.title
                            )}
                          </h3>
                          <p className="mt-2 text-base leading-relaxed text-foreground/80">
                            <Inline text={f.description} />
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                  {rest.length ? (
                    <ul className="mt-8 grid gap-x-8 sm:grid-cols-2">
                      {rest.map((f) => (
                        <li key={f.title} className="border-t border-border py-4">
                          <h3 className="text-[14.5px] font-semibold tracking-tight">
                            {f.href ? (
                              <Link href={f.href} className="link-draw outline-offset-4">
                                {f.title}
                              </Link>
                            ) : (
                              f.title
                            )}
                          </h3>
                          <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
                            <Inline text={f.description} />
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {g.note ? (
                    <Alert variant="info" live={false} className="mt-8">
                      {g.note}
                    </Alert>
                  ) : null}
                  {g.planned?.length ? (
                    <div className="mt-10 rounded-[16px] border border-dashed border-border-strong p-6">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="text-[16px] font-semibold tracking-tight">Not shipped yet</h3>
                        <span className="text-[13px] text-muted-foreground">
                          On the <Link href="/roadmap" className="link-draw text-foreground">roadmap</Link>, not in the product
                        </span>
                      </div>
                      <ul className="mt-4 divide-y divide-dashed divide-border-strong">
                        {g.planned.map((p) => (
                          <li key={p.title} className="flex items-start gap-3 py-3 first:pt-1 last:pb-0">
                            <Badge variant="outline" className="mt-0.5 shrink-0">
                              Planned
                            </Badge>
                            <span className="min-w-0">
                              <span className="block text-[14px] font-medium">{p.title}</span>
                              <span className="block text-[13px] leading-snug text-muted-foreground">{p.detail}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
          <div className="hidden min-w-0 lg:block">
            <SpecStage scenes={scenes} />
          </div>
        </div>
      </Section>
      <CTABand variant="prompt" title="Try the whole list in one project." />
    </div>
  );
}
