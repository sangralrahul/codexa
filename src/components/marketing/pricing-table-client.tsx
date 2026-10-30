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
      {/* Phones: the label is for screen readers only, so both toggles fit on one centred row. */}
      <span id={id} className="text-label text-muted-foreground max-sm:sr-only">
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
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3 sm:gap-x-6">
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

/**
 * Rough width of a formatted price in the display face, in em (Mona Sans bold, -0.04em tracking):
 * currency sign and digits about 0.62em, separators about 0.26em. It errs wide on purpose; the CSS
 * uses the widest price in the row to pick one number size that leaves room for "/ month".
 */
function priceEm(minor: number, currency: Currency) {
  const text = formatPrice(minor, currency);
  let em = 0;
  for (const c of text) em += /[0-9$₹€£]/.test(c) ? 0.62 : /[,.]/.test(c) ? 0.26 : c.trim() ? 0.62 : 0.25;
  return Math.round(em * 100) / 100;
}

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
/** Feature lines that restate a metered limit ("1,000 AI requests / month") are shown as meters instead. */
const isLimitLine = (f: string) => /^\d/.test(f);

function Meters({ meters }: { meters: PricingPlanView["meters"] }) {
  return (
    <dl className="space-y-2.5">
      {meters.map((m) => (
        // dt/dd stay direct children of the group div (valid dl); the meter bar sits inside the dd, pinned under the row.
        <div key={m.label} className="relative flex items-baseline justify-between gap-3 pb-2.5 text-[12.5px]">
          <dt className="text-muted-foreground">{m.label}</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {m.value < 0 ? "Custom" : fmt(m.value)}
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 block h-1 overflow-hidden rounded-full bg-muted shadow-[inset_0_0_0_1px_var(--border)]">
              <span className={cn("mk-meter block h-full origin-left rounded-full", m.value < 0 ? "bg-[repeating-linear-gradient(90deg,var(--foreground-dim)_0_6px,transparent_6px_10px)]" : "bg-foreground/60")} style={{ "--share": m.share } as React.CSSProperties} />
            </span>
          </dd>
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
      <div className="relative flex items-center justify-between gap-2">
        <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{p.name}</h3>
        {p.highlight ? <span className="sr-only">Recommended</span> : null}
      </div>
      <p className="relative mt-1.5 min-h-[2.75rem] text-[13.5px] leading-snug text-muted-foreground">{p.tagline}</p>
      {/* Fixed height for the price and its note, so every card's button (and the meters under it)
          sits on one line for every currency and interval: the number is sized from the card width
          and the longest price in the row (`--price-em`, set on the list), the unit never splits
          ("/ month" moves as one piece), and the note always reserves two lines. */}
      <div className="mk-price relative mt-5 min-h-[6.5rem]">
        {line ? (
          <>
            <p className="flex flex-wrap items-baseline gap-x-1.5">
              <PriceRoll minor={line.perMonth} currency={currency} className="mk-price__num font-display font-bold leading-none tracking-[-0.025em] [font-stretch:104%]" />
              <span className="whitespace-nowrap text-sm text-muted-foreground">/ month</span>
            </p>
            <p className="mt-2 min-h-[2.75em] text-[12.5px] leading-snug text-muted-foreground">
              {line.perMonth === 0
                ? "Free forever on the Free plan limits."
                : interval === "year"
                  ? `Billed annually as ${formatPrice(line.annualTotal, currency)} (save ${formatPrice(line.savings, currency)} a year).`
                  : "Billed monthly. Cancel any time."}
            </p>
          </>
        ) : (
          <>
            <p data-custom="" className="mk-price__num mk-num font-display font-bold leading-none tracking-[-0.025em] [font-stretch:104%]">
              Custom
            </p>
            <p className="mt-2 min-h-[2.75em] text-[12.5px] leading-snug text-muted-foreground">Priced per agreement; invoice billing available.</p>
          </>
        )}
      </div>
      <Link href={p.cta.href} data-btn="" className={cn("mk-btn relative mt-6 w-full", p.highlight ? "mk-btn--primary" : "mk-btn--secondary")}>
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

function PlanFinder({ usage, onUsage, currency, interval, plans }: { usage: Usage; onUsage: (u: Usage) => void; currency: Currency; interval: Interval; plans: PricingPlanView[] }) {
  const id = React.useId();
  const { plan, ruledOut } = explainPlan(usage, currency);
  const match = plans.find((p) => p.id === plan);
  const matchLine = match?.prices ? priceLine(match.prices, currency, interval) : null;
  const name = (pid: string) => plans.find((p) => p.id === pid)?.name ?? pid;
  const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs[0]);
  const blockers = ruledOut.filter((r) => r.by.length).map((r) => `${name(r.plan)} allows fewer ${list(r.by.map((k) => USAGE_LABELS[k].unit))}`);
  const reason = blockers.length ? `${blockers.join("; ")}.` : "It is the cheapest plan, and your usage is within its limits.";
  return (
    <section aria-labelledby={`${id}-title`} className="mk-card mt-14 overflow-hidden rounded-[20px]">
      <div className="grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <div>
          <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <span aria-hidden="true" className="inline-block size-2 rounded-[3px] bg-border-strong" />
            Plan finder
          </p>
          <h3 id={`${id}-title`} className="text-display-4 mt-4">
            Which plan fits your month?
          </h3>
          <p aria-live="polite" className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">{name(plan)}</span> is the cheapest plan that covers it. {reason}
          </p>
          {/* The answer itself, with its price and button: the plan cards above may be off-screen
              while the sliders move (the card's "Fits your usage" ring is secondary feedback). */}
          {match ? (
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] border border-border bg-background/60 py-3 pl-4 pr-3 shadow-[inset_0_1px_0_var(--hairline)]">
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold tracking-[-0.01em]">{match.name}</span>
                <span className="mk-num block text-[13px] text-muted-foreground">
                  {matchLine
                    ? `${formatPrice(matchLine.perMonth, currency)} / month${interval === "year" && matchLine.perMonth > 0 ? ", billed annually" : ""}`
                    : "Custom pricing"}
                </span>
              </span>
              <Link href={match.cta.href} className={buttonClasses("primary", "sm", "h-9 px-4")}>
                {match.cta.label}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">Uses the same limits the server enforces. Nothing is saved.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
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
                  className="mk-range mt-3 w-full"
                  style={{ "--fill": `${(((usage[k] - r.min) / Math.max(1, r.max - r.min)) * 100).toFixed(2)}%` } as React.CSSProperties}
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
  const widest = Math.max(1, ...plans.map((p) => (p.prices ? priceEm(p.prices[currency][interval], currency) : 0)));

  return (
    <div>
      <PricingToggles currency={currency} interval={interval} onCurrency={setCurrency} onInterval={setInterval} />
      <ul className={cn("mt-14 grid grid-cols-1 gap-5 text-left", plans.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3")} style={{ "--price-em": widest } as React.CSSProperties}>
        {plans.map((p, i) => {
          const fit = fitId === p.id;
          const card = <PlanCard p={p} prev={plans[i - 1]} currency={currency} interval={interval} compact={compact} fit={fit} />;
          return (
            <li key={p.id} data-reveal style={{ "--reveal-delay": `${i * 70}ms` } as React.CSSProperties} className={cn("relative", p.highlight && "xl:-translate-y-2")}>
              {fit ? (
                <span className="pop-in absolute -top-3 right-5 z-[3] inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-md">
                  <Check className="size-3" aria-hidden="true" strokeWidth={3} />
                  Fits your usage
                </span>
              ) : null}
              {p.highlight ? (
                <div className={cn("mk-pro h-full", fit && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
                  <span className="mk-pro__badge">
                    <Sparkles className="size-3" aria-hidden="true" />
                    Most popular
                  </span>
                  <div className="h-full overflow-hidden">{card}</div>
                </div>
              ) : (
                <div className={cn("mk-card mk-card--hover h-full overflow-hidden", fit && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>{card}</div>
              )}
            </li>
          );
        })}
      </ul>
      {finder ? (
        <PlanFinder
          usage={usage}
          currency={currency}
          interval={interval}
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
