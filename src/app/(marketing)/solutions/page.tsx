import Link from "next/link";
import { ArrowRight, ArrowUpRight, ShieldAlert } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { SOLUTIONS } from "@/content/marketing/solutions";
import { FACTS } from "@/content/marketing/facts";
import { PageHeader } from "@/components/marketing/page-header";
import { Section } from "@/components/marketing/section";
import { CTABand } from "@/components/marketing/cta-band";
import { TemplatePreview } from "@/components/templates/template-preview";
import { TEMPLATE_SHOTS } from "@/components/templates/shots";
import { getTemplate } from "@/templates";

export const metadata = routeMetadata("/solutions");

export default function SolutionsIndexPage() {
  return (
    <div data-tone="product">
      <PageHeader
        variant="editorial"
        crumbs={[{ name: "Solutions", path: "/solutions" }]}
        kicker="Solutions"
        headline="One platform, many kinds of builders."
        lede="Codexa is the same product for everyone: prompt, edit, run, deploy. Each page shows the starters that fit, a typical workflow, prompts to try and the limits to know before you start."
        actions={[
          { label: "Start building", href: "/signup" },
          { label: "Browse templates", href: "/templates" },
        ]}
        meta={[
          { label: "Audiences", value: `${SOLUTIONS.length} guides` },
          { label: "Starters shown", value: "Real screenshots" },
          { label: "Regulated fields", value: "No compliance claims" },
        ]}
      />
      <Section size="sm">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((s) => {
            // The best-fitting starter fronts the card: a straight screenshot of its own build.
            const lead = s.templates.map((id) => getTemplate(id)).find((t) => t && TEMPLATE_SHOTS.has(t.id));
            return (
              <li key={s.slug}>
                <Link href={`/solutions/${s.slug}`} className="group flex h-full flex-col rounded-[12px] border border-border bg-card p-2 transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-md">
                  {lead ? (
                    <TemplatePreview id={lead.id} category={lead.category} pan sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 90vw" className="rounded-[8px] shadow-none" />
                  ) : (
                    <div aria-hidden="true" className="aspect-[16/10] rounded-[8px] bg-surface" />
                  )}
                  <div className="flex flex-1 flex-col px-2.5 pb-2 pt-4">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[16px] font-semibold tracking-[-0.01em]">{s.name}</span>
                      <ArrowUpRight className="size-4 text-muted-foreground transition-[translate,color] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
                    </span>
                    <span className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{s.title}</span>
                    {lead ? <span className="mt-2 text-[12px] text-muted-foreground">Starter shown: {lead.name}</span> : null}
                    {s.regulated ? (
                      <span className="mt-3 inline-flex items-center gap-1.5 self-start rounded-[6px] bg-warning/10 px-2 py-1 text-[12px] font-medium text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--warning)_35%,transparent)]">
                        <ShieldAlert className="size-3.5 text-warning" aria-hidden="true" />
                        No regulatory compliance claims
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
          {/* Closes the grid (no half-empty last row): the same product for anyone not listed above. */}
          <li className="sm:col-span-2 lg:col-span-1">
            <Link href="/templates" className="group flex h-full min-h-[16rem] flex-col justify-between rounded-[12px] border border-dashed border-border-strong bg-surface/60 p-5 transition-colors duration-200 hover:border-foreground/30 hover:bg-surface">
              <p className="text-eyebrow">Not on the list?</p>
              <div>
                <span className="block text-[16px] font-semibold tracking-[-0.01em]">Start from any of {FACTS.templates} starters.</span>
                <span className="mt-1.5 block text-[13.5px] leading-relaxed text-muted-foreground">Every page above is the same product. Pick the closest starter, or describe your own idea and let the agent plan it.</span>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-foreground">
                  Browse templates
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </li>
        </ul>
      </Section>
      <CTABand variant="prompt" />
    </div>
  );
}
