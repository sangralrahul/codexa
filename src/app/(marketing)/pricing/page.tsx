import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { PRICING_FAQ } from "@/content/marketing/pricing";
import { FACTS } from "@/content/marketing/facts";
import { PricingTable } from "@/components/marketing/pricing-table";
import { LimitsTable } from "@/components/marketing/limits-table";
import { FAQ } from "@/components/marketing/faq";
import { CaptureShot } from "@/components/marketing/captures";
import { ClosingBand, Eyebrow, GridFrame, GridRow, PageHero, RowHead } from "@/components/marketing/page-grid";

export const metadata = routeMetadata("/pricing");

const MORE = [
  { label: "Billing FAQ", href: "/billing-faq", body: "Invoices, taxes, payment methods, cancelling." },
  { label: "How requests are counted", href: "/credits", body: "Requests, tokens and the monthly period." },
  { label: "How usage is measured", href: "/usage", body: "What is recorded, when, and where to see it." },
];

const IN_APP = [
  { k: "Reset", v: "Monthly counters reset on the first of each month (UTC)." },
  { k: "Change", v: "Upgrade or downgrade from Settings, Billing; the new limits apply at once." },
  { k: "Roles", v: `${FACTS.roles} workspace roles decide who can change billing.` },
];

export default function PricingPage() {
  return (
    <div data-tone="pricing" className="relative overflow-x-clip">
      <PageHero
        crumbs={[{ name: "Pricing", path: "/pricing" }]}
        eyebrow="Pricing"
        title="Start free."
        dim="Scale when it works."
        lede="Plans in USD and INR. Upgrade when you need more AI requests, runtime, deployments or collaborators; every limit is enforced per workspace on the server."
        scene="eclipse"
        align="center"
      />

      <GridFrame>
        <GridRow aria-labelledby="plans-title" crosshairs={false}>
          <h2 id="plans-title" className="sr-only">
            Plans
          </h2>
          <PricingTable finder />
        </GridRow>

        <GridRow aria-labelledby="limits-title">
          <RowHead id="limits-title" index="01" label="Limits" title="Usage limits by plan." dim="Read from the server's own config.">
            <p>
              Every number below comes from the plan configuration the server enforces. Monthly limits reset on the first of each month (UTC).{" "}
              <Link href="/pricing/compare-plans" className="pg-link">
                Compare every feature
              </Link>
            </p>
          </RowHead>
          <div className="border-t border-border">
            <LimitsTable />
          </div>
        </GridRow>

        <GridRow aria-labelledby="inapp-title" className="pg-split">
          <div>
            <div className="pg-split__sticky">
              <Eyebrow index="02">In the app</Eyebrow>
              <h2 id="inapp-title" className="pg-h2">
                Every limit is visible
                <br />
                <span>where you work.</span>
              </h2>
              <p className="mt-5 max-w-md text-[16px] text-muted-foreground">
                Usage meters for AI requests, runtime minutes, deployments and storage sit in Settings, next to billing. The same {FACTS.plans} plans, the same numbers the server enforces.
              </p>
              <dl className="mt-8 divide-y divide-dashed divide-border border-y border-dashed border-border">
                {IN_APP.map((r) => (
                  <div key={r.k} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 py-3.5 text-[14px]">
                    <dt className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-(--g-dim)">{r.k}</dt>
                    <dd className="text-foreground/85">{r.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="min-w-0">
            <CaptureShot id="settings" />
          </div>
        </GridRow>

        <GridRow aria-labelledby="faq-title" className="pg-split">
          <div>
            <div className="pg-split__sticky">
              <Eyebrow index="03">FAQ</Eyebrow>
              <h2 id="faq-title" className="pg-h2">
                Pricing questions,
                <br />
                <span>answered.</span>
              </h2>
              <p className="mt-5 max-w-md text-[15px] text-muted-foreground">INR through Razorpay, USD through Stripe, taxes added at checkout. The details:</p>
              <ul className="mt-6 divide-y divide-border border-y border-border">
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
              <p className="mt-5 text-[13.5px] text-muted-foreground">
                Something else?{" "}
                <Link href="/contact-sales" className="pg-link inline-flex items-center gap-0.5">
                  Contact sales <ArrowUpRight className="size-3" aria-hidden="true" />
                </Link>
              </p>
            </div>
          </div>
          <FAQ items={PRICING_FAQ} withJsonLd className="pg-faq" />
        </GridRow>
      </GridFrame>

      <ClosingBand
        title="Start on the Free plan."
        dim="Upgrade when it ships."
        lede="No card required. Upgrade from Settings, Billing whenever you are ready."
        actions={[
          { label: "Start building for free", href: "/signup" },
          { label: "Contact sales", href: "/contact-sales" },
        ]}
      />
    </div>
  );
}
