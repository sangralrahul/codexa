import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "surface" | "contrast";
const tones: Record<Tone, string> = {
  default: "bg-background",
  // A faint glow instead of a flat grey band keeps long pages from looking striped.
  surface: "bg-[radial-gradient(80%_60%_at_50%_0%,color-mix(in_oklab,var(--glow-2)_7%,transparent),transparent),linear-gradient(to_bottom,var(--surface),var(--background))]",
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
  description,
  align = "left",
  as: Heading = "h2",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div data-reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? (
        <p className={cn("mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary")}>
          <span aria-hidden="true" className="h-px w-6 bg-gradient-to-r from-transparent to-glow-2" />
          {eyebrow}
          <span aria-hidden="true" className={cn("h-px w-6 bg-gradient-to-l from-transparent to-glow-2", align !== "center" && "hidden")} />
        </p>
      ) : null}
      <Heading className={cn("text-balance font-semibold tracking-tight", Heading === "h1" ? "text-3xl sm:text-4xl lg:text-5xl" : "text-3xl sm:text-4xl")}>{title}</Heading>
      {description ? <p className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg">{description}</p> : null}
    </div>
  );
}
