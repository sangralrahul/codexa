import * as React from "react";
import type { Crumb, Tone } from "@/content/marketing/types";
import { PageHeader } from "./page-header";

/**
 * Page hero, kept for existing callers: a thin wrapper over PageHeader.
 * With `visual` (or children) it is the split "product" header; otherwise "editorial".
 * `title` is the curated h1; `subtitle` the lede. Accents are explicit (`mark`, `highlight`).
 */
export function Hero({
  eyebrow,
  title,
  highlight,
  mark,
  subtitle,
  primary,
  secondary,
  crumbs,
  visual,
  tone,
  align,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  /** Part of the title set in the two-tone .text-dim (written by a person; never automatic). */
  highlight?: string;
  /** Part of the title set in the selection mark (H1 only). */
  mark?: string;
  subtitle: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
  crumbs?: Crumb[];
  visual?: React.ReactNode;
  tone?: Tone;
  /** Kept for API compatibility; the header layout comes from the variant. */
  align?: "center" | "left";
  children?: React.ReactNode;
  className?: string;
}) {
  void align;
  const side = visual ?? children;
  const actions = [primary, secondary].filter((a): a is { label: string; href: string } => Boolean(a));
  return (
    <PageHeader
      variant={side ? "product" : "editorial"}
      crumbs={crumbs ?? []}
      kicker={eyebrow}
      headline={title}
      mark={mark}
      highlight={highlight}
      lede={subtitle}
      actions={actions}
      visual={side}
      tone={tone}
      className={className}
    />
  );
}
