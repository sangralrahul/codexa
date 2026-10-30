import Link from "next/link";
import { ArrowRight, ArrowUpRight, CreditCard, IndianRupee, LifeBuoy, Smartphone } from "lucide-react";
import { PLANS, formatPrice } from "@/config/plans";
import { PRODUCT_FAQ } from "@/content/marketing/product";
import { FAQ } from "@/components/marketing/faq";
import { PricingTable } from "@/components/marketing/pricing-table";
import { PromptBox } from "@/components/marketing/prompt-box";
import { SectionHeader } from "@/components/marketing/section";
import { HOME_FAQ, HOME_FINAL, HOME_PRICING } from "@/content/marketing/home";

const PAY_ICONS = { rupee: IndianRupee, phone: Smartphone, card: CreditCard } as const;

/** H6 pricing teaser: a plain header, payment facts, and the compact plan table read from PLANS. */
export function PricingTeaser() {
  const ids = [PLANS.free.id, PLANS.pro.id, PLANS.team.id];
  return (
    <section aria-labelledby="pricing-title" className="border-b border-border py-14 lg:py-20">
      <div className="container-x">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader index={HOME_PRICING.index} title={HOME_PRICING.title} lead={HOME_PRICING.lead} className="max-w-3xl" />
          <ul aria-label="Payments" className="flex flex-wrap gap-2 lg:pb-1">
            {HOME_PRICING.chips.map((c) => {
              const Icon = PAY_ICONS[c.icon];
              return (
                <li key={c.label} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-border bg-card px-2.5 text-[13px] text-foreground/85">
                  <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {c.label}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="mt-10 hidden md:block">
          <PricingTable compact planIds={ids} />
        </div>
        {/* Phones: a short summary read from the same PLANS (toggles and details live on /pricing). */}
        <ul className="mt-8 divide-y divide-border overflow-hidden rounded-[12px] border border-border bg-card md:hidden">
          {ids.map((id) => {
            const p = PLANS[id];
            return (
              <li key={id}>
                <Link href={HOME_PRICING.full.href} className="flex items-center gap-4 px-4 py-4">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-display text-lg font-semibold tracking-[-0.02em]">{p.name}</span>
                      {p.highlight ? <span className="rounded-full border border-primary/30 px-1.5 py-px text-[10.5px] font-medium text-primary">Recommended</span> : null}
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
        <p className="mt-3 text-xs text-muted-foreground md:hidden">Prices exclude applicable taxes. Annual billing and Enterprise on the pricing page.</p>
        <p className="mt-6 text-sm">
          <Link href={HOME_PRICING.full.href} className="link-draw group/p inline-flex items-center gap-1 font-medium text-foreground">
            {HOME_PRICING.full.label}
            <ArrowUpRight className="size-3.5 transition-transform group-hover/p:-translate-y-0.5 group-hover/p:translate-x-0.5" aria-hidden="true" />
          </Link>
        </p>
      </div>
    </section>
  );
}

/** H7 FAQ: a sticky heading beside the accordion (which also emits the FAQPage JSON-LD). */
export function FaqSection() {
  return (
    <section aria-labelledby="faq-title" className="border-b border-border py-14 lg:py-20">
      <div className="container-x grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <SectionHeader index={HOME_FAQ.index} title={HOME_FAQ.title} />
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

/** H8 final CTA: the same composer (compact, source "cta") on a plain surface band. */
export function FinalCta({ signedIn, freePlan }: { signedIn: boolean; freePlan: { name: string; isFree: boolean } }) {
  return (
    <section aria-labelledby="final-title" className="bg-surface/60 py-16 lg:py-24">
      <div className="container-x text-center">
        <h2 id="final-title" className="mk-h2 mx-auto max-w-[20ch]">
          {HOME_FINAL.title}
        </h2>
        <p className="text-lead mx-auto mt-4">{HOME_FINAL.lead}</p>
        <div className="mt-8">
          <PromptBox signedIn={signedIn} variant="compact" source="cta" capabilityChip={false} />
        </div>
        <p className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
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
