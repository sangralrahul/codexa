import Link from "next/link";
import { ArrowRight, ArrowUpRight, Receipt } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { PRICING_FAQ } from "@/content/marketing/pricing";
import { PageHeader } from "@/components/marketing/page-header";
import { Section, SectionHeader } from "@/components/marketing/section";
import { PricingTable } from "@/components/marketing/pricing-table";
import { LimitsTable } from "@/components/marketing/limits-table";
import { FAQ } from "@/components/marketing/faq";
import { CTABand } from "@/components/marketing/cta-band";

export const metadata = routeMetadata("/pricing");

const MORE = [
  { label: "Billing FAQ", href: "/billing-faq", body: "Invoices, taxes, payment methods, cancelling." },
  { label: "How requests are counted", href: "/credits", body: "Requests, tokens and the monthly period." },
  { label: "How usage is measured", href: "/usage", body: "What is recorded, when, and where to see it." },
];

export default function PricingPage() {
  return (
    <div data-tone="pricing">
      <PageHeader
        variant="pricing"
        crumbs={[{ name: "Pricing", path: "/pricing" }]}
        kicker="Pricing"
        headline="Start free. Scale when it works."
        mark="Scale when it works."
        lede="Plans in INR and USD. Upgrade when you need more AI requests, runtime, deployments or collaborators; every limit is enforced per workspace on the server."
      >
        <PricingTable finder />
      </PageHeader>

      <Section size="sm">
        <SectionHeader index="01" eyebrow="Limits" title="Usage limits by plan." description="Every number below comes from the plan configuration the server enforces. Monthly limits reset on the first of each month (UTC)." />
        <LimitsTable className="mt-10" />
        <p className="mt-6 text-sm">
          <Link href="/pricing/compare-plans" className="link-draw inline-flex items-center gap-1 font-medium text-foreground">
            Compare every feature side by side <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </p>
      </Section>

      <Section size="sm" className="border-t border-border/60">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div data-reveal className="e3 rounded-[18px] p-6 sm:p-7">
              <Receipt className="size-5 text-signal-ink" aria-hidden="true" />
              <h2 className="text-display-4 mt-4">Billing questions?</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">INR through Razorpay, USD through Stripe, taxes added at checkout. The details:</p>
              <ul className="mt-5 divide-y divide-border border-y border-border">
                {MORE.map((m) => (
                  <li key={m.href}>
                    <Link href={m.href} className="group flex items-start justify-between gap-3 py-3.5">
                      <span>
                        <span className="block text-[14px] font-medium">{m.label}</span>
                        <span className="block text-[13px] text-muted-foreground">{m.body}</span>
                      </span>
                      <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-snap group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[13px] text-muted-foreground">
                Something else?{" "}
                <Link href="/contact-sales" className="link-draw font-medium text-foreground">
                  Contact sales
                </Link>
                .
              </p>
            </div>
          </aside>
          <div>
            <h2 className="text-display-3">Pricing questions.</h2>
            <FAQ items={PRICING_FAQ} withJsonLd className="mt-8" />
          </div>
        </div>
      </Section>

      <CTABand tone="pricing" title="Start on the Free plan." description="No card required. Upgrade from Settings, Billing whenever you are ready." primary={{ label: "Start building", href: "/signup" }} secondary={{ label: "Contact sales", href: "/contact-sales" }} />
    </div>
  );
}
