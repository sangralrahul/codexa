import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

export function CTABand({
  title = "Start building with Codexa",
  description = "Free plan, no card required. Describe your idea and get a real project you can edit, run, and deploy.",
  primary = { label: "Start Building Free", href: "/signup" },
  secondary = { label: "See pricing", href: "/pricing" },
}: {
  title?: string;
  description?: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string } | null;
}) {
  return (
    <section className="border-t border-border bg-foreground text-background">
      <div className="container-x flex flex-col items-start gap-6 py-16 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
          <p className="mt-2 text-base text-background/75">{description}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={primary.href} className={buttonClasses("primary", "lg")}>
            {primary.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          {secondary ? (
            <Link href={secondary.href} className={buttonClasses("outline", "lg", "border-background/30 bg-transparent text-background hover:bg-background/10")}>
              {secondary.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
