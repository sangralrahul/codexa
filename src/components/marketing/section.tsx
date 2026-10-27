import * as React from "react";
import { cn } from "@/lib/utils";
import { Highlight } from "./backdrop";

type Tone = "default" | "surface" | "contrast" | "band";
const tones: Record<Tone, string> = {
  // Transparent so the page light can fade out naturally behind the first sections.
  default: "",
  surface: "bg-surface border-y border-border/60",
  contrast: "bg-foreground text-background",
  // A full-bleed band: quiet surface, hairline edges, a rim of light on top and grain.
  band: "section-band overflow-hidden border-y border-border/70 bg-surface/70",
};

type Size = "sm" | "md" | "lg";
const sizes: Record<Size, string> = {
  // Text-light sections (PLAN §2.4): 64 / 80 / 96px.
  sm: "py-16 sm:py-20 lg:py-24",
  // The previous default rhythm (kept for existing pages).
  md: "py-16 sm:py-20 lg:py-28",
  // Visual sections: 88 / 112 / 160px.
  lg: "py-22 sm:py-28 lg:py-40",
};

export function Section({
  tone = "default",
  size = "md",
  className,
  containerClassName,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { tone?: Tone; size?: Size; containerClassName?: string }) {
  return (
    <section className={cn("relative", sizes[size], tones[tone], className)} {...props}>
      {tone === "band" ? (
        <>
          <span aria-hidden="true" className="horizon-line pointer-events-none absolute inset-x-0 top-0 opacity-60" />
          <span aria-hidden="true" className="bg-noise pointer-events-none absolute inset-0" />
        </>
      ) : null}
      <div className={cn("container-x relative", containerClassName)}>{children}</div>
    </section>
  );
}

const titleSize = {
  "display-2": "text-display-2",
  "display-3": "text-display-3",
} as const;

/**
 * Section heading: an optional mono kicker ("02 — START" via `index`, and/or `eyebrow`),
 * a display heading (two-tone `highlight`), and a lead paragraph.
 */
export function SectionHeader({
  eyebrow,
  index,
  title,
  highlight,
  description,
  lead,
  align = "left",
  as: Heading = "h2",
  size,
  className,
}: {
  /** Kicker text (rendered as a mono text-label, no pill). */
  eyebrow?: string;
  /** Chapter index kicker, e.g. "02 — START" (rendered in signal ink before the eyebrow). */
  index?: string;
  title: string;
  /** Part of the title set in the two-tone .text-dim. */
  highlight?: string;
  description?: string;
  /** Lead paragraph in text-lead (may hold links). Rendered after `description` if both are set. */
  lead?: React.ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  /** Display size of the heading. Default: display-2 for h1, display-3 otherwise. */
  size?: "display-2" | "display-3";
  className?: string;
}) {
  const s = size ?? (Heading === "h1" ? "display-2" : "display-3");
  return (
    <div data-reveal className={cn(s === "display-2" ? "max-w-3xl" : "max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow || index ? (
        // The shared eyebrow style (text-eyebrow: mono, uppercase, 0.14em, muted; docs/DESIGN.md).
        <p className={cn("text-eyebrow mb-5 flex items-center gap-2.5", align === "center" && "justify-center")}>
          {index ? <span className="text-signal-ink">{index}</span> : <span aria-hidden="true" className="size-1.5 rounded-full bg-signal" />}
          {index && eyebrow ? <span aria-hidden="true" className="h-px w-5 bg-border-strong" /> : null}
          {eyebrow ? <span>{eyebrow}</span> : null}
        </p>
      ) : null}
      <Heading className={titleSize[s]}>
        <Highlight text={title} highlight={highlight} />
      </Heading>
      {description ? <p className={cn("mt-5 text-pretty text-base text-muted-foreground sm:text-lg", align === "center" && "mx-auto")}>{description}</p> : null}
      {lead ? <div className={`text-lead ${cn("mt-5", align === "center" && "mx-auto")}`}>{lead}</div> : null}
    </div>
  );
}
