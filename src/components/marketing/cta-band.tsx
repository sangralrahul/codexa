import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Aurora } from "./aurora";

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
    <section className="relative isolate overflow-hidden border-t border-border py-20 sm:py-28">
      <Aurora intensity="soft" />
      <div className="container-x relative">
        <div data-reveal className="glow-border mx-auto max-w-4xl">
          <div className="glow-border__inner glass px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">{title}</h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">{description}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={primary.href} className={cn(buttonClasses("primary", "lg"), "btn-glow rounded-xl")}>
                {primary.label}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              {secondary ? (
                <Link href={secondary.href} className={cn(buttonClasses("ghost", "lg"), "glass rounded-xl border border-border-strong")}>
                  {secondary.label}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
