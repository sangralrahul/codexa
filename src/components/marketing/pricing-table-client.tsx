"use client";

import Link from "next/link";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { Currency } from "@/db/schema";
import { formatPrice, type PlanPrice } from "@/config/plans";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PricingPlanView = {
  id: string;
  name: string;
  tagline: string;
  audience: string;
  prices: Record<Currency, PlanPrice> | null;
  features: string[];
  cta: { label: string; href: string };
  highlight: boolean;
};

type Interval = "month" | "year";

function Toggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  const group = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  // The pill slides under the selected option; measured from the DOM so labels can differ in width.
  useLayoutEffect(() => {
    const active = group.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!active || !pill.current) return;
    pill.current.style.width = `${active.offsetWidth}px`;
    pill.current.style.transform = `translateX(${active.offsetLeft}px)`;
  }, [value]);
  return (
    <div className="inline-flex items-center gap-2">
      <span id={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div ref={group} role="radiogroup" aria-labelledby={id} className="segmented inline-flex rounded-lg border border-border bg-surface p-0.5">
        <span ref={pill} aria-hidden="true" className="segmented__pill" />
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground", value === o.value && "text-foreground")}
          >
            {o.label}
            {o.hint ? <span className="ml-1 text-xs text-success">{o.hint}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PricingToggles({
  currency,
  interval,
  onCurrency,
  onInterval,
}: {
  currency: Currency;
  interval: Interval;
  onCurrency: (c: Currency) => void;
  onInterval: (i: Interval) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <Toggle
        label="Billing"
        value={interval}
        onChange={onInterval}
        options={[
          { value: "month", label: "Monthly" },
          { value: "year", label: "Annual", hint: "save up to 20%" },
        ]}
      />
      <Toggle
        label="Currency"
        value={currency}
        onChange={onCurrency}
        options={[
          { value: "USD", label: "USD" },
          { value: "INR", label: "INR" },
        ]}
      />
    </div>
  );
}

export function priceLine(prices: Record<Currency, PlanPrice>, currency: Currency, interval: Interval) {
  const perMonth = prices[currency][interval];
  const annualTotal = prices[currency].year * 12;
  const monthlyTotal = prices[currency].month * 12;
  const savings = monthlyTotal - annualTotal;
  return { perMonth, annualTotal, savings };
}

export function PricingTableClient({ plans, compact }: { plans: PricingPlanView[]; compact?: boolean }) {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [interval, setInterval] = useState<Interval>("month");

  return (
    <div>
      <PricingToggles currency={currency} interval={interval} onCurrency={setCurrency} onInterval={setInterval} />
      <ul className={cn("mt-8 grid gap-4", plans.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3")}>
        {plans.map((p) => {
          const line = p.prices ? priceLine(p.prices, currency, interval) : null;
          return (
            <li
              key={p.id}
              data-reveal
              className={cn(
                "glow-card relative flex flex-col overflow-visible rounded-2xl border p-7",
                p.highlight ? "border-foreground/80 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] lg:-translate-y-2" : "border-border",
              )}
            >
              {p.highlight ? (
                <Badge className="absolute -top-2.5 left-6 border-0 bg-foreground text-background">
                  Recommended
                </Badge>
              ) : null}
              <h3 className="text-lg font-semibold tracking-tight">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
              <div className="mt-5 min-h-[4.5rem]">
                {line ? (
                  <>
                    <p className="flex items-baseline gap-1">
                      <span key={`${currency}-${interval}`} className="value-flip text-3xl font-semibold tracking-tight tabular-nums">{formatPrice(line.perMonth, currency)}</span>
                      <span className="text-sm text-muted-foreground">/ month</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {line.perMonth === 0
                        ? "Free forever on the Free plan limits."
                        : interval === "year"
                          ? `Billed annually as ${formatPrice(line.annualTotal, currency)} (save ${formatPrice(line.savings, currency)} a year).`
                          : "Billed monthly. Cancel any time."}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-semibold tracking-tight">Custom</p>
                    <p className="mt-1 text-xs text-muted-foreground">Priced per agreement; invoice billing available.</p>
                  </>
                )}
              </div>
              <Link href={p.cta.href} className={cn(buttonClasses(p.highlight ? "secondary" : "outline", "md"), "mt-6 w-full rounded-full", p.highlight && "btn-solid")}>
                {p.cta.label}
              </Link>
              {!compact ? (
                <ul className="mt-6 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">{p.audience}</p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Prices exclude applicable taxes (GST in India, sales tax or VAT elsewhere). International cards are billed through Stripe; Indian customers can pay through Razorpay.
      </p>
    </div>
  );
}
