import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { SOLUTIONS } from "@/content/marketing/solutions";
import { Hero } from "@/components/marketing/hero";
import { Section, SectionHeader } from "@/components/marketing/section";
import { CTABand } from "@/components/marketing/cta-band";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";

export const metadata = routeMetadata("/solutions");

export default function SolutionsIndexPage() {
  return (
    <>
      <Hero
        eyebrow="Solutions"
        title="One platform, many kinds of builders."
        subtitle="Codexa is the same product for everyone: prompt, edit, run, deploy. These pages describe how different teams tend to use it, which features matter most, and the limits to know before you start."
        primary={{ label: "Start Building Free", href: "/signup" }}
        secondary={{ label: "See pricing", href: "/pricing" }}
      >
        <Breadcrumbs items={[{ name: "Solutions", path: "/solutions" }]} className="[&_ol]:justify-center" />
      </Hero>
      <Section>
        <SectionHeader title="Choose your starting point" description="Each page includes a typical workflow, example prompts, and the limitations that apply." />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((s) => (
            <li key={s.slug}>
              <Link href={`/solutions/${s.slug}`} className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-border-strong focus-visible:outline-2 focus-visible:outline-ring">
                <span className="flex items-center justify-between gap-2 text-base font-semibold tracking-tight">
                  {s.name}
                  <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </span>
                <span className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.title}</span>
                {s.regulated ? <span className="mt-3 text-xs font-medium text-warning">No regulatory compliance claims; see the security page.</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <CTABand />
    </>
  );
}
