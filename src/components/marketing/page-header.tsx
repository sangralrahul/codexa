import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SplitHeading } from "@/components/motion/split-heading";
import { buttonClasses } from "@/components/ui/button";
import type { Crumb, Tone } from "@/content/marketing/types";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "./breadcrumbs";

export type HeaderAction = { label: string; href: string };
export type HeaderMeta = { label: string; value: React.ReactNode };

/** Mono kicker with the signal dot ("AI AGENT"). */
export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-label ${cn("flex items-center gap-2.5 text-muted-foreground", className)}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-signal shadow-[0_0_0_3px_color-mix(in_oklab,var(--signal)_18%,transparent)]" />
      {children}
    </p>
  );
}

function Actions({ actions, center }: { actions?: HeaderAction[]; center?: boolean }) {
  if (!actions?.length) return null;
  const [primary, ...rest] = actions;
  return (
    <div className={cn("mt-9 flex flex-col gap-3 xs:flex-row xs:flex-wrap", center && "xs:justify-center")}>
      <Link href={primary.href} className={buttonClasses("secondary", "lg", "group")}>
        {primary.label}
        <ArrowRight className="size-4 transition-transform duration-300 ease-snap group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
      {rest.map((a) => (
        <Link key={a.href} href={a.href} className={buttonClasses("outline", "lg")}>
          {a.label}
        </Link>
      ))}
    </div>
  );
}

/**
 * Inner-page header (PLAN §5.3). One component, four variants; breadcrumbs always come first,
 * then a mono kicker, the curated h1 (SplitHeading line mask, optional selection `mark` and
 * two-tone `highlight`, both written by a person), the long title as the lede paragraph, and
 * a horizon line that ends the header.
 * - product: split 5/7 with the page's vignette window on the right.
 * - index: title and a 56px search or filter bar (children) as the hero object.
 * - editorial: display title with a right meta column (updated, reading time, review status).
 * - pricing: centred, with the toggles and cards (children) directly under it.
 */
export function PageHeader({
  variant = "product",
  crumbs,
  kicker,
  headline,
  mark,
  highlight,
  lede,
  actions,
  visual,
  meta,
  tone,
  children,
  className,
}: {
  variant?: "product" | "index" | "editorial" | "pricing";
  crumbs: Crumb[];
  kicker?: string;
  headline: string;
  mark?: string;
  highlight?: string;
  lede?: React.ReactNode;
  actions?: HeaderAction[];
  visual?: React.ReactNode;
  meta?: HeaderMeta[];
  tone?: Tone;
  children?: React.ReactNode;
  className?: string;
}) {
  const center = variant === "pricing";
  const heading = (
    <SplitHeading as="h1" size="display-2" mark={mark} dim={highlight} className={cn(center && "mx-auto", variant === "product" ? "lg:text-[clamp(3rem,1.7rem+2.3vw,4.25rem)]" : "max-w-[18ch]")}>
      {headline}
    </SplitHeading>
  );
  const ledeEl = lede ? (
    <p data-reveal style={{ "--reveal-delay": "220ms" } as React.CSSProperties} className={`text-lead ${cn("mt-6", center && "mx-auto")}`}>
      {lede}
    </p>
  ) : null;

  return (
    <header data-tone={tone} className={cn("relative overflow-x-clip", className)}>
      <div className={cn("container-x relative pt-6 sm:pt-8 lg:pt-10", variant === "product" ? "pb-16 lg:pb-24" : "pb-14 lg:pb-20")}>
        <Breadcrumbs items={crumbs} className={cn(center && "flex justify-center")} />
        {variant === "product" ? (
          <div className={cn("mt-10 grid grid-cols-1 items-center gap-12 lg:mt-14 lg:gap-14", visual ? "lg:grid-cols-12" : "")}>
            <div className={cn(visual ? "lg:col-span-5" : "max-w-3xl")}>
              {kicker ? <Kicker className="mb-6">{kicker}</Kicker> : null}
              {heading}
              {ledeEl}
              <Actions actions={actions} />
              {children}
            </div>
            {visual ? (
              <div data-reveal style={{ "--reveal-delay": "160ms" } as React.CSSProperties} className="relative min-w-0 lg:col-span-7">
                <div aria-hidden="true" className="pointer-events-none absolute -inset-x-10 -bottom-16 top-10 -z-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_60%_40%,color-mix(in_oklab,var(--signal)_14%,transparent),transparent_70%)] blur-2xl" />
                {visual}
              </div>
            ) : null}
          </div>
        ) : variant === "editorial" ? (
          <div className="mt-10 grid grid-cols-1 gap-10 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-end lg:gap-16">
            <div className="max-w-3xl">
              {kicker ? <Kicker className="mb-6">{kicker}</Kicker> : null}
              {heading}
              {ledeEl}
              <Actions actions={actions} />
              {children}
            </div>
            {meta?.length ? (
              <dl data-reveal style={{ "--reveal-delay": "200ms" } as React.CSSProperties} className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5 text-sm lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                {meta.map((m) => (
                  <div key={m.label}>
                    <dt className="text-label text-muted-foreground">{m.label}</dt>
                    <dd className="mt-1.5 text-foreground/90">{m.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        ) : (
          <div className={cn("mt-10 lg:mt-14", center ? "mx-auto max-w-4xl text-center" : "max-w-3xl")}>
            {kicker ? <Kicker className={cn("mb-6", center && "justify-center")}>{kicker}</Kicker> : null}
            {heading}
            {ledeEl}
            <Actions actions={actions} center={center} />
          </div>
        )}
        {variant === "index" || variant === "pricing" ? (children ? <div className={cn(variant === "pricing" ? "mt-8" : "mt-8 max-w-3xl")}>{children}</div> : null) : null}
      </div>
      <div aria-hidden="true" className="horizon-line" />
    </header>
  );
}
