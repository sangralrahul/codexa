import * as React from "react";
import type { Crumb, Tone } from "@/content/marketing/types";
import { cn } from "@/lib/utils";
import { Highlight } from "./backdrop";
import { Breadcrumbs } from "./breadcrumbs";
import { CtaLink, Mesh, Kicker as PremiumKicker } from "./premium";

export type HeaderAction = { label: string; href: string };
export type HeaderMeta = { label: string; value: React.ReactNode };

/** Section kicker ("AI AGENT"): a gradient square and a short indigo label. */
export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return <PremiumKicker className={className}>{children}</PremiumKicker>;
}

function Actions({ actions, center }: { actions?: HeaderAction[]; center?: boolean }) {
  if (!actions?.length) return null;
  const [primary, ...rest] = actions;
  return (
    <div className={cn("mt-8 flex flex-col gap-3 xs:flex-row xs:flex-wrap", center && "xs:justify-center")}>
      <CtaLink href={primary.href} arrow>
        {primary.label}
      </CtaLink>
      {rest.map((a) => (
        <CtaLink key={a.href} href={a.href} variant="secondary">
          {a.label}
        </CtaLink>
      ))}
    </div>
  );
}

/**
 * Inner-page header on the gradient mesh. One component, four variants; breadcrumbs always come
 * first, then the kicker, the h1 (bold display; optional gradient `highlight` phrase), the lede, and
 * a hairline that ends the header. `mark` is accepted for existing callers and rendered as plain text.
 * - product: split 5/7 with the page's visual on the right.
 * - index: title and a search or filter bar (children) as the hero object.
 * - editorial: title with a right meta column (updated, reading time, review status).
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
  /** Kept for existing callers; no accent treatment is applied. */
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
  void mark;
  const center = variant === "pricing";
  const heading = (
    <h1 className={cn("mk-h1", center ? "mx-auto max-w-[24ch]" : "max-w-[22ch]")}>
      <Highlight text={headline} highlight={highlight} />
    </h1>
  );
  const ledeEl = lede ? <p className={cn("mk-lead mt-6 max-w-[60ch]", center && "mx-auto")}>{lede}</p> : null;

  return (
    <header data-tone={tone} className={cn("relative isolate overflow-x-clip border-b border-border", className)}>
      <Mesh variant="soft" />
      <div className={cn("container-x relative pt-8 sm:pt-10", variant === "product" ? "pb-16 lg:pb-24" : "pb-14 lg:pb-20")}>
        <Breadcrumbs items={crumbs} className={cn(center && "flex justify-center")} />
        {variant === "product" ? (
          <div className={cn("mk-rise mt-10 grid grid-cols-1 items-center gap-12 lg:mt-14 lg:gap-14", visual ? "lg:grid-cols-12" : "")}>
            <div className={cn(visual ? "lg:col-span-5" : "max-w-3xl")}>
              {kicker ? <Kicker className="mb-5">{kicker}</Kicker> : null}
              {heading}
              {ledeEl}
              <Actions actions={actions} />
              {children}
            </div>
            {visual ? <div className="relative min-w-0 lg:col-span-7">{visual}</div> : null}
          </div>
        ) : variant === "editorial" ? (
          <div className="mk-rise mt-10 grid grid-cols-1 gap-8 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-end lg:gap-14">
            <div className="max-w-3xl">
              {kicker ? <Kicker className="mb-5">{kicker}</Kicker> : null}
              {heading}
              {ledeEl}
              <Actions actions={actions} />
              {children}
            </div>
            {meta?.length ? (
              <dl className="mk-card grid grid-cols-2 gap-x-6 gap-y-4 p-5 text-sm lg:grid-cols-1">
                {meta.map((m) => (
                  <div key={m.label}>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{m.label}</dt>
                    <dd className="mt-1.5 font-medium text-foreground/90">{m.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        ) : (
          <div className={cn("mk-rise mt-10 lg:mt-14", center ? "mx-auto max-w-3xl text-center" : "max-w-3xl")}>
            {kicker ? <Kicker className={cn("mb-5", center && "justify-center")}>{kicker}</Kicker> : null}
            {heading}
            {ledeEl}
            <Actions actions={actions} center={center} />
          </div>
        )}
        {variant === "index" || variant === "pricing" ? (children ? <div className={cn(variant === "pricing" ? "mt-12" : "mt-10 max-w-3xl")}>{children}</div> : null) : null}
      </div>
    </header>
  );
}
