import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "surface" | "contrast";
const tones: Record<Tone, string> = {
  default: "bg-background",
  surface: "bg-surface",
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
    <section className={cn("py-16 sm:py-20 lg:py-24", tones[tone], className)} {...props}>
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
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p> : null}
      <Heading className={cn("font-semibold tracking-tight", Heading === "h1" ? "text-3xl sm:text-4xl lg:text-5xl" : "text-2xl sm:text-3xl")}>{title}</Heading>
      {description ? <p className="mt-3 text-base text-muted-foreground sm:text-lg">{description}</p> : null}
    </div>
  );
}
