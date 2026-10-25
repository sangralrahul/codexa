import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { autoHighlight, Eyebrow, Highlight } from "./backdrop";

export function Hero({
  eyebrow,
  title,
  highlight,
  subtitle,
  primary,
  secondary,
  align = "center",
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  /** Part of the title set in the italic serif accent (defaults to the closing words). */
  highlight?: string;
  subtitle: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
  align?: "center" | "left";
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative", className)}>
      <div className={cn("container-x relative py-16 sm:py-20 lg:py-28", align === "center" && "text-center")}>
        <div className={cn("max-w-3xl", align === "center" && "mx-auto")}>
          {eyebrow ? (
            <div data-reveal className="mb-6">
              <Eyebrow>{eyebrow}</Eyebrow>
            </div>
          ) : null}
          <h1 data-reveal style={{ "--reveal-delay": "80ms" } as React.CSSProperties} className="text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.03em] sm:text-5xl lg:text-[4.25rem]">
            <Highlight text={title} highlight={highlight ?? autoHighlight(title)} />
          </h1>
          <p data-reveal style={{ "--reveal-delay": "160ms" } as React.CSSProperties} className="mt-6 text-pretty text-lg text-muted-foreground sm:text-xl">
            {subtitle}
          </p>
          {primary || secondary ? (
            <div data-reveal style={{ "--reveal-delay": "240ms" } as React.CSSProperties} className={cn("mt-9 flex flex-col gap-3 sm:flex-row", align === "center" && "sm:justify-center")}>
              {primary ? (
                <Link href={primary.href} className={cn(buttonClasses("secondary", "lg"), "btn-solid rounded-full px-6")}>
                  {primary.label}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              ) : null}
              {secondary ? (
                <Link href={secondary.href} className={cn(buttonClasses("ghost", "lg"), "glass rounded-full border border-border-strong px-6")}>
                  {secondary.label}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        {children ? (
          <div data-reveal style={{ "--reveal-delay": "320ms" } as React.CSSProperties} className="relative mt-12">
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
