import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Feature } from "@/content/marketing/types";
import { Inline } from "./inline";
import { cn } from "@/lib/utils";

/**
 * Feature list as an editorial spec sheet: columns of items separated by hairlines, a small
 * inline icon, no boxed cards. Every hover affordance (hairline fill, icon light, arrow) is
 * mirrored on keyboard focus.
 */
export function FeatureGrid({ features, columns = 3, className }: { features: Feature[]; columns?: 2 | 3 | 4; className?: string }) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];
  return (
    <ul data-reveal="stagger" className={cn("grid grid-cols-1 gap-x-10", cols, className)}>
      {features.map((f) => {
        const Icon = f.icon;
        const body = (
          <>
            <div className="flex items-center gap-2.5">
              {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground transition-colors duration-300 group-hover:text-primary group-focus-within:text-primary" aria-hidden="true" /> : null}
              <h3 className="text-[15px] font-semibold tracking-tight">{f.title}</h3>
              {f.href ? (
                <ArrowUpRight
                  className="ml-auto size-4 shrink-0 text-muted-foreground opacity-0 transition-[opacity,translate] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-within:translate-x-0.5 group-focus-within:-translate-y-0.5 group-focus-within:opacity-100"
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              <Inline text={f.description} />
            </p>
          </>
        );
        return (
          <li key={f.title} className="group relative border-t border-border py-6">
            {/* Hairline that fills in on hover and on keyboard focus. */}
            <span aria-hidden="true" className="absolute -top-px left-0 h-px w-full origin-left scale-x-0 bg-foreground transition-transform duration-500 ease-out group-hover:scale-x-100 group-focus-within:scale-x-100" />
            {f.href ? (
              <Link href={f.href} className="block rounded-md outline-offset-4">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
