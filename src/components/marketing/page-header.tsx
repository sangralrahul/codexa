import * as React from "react";
import type { Crumb, Tone } from "@/content/marketing/types";
import { cn } from "@/lib/utils";
import { Highlight } from "./backdrop";
import { Kicker as PremiumKicker } from "./premium";
import { PageHero, type PageScene } from "./page-grid";

export type HeaderAction = { label: string; href: string };
export type HeaderMeta = { label: string; value: React.ReactNode };

/** Section kicker: the mono eyebrow with a square bullet. */
export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return <PremiumKicker className={className}>{children}</PremiumKicker>;
}

/**
 * Inner-page header: the slim live space banner (PageHero) with breadcrumbs, the mono eyebrow, the
 * two-tone H1 (`highlight` is set in the dimmed tone), the lede and actions. Four variants:
 * - product: the page's visual beside the copy from lg;
 * - index: title with a search or filter bar (children) under the lede;
 * - editorial: title with a meta column (updated, reading time, review status);
 * - pricing: centred, with the toggles and cards (children) under the banner.
 * `mark` is accepted for existing callers and rendered as plain text.
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
  scene,
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
  /** Overrides the page's banner scene (default: sceneForPath on the last crumb). */
  scene?: PageScene;
  children?: React.ReactNode;
  className?: string;
}) {
  void mark;
  const pricing = variant === "pricing";
  const aside =
    variant === "product" && visual ? (
      visual
    ) : variant === "editorial" && meta?.length ? (
      <dl className="pg-meta">
        {meta.map((m) => (
          <div key={m.label}>
            <dt>{m.label}</dt>
            <dd>{m.value}</dd>
          </div>
        ))}
      </dl>
    ) : undefined;
  const inCopy = variant === "product" || variant === "editorial" || variant === "index";

  return (
    <div data-tone={tone} className={className}>
      <PageHero
        crumbs={crumbs}
        eyebrow={kicker}
        title={<Highlight text={headline} highlight={highlight} />}
        lede={lede}
        actions={actions}
        scene={scene}
        align={pricing ? "center" : "left"}
        aside={aside}
        asideWide={variant === "product"}
      >
        {inCopy && children ? <div className={cn("mt-8 w-full", variant === "index" && "max-w-3xl")}>{children}</div> : null}
      </PageHero>
      {pricing && children ? <div className="container-x relative pb-4 pt-12">{children}</div> : null}
    </div>
  );
}
