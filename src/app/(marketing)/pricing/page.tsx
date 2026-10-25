import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { PRICING_FAQ } from "@/content/marketing/pricing";
import { Section, SectionHeader } from "@/components/marketing/section";
import { PricingTable } from "@/components/marketing/pricing-table";
import { LimitsTable } from "@/components/marketing/limits-table";
import { FAQ } from "@/components/marketing/faq";
import { CTABand } from "@/components/marketing/cta-band";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";

export const metadata = routeMetadata("/pricing");

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="container-x py-12 text-center sm:py-16">
          <Breadcrumbs items={[{ name: "Pricing", path: "/pricing" }]} className="[&_ol]:justify-center" />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">Simple plans in INR and USD</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">Start free. Upgrade when you need more AI requests, runtime, deployments, or collaborators. Limits are enforced per workspace on the server.</p>
        </div>
      </section>
      <Section className="py-12 sm:py-16">
        <PricingTable />
      </Section>
      <Section tone="surface">
        <SectionHeader title="Usage limits by plan" description="Every number below comes from the plan configuration the server enforces. Monthly limits reset on the first of each month (UTC)." />
        <LimitsTable className="mt-8" />
        <p className="mt-4 text-sm">
          <Link href="/pricing/compare-plans" className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4">
            Compare every feature side by side <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </p>
      </Section>
      <Section>
        <SectionHeader title="Pricing questions" />
        <FAQ items={PRICING_FAQ} withJsonLd className="mt-8 max-w-3xl" />
        <p className="mt-6 text-sm text-muted-foreground">
          More in the <Link href="/billing-faq" className="font-medium text-primary underline underline-offset-4">billing FAQ</Link>, <Link href="/credits" className="font-medium text-primary underline underline-offset-4">credits</Link>, and <Link href="/usage" className="font-medium text-primary underline underline-offset-4">usage</Link> pages.
        </p>
      </Section>
      <CTABand title="Start on the Free plan" description="No card required. Upgrade from Settings, Billing whenever you are ready." secondary={{ label: "Contact sales", href: "/contact-sales" }} />
    </>
  );
}
