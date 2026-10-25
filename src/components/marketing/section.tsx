import * as React from "react";
import { cn } from "@/lib/utils";
import { Highlight } from "./backdrop";

type Tone = "default" | "surface" | "contrast";
const tones: Record<Tone, string> = {
  // Transparent so the page backdrop can fade out naturally behind the first sections.
  default: "",
  surface: "bg-surface border-y border-border/60",
  contrast: "bg-foreground text-background",
};

export function Section({
  tone = "default",
  className,
  containerClassName,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { tone?: Tone; containerClassName?: string }) {
  return (
    <section className={cn("relative py-16 sm:py-20 lg:py-28", tones[tone], className)} {...props}>
      <div className={cn("container-x", containerClassName)}>{children}</div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  highlight,
  description,
  align = "left",
  as: Heading = "h2",
  className,
}: {
  eyebrow?: string;
  title: string;
  /** Part of the title set in the italic serif accent. */
  highlight?: string;
  description?: string;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div data-reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? (
        <p className="mb-4 inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-signal" />
          {eyebrow}
        </p>
      ) : null}
      <Heading className={cn("text-balance font-semibold tracking-[-0.025em]", Heading === "h1" ? "text-4xl sm:text-5xl lg:text-6xl" : "text-3xl sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]")}>
        <Highlight text={title} highlight={highlight} />
      </Heading>
      {description ? <p className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg">{description}</p> : null}
    </div>
  );
}
