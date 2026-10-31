import Link from "next/link";
import { Check, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { Crosshairs, SectionHead } from "./frame";
import type { HomePlan } from "./data";

/** 04 Pricing: four plan cells read from PLANS (price, INR price, the first features, the plan's own CTA). */
export function HomePricing({ plans }: { plans: HomePlan[] }) {
  return (
    <section aria-labelledby="pricing-title" className="mkg-row">
      <SectionHead id="pricing-title" index="04" label="Pricing" title="Start free." dim="Upgrade when it ships.">
        <p>
          Prices shown in USD and INR, excluding applicable taxes. Change or cancel your plan from workspace settings.{" "}
          <Link href="/pricing" className="mkg-inline-link">
            Compare plans
          </Link>
        </p>
      </SectionHead>
      <ul className="mkg-price">
        {plans.map((p) => (
          <li key={p.id} className={cn(p.highlight && "mkg-price__hl")}>
            <h3 className="mkg-price__n">{p.name}</h3>
            <p className="mkg-price__v">
              {p.price}
              {p.per ? <small> {p.per}</small> : null}
            </p>
            <p className="mkg-price__inr">{p.inr || "\u00a0"}</p>
            <ul className="mkg-price__f">
              {p.features.map((f) => (
                <li key={f}>
                  <Check className="size-4 shrink-0" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href={p.cta.href} className={cn("mkb", p.highlight && "mkb--solid")} aria-label={`${p.cta.label}: ${p.name} plan`}>
              {p.cta.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Closing row: one line and the two ways in (the web app, or the Windows app). */
export function HomeCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section aria-labelledby="cta-title" className="mkg-row mkg-cta">
      <h2 id="cta-title" className="mkg-h2">
        Build the first version today.
      </h2>
      <div className="mkg-ctas">
        <Link href={signedIn ? "/dashboard" : "/signup"} className="mkb mkb--solid mkb--lg">
          {signedIn ? "Open dashboard" : "Start building"}
        </Link>
        <Link href="/download" className="mkb mkb--lg">
          <Monitor className="size-4" aria-hidden="true" />
          Get the Windows app
        </Link>
      </div>
      <Crosshairs corners={["bl", "br"]} />
    </section>
  );
}
