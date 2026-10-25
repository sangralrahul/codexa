import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Hero({
  eyebrow,
  title,
  subtitle,
  primary,
  secondary,
  align = "center",
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
  align?: "center" | "left";
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden border-b border-border bg-surface", className)}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)]" />
      <div className={cn("container-x relative py-16 sm:py-20 lg:py-28", align === "center" && "text-center")}>
        <div className={cn("max-w-3xl", align === "center" && "mx-auto")}>
          {eyebrow ? <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p> : null}
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>
          <p className="mt-5 text-lg text-muted-foreground sm:text-xl">{subtitle}</p>
          {primary || secondary ? (
            <div className={cn("mt-8 flex flex-col gap-3 sm:flex-row", align === "center" && "sm:justify-center")}>
              {primary ? (
                <Link href={primary.href} className={buttonClasses("primary", "lg")}>
                  {primary.label}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              ) : null}
              {secondary ? (
                <Link href={secondary.href} className={buttonClasses("outline", "lg")}>
                  {secondary.label}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        {children ? <div className="relative mt-12">{children}</div> : null}
      </div>
    </section>
  );
}
