import * as React from "react";
import { cn } from "@/lib/utils";
import { Highlight } from "./backdrop";

type Tone = "default" | "surface" | "contrast" | "band";
const tones: Record<Tone, string> = {
  default: "",
  surface: "bg-surface border-y border-border",
  contrast: "bg-foreground text-background",
  // A full-bleed band: quiet surface with hairline edges (no light, no grain).
  band: "border-y border-border bg-surface/60",
};

type Size = "sm" | "md" | "lg";
const sizes: Record<Size, string> = {
  // Text sections: 56 / 64 / 80px.
  sm: "py-14 sm:py-16 lg:py-20",
  md: "py-14 sm:py-16 lg:py-24",
  // Visual sections: 64 / 80 / 96px.
  lg: "py-16 sm:py-20 lg:py-24",
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
      <div className={cn("container-x relative", containerClassName)}>{children}</div>
    </section>
  );
}

/** Heading sizes: `display-2` is the page-title size (mk-h1), `display-3` the section size (mk-h2). */
const titleSize = {
  "display-2": "mk-h1",
  "display-3": "mk-h2",
} as const;

/**
 * Section heading: an optional mono kicker ("02 — START" via `index`, and/or `eyebrow`),
 * a sans heading (optional two-tone `highlight`), and a lead paragraph.
 * The heading's `id` is derived from the section it labels: pass `id` to match `aria-labelledby`.
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
  id,
  className,
}: {
  /** Kicker text (rendered as a mono text-label, no pill). */
  eyebrow?: string;
  /** Chapter index kicker, e.g. "02 — START" (rendered in the accent colour before the eyebrow). */
  index?: string;
  title: string;
  /** Part of the title set in the two-tone .text-dim. */
  highlight?: string;
  description?: string;
  /** Lead paragraph in text-lead (may hold links). Rendered after `description` if both are set. */
  lead?: React.ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  /** Size of the heading. Default: the page-title size for h1, the section size otherwise. */
  size?: "display-2" | "display-3";
  /** The heading element's id (for `aria-labelledby` on the section). */
  id?: string;
  className?: string;
}) {
  const s = size ?? (Heading === "h1" ? "display-2" : "display-3");
  return (
    <div className={cn(s === "display-2" ? "max-w-3xl" : "max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow || index ? (
        // The shared eyebrow style (text-eyebrow: mono, uppercase, 0.14em, muted; docs/DESIGN.md).
        <p className={cn("text-eyebrow mb-4 flex items-center gap-2.5", align === "center" && "justify-center")}>
          {index ? <span className="text-primary">{index}</span> : <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />}
          {index && eyebrow ? <span aria-hidden="true" className="h-px w-5 bg-border-strong" /> : null}
          {eyebrow ? <span>{eyebrow}</span> : null}
        </p>
      ) : null}
      <Heading id={id} className={titleSize[s]}>
        <Highlight text={title} highlight={highlight} />
      </Heading>
      {description ? <p className={cn("mt-4 text-pretty text-base text-muted-foreground", align === "center" && "mx-auto")}>{description}</p> : null}
      {lead ? <div className={`text-lead ${cn("mt-4", align === "center" && "mx-auto")}`}>{lead}</div> : null}
    </div>
  );
}
