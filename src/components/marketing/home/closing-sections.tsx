import Link from "next/link";
import * as React from "react";
import { ArrowRight, ArrowUpRight, CreditCard, IndianRupee, LifeBuoy, Smartphone } from "lucide-react";
import { PLANS, formatPrice } from "@/config/plans";
import { PRODUCT_FAQ } from "@/content/marketing/product";
import { FAQ } from "@/components/marketing/faq";
import { PricingTable } from "@/components/marketing/pricing-table";
import { PromptBox } from "@/components/marketing/prompt-box";
import { Horizon } from "@/components/marketing/backdrop";
import { HOME_FAQ, HOME_FINAL, HOME_PRICING } from "@/content/marketing/home";

const PAY_ICONS = { rupee: IndianRupee, phone: Smartphone, card: CreditCard } as const;

/** H7 pricing teaser: payment facts as chips, the compact plan table read from PLANS. */
export function PricingTeaser() {
  const ids = [PLANS.free.id, PLANS.pro.id, PLANS.team.id];
  return (
    <section aria-labelledby="pricing-title" className="relative py-16 sm:py-24 lg:py-28">
      <div className="container-x">
        <div data-reveal className="mx-auto max-w-4xl text-center">
          <p className="text-label mb-5 text-signal-ink">{HOME_PRICING.index}</p>
          <h2 id="pricing-title" className="text-display-2">
            {HOME_PRICING.title.replace(HOME_PRICING.highlight, "")}
            <span className="text-dim">{HOME_PRICING.highlight}</span>
          </h2>
          <p className="text-lead mx-auto mt-5">{HOME_PRICING.lead}</p>
          <ul aria-label="Payments" className="mt-7 flex flex-wrap justify-center gap-2">
            {HOME_PRICING.chips.map((c) => {
              const Icon = PAY_ICONS[c.icon];
              return (
                <li key={c.label} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 text-[13px] text-foreground/85 shadow-[inset_0_1px_0_var(--hairline)]">
                  <Icon className="size-3.5 text-signal" aria-hidden="true" />
                  {c.label}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="mt-12 hidden md:block">
          <PricingTable compact planIds={ids} />
        </div>
        {/* Phones: a short summary read from the same PLANS (toggles and details live on /pricing). */}
        <ul className="e1 mt-10 divide-y divide-border overflow-hidden rounded-2xl md:hidden">
          {ids.map((id) => {
            const p = PLANS[id];
            return (
              <li key={id}>
                <Link href={HOME_PRICING.full.href} className="flex items-center gap-4 px-4 py-4">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-display text-lg font-semibold tracking-[-0.02em]">{p.name}</span>
                      {p.highlight ? <span className="rounded-full border border-signal/30 px-1.5 py-px text-[10.5px] font-medium text-signal-ink">Recommended</span> : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{p.tagline}</span>
                  </span>
                  {p.prices ? (
                    <span className="shrink-0 text-right text-sm tabular-nums">
                      <span className="block font-medium text-foreground">{formatPrice(p.prices.INR.month, "INR")}/mo</span>
                      <span className="block text-xs text-muted-foreground">{formatPrice(p.prices.USD.month, "USD")}/mo</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-center text-xs text-muted-foreground md:hidden">Prices exclude applicable taxes. Annual billing and Enterprise on the pricing page.</p>
        <p className="mt-8 text-center text-sm">
          <Link href={HOME_PRICING.full.href} className="link-draw group/p inline-flex items-center gap-1 font-medium text-foreground">
            {HOME_PRICING.full.label}
            <ArrowUpRight className="size-3.5 transition-transform group-hover/p:-translate-y-0.5 group-hover/p:translate-x-0.5" aria-hidden="true" />
          </Link>
        </p>
      </div>
    </section>
  );
}

/** H8 FAQ: a sticky heading beside the accordion (which also emits the FAQPage JSON-LD). */
export function FaqSection() {
  return (
    <section aria-labelledby="faq-title" className="relative py-16 sm:py-24 lg:py-28">
      <div className="container-x grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start" data-reveal>
          <p className="text-label mb-5 text-signal-ink">{HOME_FAQ.index}</p>
          <h2 id="faq-title" className="text-display-3">
            {HOME_FAQ.title}
          </h2>
          <Link href={HOME_FAQ.support.href} className="group/s mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <LifeBuoy className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="link-draw">{HOME_FAQ.support.label}</span>
            <ArrowRight className="size-3.5 transition-transform group-hover/s:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        <FAQ items={PRODUCT_FAQ} withJsonLd />
      </div>
    </section>
  );
}

/** H9 final CTA: the same composer (compact, source "cta") over a CSS-only Horizon and the blueprint grid. */
export function FinalCta({ signedIn, freePlan }: { signedIn: boolean; freePlan: { name: string; isFree: boolean } }) {
  return (
    <section aria-labelledby="final-title" className="relative isolate overflow-hidden py-20 sm:py-28 lg:py-36">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-blueprint absolute inset-0 [mask-image:radial-gradient(70%_70%_at_50%_60%,black,transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-[520px] [mask-image:linear-gradient(to_bottom,black_58%,transparent_100%)]">
          <Horizon still className="bottom-0" />
        </div>
        <div className="bg-noise absolute inset-0" />
      </div>
      <span aria-hidden="true" className="horizon-line absolute inset-x-0 top-0 opacity-50" />
      <div className="container-x text-center">
        <h2 id="final-title" data-reveal className="text-display-2 mx-auto max-w-[16ch]">
          {HOME_FINAL.title.replace(HOME_FINAL.highlight, "")}
          <span className="text-dim">{HOME_FINAL.highlight}</span>
        </h2>
        <div data-reveal style={{ "--reveal-delay": "80ms" } as React.CSSProperties} className="mt-10">
          <PromptBox signedIn={signedIn} variant="compact" source="cta" />
        </div>
        <p className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {freePlan.isFree ? <span>{freePlan.name} plan, no card required</span> : null}
          {freePlan.isFree ? (
            <span aria-hidden="true" className="text-border-strong">
              ·
            </span>
          ) : null}
          <Link href={HOME_FINAL.pricing.href} className="link-draw font-medium text-foreground">
            {HOME_FINAL.pricing.label}
          </Link>
        </p>
      </div>
    </section>
  );
}
