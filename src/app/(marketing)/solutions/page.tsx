import Link from "next/link";
import { ArrowUpRight, ShieldAlert } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { SOLUTIONS } from "@/content/marketing/solutions";
import { PageHeader } from "@/components/marketing/page-header";
import { Section } from "@/components/marketing/section";
import { CTABand } from "@/components/marketing/cta-band";
import { TemplateFan } from "@/components/marketing/template-rail";

export const metadata = routeMetadata("/solutions");

export default function SolutionsIndexPage() {
  return (
    <div data-tone="product">
      <PageHeader
        variant="editorial"
        crumbs={[{ name: "Solutions", path: "/solutions" }]}
        kicker="Solutions"
        headline="One platform, many kinds of builders."
        mark="many kinds of builders."
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
        <ul data-reveal="stagger" data-spotlight="grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((s) => (
            <li key={s.slug}>
              <Link href={`/solutions/${s.slug}`} className="glow-card group flex h-full flex-col rounded-[20px] border border-border p-2.5">
                <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-br from-signal/[0.07] via-surface to-info/[0.07] px-6 pb-0 pt-6">
                  <TemplateFan ids={s.templates} caption={false} stack className="translate-y-3" />
                </div>
                <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-display-4">{s.name}</span>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-[translate,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground group-focus-visible:text-foreground" aria-hidden="true" />
                  </span>
                  <span className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{s.title}</span>
                  {s.regulated ? (
                    <span className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full bg-warning/10 px-2.5 py-1 text-[12px] font-medium text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--warning)_35%,transparent)]">
                      <ShieldAlert className="size-3.5 text-warning" aria-hidden="true" />
                      No regulatory compliance claims
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <CTABand variant="prompt" />
    </div>
  );
}
