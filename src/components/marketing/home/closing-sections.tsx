import Link from "next/link";
import { ArrowRight, Check, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQ } from "@/components/marketing/faq";
import { SpaceBackdrop } from "@/components/space/space-backdrop";
import type { FAQItem } from "@/content/marketing/types";
import { Crosshairs, Eyebrow, SectionHead } from "./frame";
import type { HomePlan } from "./data";

/** 05 Pricing: four plan cells read from PLANS (price, INR price, the first features, the plan's own CTA). */
export function HomePricing({ plans }: { plans: HomePlan[] }) {
  return (
    <section aria-labelledby="pricing-title" className="mkg-row">
      <SectionHead id="pricing-title" index="05" label="Pricing" title="Start free." dim="Upgrade when it ships.">
        <p>
          Prices in USD and INR, excluding applicable taxes. Change or cancel your plan from workspace settings.{" "}
          <Link href="/pricing" className="mkg-inline-link">
            Compare plans
          </Link>
        </p>
      </SectionHead>
      <ul className="hm-price">
        {plans.map((p) => (
          <li key={p.id} className={cn(p.highlight && "hm-price__hl")}>
            <div className="hm-price__top">
              <h3 className="hm-price__n">{p.name}</h3>
              {p.highlight ? <span className="hm-price__badge">Recommended</span> : null}
            </div>
            <p className="hm-price__v">
              {p.price}
              {p.per ? <small> {p.per}</small> : null}
            </p>
            <p className="hm-price__inr">{p.inr || "\u00a0"}</p>
            <ul className="hm-price__f">
              {p.features.map((f) => (
                <li key={f}>
                  <Check className="size-3.5 shrink-0" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href={p.cta.href} className={cn("mkb mkb--block", p.highlight && "mkb--solid")} aria-label={`${p.cta.label}: ${p.name} plan`}>
              {p.cta.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 06 FAQ: six questions answered from repo facts, on the shared native <details> accordion (with FAQPage JSON-LD). */
export function HomeFaq({ items }: { items: FAQItem[] }) {
  return (
    <section aria-labelledby="faq-title" className="mkg-row hm-faq">
      <div className="hm-faq__head">
        <Eyebrow index="06">FAQ</Eyebrow>
        <h2 id="faq-title" className="mkg-h2">
          Questions,
          <br />
          <span>answered.</span>
        </h2>
        <p>
          More in the{" "}
          <Link href="/help" className="mkg-inline-link">
            help center
          </Link>{" "}
          or{" "}
          <Link href="/contact" className="mkg-inline-link">
            contact us
          </Link>
          .
        </p>
      </div>
      <FAQ items={items} withJsonLd className="hm-faq__list" />
    </section>
  );
}

/** Closing band: full-bleed live scene (the galaxy by night, its star-chart pair by day), the line and the two ways in. */
export function HomeCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section aria-labelledby="cta-title" className="hm-final" data-space-hero data-space-host>
      <SpaceBackdrop scene="galaxy" variant="stage" />
      <div aria-hidden="true" className="hm-hero__rails" />
      <div className="hm-final__inner">
        <h2 id="cta-title" className="hm-final__h">
          Build the first version
          <br />
          <span>today.</span>
        </h2>
        <p className="hm-lede">Free to start. Your code, your domain, your call.</p>
        <div className="hm-ctas">
          <Link href={signedIn ? "/dashboard" : "/signup"} className="mkb mkb--solid mkb--lg">
            {signedIn ? "Open dashboard" : "Start building for free"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href="/download" className="mkb mkb--lg hm-glassbtn">
            <Monitor className="size-4" aria-hidden="true" />
            Get the Windows app
          </Link>
        </div>
      </div>
      <div className="hm-final__frame" aria-hidden="true">
        <Crosshairs corners={["tl", "tr"]} />
      </div>
    </section>
  );
}
