"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import type { Currency } from "@/db/schema";
import { formatPrice, type PlanPrice } from "@/config/plans";
import { DEFAULT_USAGE, FINDER_RANGES, explainPlan, maxAnnualSavingPercent, type Usage, type UsageKey } from "@/content/marketing/plan-finder";
import { buttonClasses } from "@/components/ui/button";
import { Odometer } from "@/components/motion/odometer";
import { GlideIndicator, useGlide } from "@/components/motion/glide";
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
  limits: { aiRequests: number; previewMinutes: number; members: number };
  /** Limit meters: `share` is the bar length on a log scale (computed on the server from PLANS); value −1 = custom. */
  meters: { label: string; value: number; share: number }[];
};

type Interval = "month" | "year";

/** A labelled radiogroup with a gliding pill and arrow-key navigation (Billing, Currency). */
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
  const id = React.useId();
  const group = React.useRef<HTMLDivElement>(null);
  const pill = useGlide(group, { selector: '[aria-checked="true"]' });
  const onKey = (e: React.KeyboardEvent) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + dir + options.length) % options.length].value;
    onChange(next);
    requestAnimationFrame(() => group.current?.querySelector<HTMLElement>(`[data-value="${next}"]`)?.focus());
  };
  return (
    <div className="inline-flex items-center gap-2.5">
      <span id={id} className="text-label text-muted-foreground">
        {label}
      </span>
      <div ref={group} role="radiogroup" aria-labelledby={id} onKeyDown={onKey} className="relative inline-flex rounded-full border border-border bg-surface/80 p-1 shadow-[inset_0_1px_0_var(--hairline)] backdrop-blur">
        <GlideIndicator ref={pill} className="inset-y-1 rounded-full" />
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            tabIndex={value === o.value ? 0 : -1}
            data-value={o.value}
            data-no-ripple
            onClick={() => onChange(o.value)}
            className={cn("relative z-[1] inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-medium transition-colors duration-200", value === o.value ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {o.label}
            {o.hint ? <span className="rounded-full bg-success/12 px-1.5 py-px text-[11px] font-semibold text-success">{o.hint}</span> : null}
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
  const save = maxAnnualSavingPercent(currency);
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
      <Toggle
        label="Billing"
        value={interval}
        onChange={onInterval}
        options={[
          { value: "month", label: "Monthly" },
          { value: "year", label: "Annual", hint: save > 0 ? `Save up to ${save}%` : undefined },
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

/** The Odometer form of formatPrice(): same currency, locale and rounding, with rolling digits. */
function PriceRoll({ minor, currency, className }: { minor: number; currency: Currency; className?: string }) {
  return <Odometer value={minor / 100} trigger="change" locale={currency === "INR" ? "en-IN" : "en-US"} format={{ style: "currency", currency, maximumFractionDigits: 0 }} className={cn("mk-num", className)} />;
}

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
/** Feature lines that restate a metered limit ("1,000 AI requests / month") are shown as meters instead. */
const isLimitLine = (f: string) => /^\d/.test(f);

function Meters({ meters }: { meters: PricingPlanView["meters"] }) {
  return (
    <dl className="space-y-2.5">
      {meters.map((m) => (
        <div key={m.label}>
          <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
            <dt className="text-muted-foreground">{m.label}</dt>
            <dd className="font-medium tabular-nums text-foreground">{m.value < 0 ? "Custom" : fmt(m.value)}</dd>
          </div>
          <div aria-hidden="true" className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted shadow-[inset_0_0_0_1px_var(--border)]">
            <span className={cn("mk-meter block h-full origin-left rounded-full", m.value < 0 ? "bg-[repeating-linear-gradient(90deg,var(--foreground-dim)_0_6px,transparent_6px_10px)]" : "bg-gradient-to-r from-foreground/55 to-foreground")} style={{ "--share": m.share } as React.CSSProperties} />
          </div>
        </div>
      ))}
    </dl>
  );
}

function PlanCard({ p, prev, currency, interval, compact, fit }: { p: PricingPlanView; prev?: PricingPlanView; currency: Currency; interval: Interval; compact?: boolean; fit: boolean }) {
  const line = p.prices ? priceLine(p.prices, currency, interval) : null;
  const extras = p.features.filter((f) => !isLimitLine(f));
  return (
    <div className="relative flex h-full flex-col p-6 sm:p-7">
      {p.highlight ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(90%_55%_at_50%_0%,color-mix(in_oklab,var(--signal)_13%,transparent),transparent_70%)]" />
      ) : null}
      <div className="relative flex items-center justify-between gap-2">
        <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{p.name}</h3>
        {p.highlight ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background">
            <Sparkles className="size-3" aria-hidden="true" />
            Recommended
          </span>
        ) : null}
      </div>
      <p className="relative mt-1.5 min-h-[2.75rem] text-[13.5px] leading-snug text-muted-foreground">{p.tagline}</p>
      <div className="relative mt-5 min-h-[5.5rem]">
        {line ? (
          <>
            <p className="flex items-baseline gap-1.5">
              <PriceRoll minor={line.perMonth} currency={currency} className="mk-num font-display text-[3.5rem] font-bold leading-none tracking-[-0.04em] [font-stretch:104%]" />
              <span className="text-sm text-muted-foreground">/ month</span>
            </p>
            <p className="mt-2 text-[12.5px] leading-snug text-muted-foreground">
              {line.perMonth === 0
                ? "Free forever on the Free plan limits."
                : interval === "year"
                  ? `Billed annually as ${formatPrice(line.annualTotal, currency)} (save ${formatPrice(line.savings, currency)} a year).`
                  : "Billed monthly. Cancel any time."}
            </p>
          </>
        ) : (
          <>
            <p className="mk-num font-display text-[3.5rem] font-bold leading-none tracking-[-0.04em] [font-stretch:104%]">Custom</p>
            <p className="mt-2 text-[12.5px] leading-snug text-muted-foreground">Priced per agreement; invoice billing available.</p>
          </>
        )}
      </div>
      <Link href={p.cta.href} className={buttonClasses(p.highlight ? "secondary" : "outline", "md", "relative mt-6 w-full")}>
        {p.cta.label}
        {p.highlight ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
      </Link>
      {!compact ? (
        <>
          <div className="relative mt-7 border-t border-border pt-6">
            <Meters meters={p.meters} />
          </div>
          <div className="relative mt-6">
            <p className="text-[12.5px] font-medium text-foreground">{prev ? `Everything in ${prev.name}, plus:` : "Includes:"}</p>
            <ul className="mt-3 space-y-2 text-[13.5px]">
              {extras.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  <span className="text-foreground/85">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <p className="relative mt-4 text-xs text-muted-foreground">{p.audience}</p>
      )}
      {fit ? <span className="sr-only">Fits the usage you entered in the plan finder.</span> : null}
    </div>
  );
}

const USAGE_LABELS: Record<UsageKey, { label: string; unit: string }> = {
  aiRequests: { label: "AI requests a month", unit: "requests" },
  previewHours: { label: "Preview hours a month", unit: "hours" },
  members: { label: "Members", unit: "people" },
};

function PlanFinder({ usage, onUsage, currency, plans }: { usage: Usage; onUsage: (u: Usage) => void; currency: Currency; plans: PricingPlanView[] }) {
  const id = React.useId();
  const { plan, ruledOut } = explainPlan(usage, currency);
  const name = (pid: string) => plans.find((p) => p.id === pid)?.name ?? pid;
  const blockers = ruledOut.filter((r) => r.by.length).map((r) => `${name(r.plan)} allows fewer ${r.by.map((k) => USAGE_LABELS[k].unit).join(" and ")}`);
  const reason = blockers.length ? `${blockers.join("; ")}.` : "It is the cheapest plan, and your usage is within its limits.";
  return (
    <section aria-labelledby={`${id}-title`} className="mt-14 overflow-hidden rounded-[20px] border border-border bg-card/70 shadow-[inset_0_1px_0_var(--hairline)] backdrop-blur">
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <div>
          <p className="text-label flex items-center gap-2 text-muted-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-signal" />
            Plan finder
          </p>
          <h3 id={`${id}-title`} className="text-display-4 mt-4">
            Which plan fits your month?
          </h3>
          <p aria-live="polite" className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">{name(plan)}</span> is the cheapest plan that covers it. {reason}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Uses the same limits the server enforces. Nothing is saved.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {(Object.keys(USAGE_LABELS) as UsageKey[]).map((k) => {
            const r = FINDER_RANGES[k];
            const inputId = `${id}-${k}`;
            return (
              <div key={k}>
                <label htmlFor={inputId} className="block text-[13px] text-muted-foreground">
                  {USAGE_LABELS[k].label}
                </label>
                <output htmlFor={inputId} className="mk-num mt-1 block font-display text-[2rem] font-bold leading-none tracking-[-0.03em] tabular-nums [font-stretch:104%]">
                  {fmt(usage[k])}
                </output>
                <input
                  id={inputId}
                  type="range"
                  min={r.min}
                  max={r.max}
                  step={r.step}
                  value={usage[k]}
                  onChange={(e) => onUsage({ ...usage, [k]: Number(e.target.value) })}
                  className="mt-3 w-full accent-signal"
                />
                <div aria-hidden="true" className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                  <span>{fmt(r.min)}</span>
                  <span>{fmt(r.max)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PricingTableClient({ plans, compact, finder = false }: { plans: PricingPlanView[]; compact?: boolean; finder?: boolean }) {
  const [currency, setCurrency] = React.useState<Currency>("USD");
  const [interval, setInterval] = React.useState<Interval>("month");
  const [usage, setUsage] = React.useState<Usage>(DEFAULT_USAGE);
  const [touched, setTouched] = React.useState(false);
  const fitId = finder && touched ? explainPlan(usage, currency).plan : null;

  return (
    <div>
      <PricingToggles currency={currency} interval={interval} onCurrency={setCurrency} onInterval={setInterval} />
      <ul className={cn("mt-12 grid gap-4 text-left", plans.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3")}>
        {plans.map((p, i) => {
          const fit = fitId === p.id;
          const card = <PlanCard p={p} prev={plans[i - 1]} currency={currency} interval={interval} compact={compact} fit={fit} />;
          return (
            <li key={p.id} data-reveal style={{ "--reveal-delay": `${i * 70}ms` } as React.CSSProperties} className={cn("relative", p.highlight && "xl:-translate-y-2")}>
              {fit ? (
                <span className="pop-in absolute -top-3 right-5 z-[3] inline-flex items-center gap-1 rounded-full bg-[image:var(--ember)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--ember-ink)] shadow-[var(--glow-signal)]">
                  <Check className="size-3" aria-hidden="true" strokeWidth={3} />
                  Fits your usage
                </span>
              ) : null}
              {p.highlight ? (
                <div className={cn("comet-border h-full shadow-xl", fit && "ring-2 ring-signal ring-offset-2 ring-offset-background")} data-active="">
                  <div className="comet-border__inner h-full overflow-hidden">{card}</div>
                </div>
              ) : (
                <div className={cn("h-full rounded-[20px] border border-border bg-card shadow-[inset_0_1px_0_var(--hairline)] transition-[border-color,box-shadow] duration-300 hover:border-border-strong", fit && "ring-2 ring-signal ring-offset-2 ring-offset-background")}>{card}</div>
              )}
            </li>
          );
        })}
      </ul>
      {finder ? (
        <PlanFinder
          usage={usage}
          currency={currency}
          plans={plans}
          onUsage={(u) => {
            setTouched(true);
            setUsage(u);
          }}
        />
      ) : null}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Prices exclude applicable taxes (GST in India, sales tax or VAT elsewhere). International cards are billed through Stripe; Indian customers can pay through Razorpay.
      </p>
    </div>
  );
}
