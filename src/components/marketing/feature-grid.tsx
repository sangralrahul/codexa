import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Feature } from "@/content/marketing/types";
import { Inline } from "./inline";
import { cn } from "@/lib/utils";

export function FeatureGrid({ features, columns = 3, className }: { features: Feature[]; columns?: 2 | 3 | 4; className?: string }) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];
  return (
    <ul className={cn("grid gap-4", cols, className)}>
      {features.map((f) => {
        const Icon = f.icon;
        const body = (
          <>
            {Icon ? (
              <span className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
            ) : null}
            <h3 className="text-base font-semibold tracking-tight">
              {f.title}
              {f.href ? <ArrowUpRight className="ml-1 inline size-3.5 text-muted-foreground" aria-hidden="true" /> : null}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              <Inline text={f.description} />
            </p>
          </>
        );
        return (
          <li key={f.title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            {f.href ? (
              <Link href={f.href} className="block rounded-md focus-visible:outline-2 focus-visible:outline-ring">
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
