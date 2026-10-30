import * as React from "react";
import { cn } from "@/lib/utils";
import { GradientText, Kicker } from "./premium";

type Tone = "default" | "surface" | "contrast" | "band";
const tones: Record<Tone, string> = {
  default: "",
  surface: "bg-surface border-y border-border",
  contrast: "bg-foreground text-background",
  // A full-bleed band on the cool off-white, hairline edges.
  band: "border-y border-border bg-surface",
};

type Size = "sm" | "md" | "lg";
const sizes: Record<Size, string> = {
  // Website rhythm (DESIGN-PREMIUM.md): 64 / 80 / 96px for text, up to 120px for visual sections.
  sm: "py-16 sm:py-20 lg:py-24",
  md: "py-16 sm:py-20 lg:py-28",
  lg: "py-20 sm:py-24 lg:py-[7.5rem]",
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
 * Section heading: an optional kicker (`index` and/or `eyebrow`), a bold display heading with an
 * optional gradient `highlight` phrase, and a lead paragraph.
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
  /** Kicker text. */
  eyebrow?: string;
  /** Kicker text (kept for existing callers; rendered the same as `eyebrow`). */
  index?: string;
  title: string;
  /** Part of the title set in the brand gradient (one phrase per page). */
  highlight?: string;
  description?: string;
  /** Lead paragraph (may hold links). Rendered after `description` if both are set. */
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
  const kicker = [index, eyebrow].filter(Boolean).join(" · ");
  return (
    <div className={cn(s === "display-2" ? "max-w-3xl" : "max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {kicker ? (
        <Kicker className="mb-4" center={align === "center"}>
          {kicker}
        </Kicker>
      ) : null}
      <Heading id={id} className={titleSize[s]}>
        <GradientText text={title} phrase={highlight} />
      </Heading>
      {description ? <p className={cn("mt-4 text-pretty text-[16px] leading-relaxed text-muted-foreground", align === "center" && "mx-auto")}>{description}</p> : null}
      {lead ? <div className={cn("mk-lead mt-4 max-w-[60ch]", align === "center" && "mx-auto")}>{lead}</div> : null}
    </div>
  );
}
