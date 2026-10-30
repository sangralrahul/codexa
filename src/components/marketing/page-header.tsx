import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import type { Crumb, Tone } from "@/content/marketing/types";
import { cn } from "@/lib/utils";
import { Highlight } from "./backdrop";
import { Breadcrumbs } from "./breadcrumbs";

export type HeaderAction = { label: string; href: string };
export type HeaderMeta = { label: string; value: React.ReactNode };

/** Mono kicker with the accent dot ("AI AGENT"). */
export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-label ${cn("flex items-center gap-2.5 text-muted-foreground", className)}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
      {children}
    </p>
  );
}

function Actions({ actions, center }: { actions?: HeaderAction[]; center?: boolean }) {
  if (!actions?.length) return null;
  const [primary, ...rest] = actions;
  return (
    <div className={cn("mt-7 flex flex-col gap-3 xs:flex-row xs:flex-wrap", center && "xs:justify-center")}>
      <Link href={primary.href} className={buttonClasses("primary", "md", "group")}>
        {primary.label}
        <ArrowRight className="size-4 transition-transform duration-300 ease-snap group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
      {rest.map((a) => (
        <Link key={a.href} href={a.href} className={buttonClasses("outline", "md")}>
          {a.label}
        </Link>
      ))}
    </div>
  );
}

/**
 * Inner-page header. One component, four variants; breadcrumbs always come first, then a mono
 * kicker, the h1 (plain sans; an optional two-tone `highlight`), the lede paragraph, and a hairline
 * that ends the header. `mark` is accepted for existing callers and rendered as plain text.
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
  const ledeEl = lede ? <p className={`text-lead ${cn("mt-5", center && "mx-auto")}`}>{lede}</p> : null;

  return (
    <header data-tone={tone} className={cn("relative overflow-x-clip border-b border-border bg-surface/60", className)}>
      <div className={cn("container-x relative pt-6 sm:pt-8", variant === "product" ? "pb-12 lg:pb-16" : "pb-10 lg:pb-14")}>
        <Breadcrumbs items={crumbs} className={cn(center && "flex justify-center")} />
        {variant === "product" ? (
          <div className={cn("mt-8 grid grid-cols-1 items-center gap-10 lg:mt-10 lg:gap-12", visual ? "lg:grid-cols-12" : "")}>
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
          <div className="mt-8 grid grid-cols-1 gap-8 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-end lg:gap-14">
            <div className="max-w-3xl">
              {kicker ? <Kicker className="mb-5">{kicker}</Kicker> : null}
              {heading}
              {ledeEl}
              <Actions actions={actions} />
              {children}
            </div>
            {meta?.length ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5 text-sm lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
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
          <div className={cn("mt-8 lg:mt-10", center ? "mx-auto max-w-3xl text-center" : "max-w-3xl")}>
            {kicker ? <Kicker className={cn("mb-5", center && "justify-center")}>{kicker}</Kicker> : null}
            {heading}
            {ledeEl}
            <Actions actions={actions} center={center} />
          </div>
        )}
        {variant === "index" || variant === "pricing" ? (children ? <div className={cn(variant === "pricing" ? "mt-8" : "mt-8 max-w-3xl")}>{children}</div> : null) : null}
      </div>
    </header>
  );
}
