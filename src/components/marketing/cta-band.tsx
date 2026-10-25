import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Backdrop } from "./backdrop";

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
    <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div data-reveal className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-border">
        <Backdrop className="[&_.backdrop__canvas]:[mask-image:none]" />
        <div className="relative px-6 py-16 text-center sm:px-12 sm:py-24">
          <h2 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">{title}</h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-foreground/75 sm:text-lg">{description}</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={primary.href} className={cn(buttonClasses("secondary", "lg"), "btn-solid rounded-full px-7")}>
              {primary.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            {secondary ? (
              <Link href={secondary.href} className={cn(buttonClasses("ghost", "lg"), "glass rounded-full border border-border-strong px-7")}>
                {secondary.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
