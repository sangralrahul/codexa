import Link from "next/link";
import { breadcrumbJsonLd } from "@/lib/seo";
import type { Crumb } from "@/content/marketing/types";
import { cn } from "@/lib/utils";

/** Breadcrumb trail (12px mono, muted) with BreadcrumbList JSON-LD. Always the first thing in a page header. */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  const all: Crumb[] = items[0]?.path === "/" ? items : [{ name: "Home", path: "/" }, ...items];
  return (
    <nav aria-label="Breadcrumb" className={cn("font-mono text-[12px] text-muted-foreground", className)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={breadcrumbJsonLd(all)} />
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <li key={c.path} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="text-foreground/80">
                  {c.name}
                </span>
              ) : (
                <Link href={c.path} className="link-draw transition-colors hover:text-foreground">
                  {c.name}
                </Link>
              )}
              {!last ? (
                <span aria-hidden="true" className="text-foreground-dim">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
