import Link from "next/link";
import { breadcrumbJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

export type Crumb = { name: string; path: string };

/**
 * Accessible breadcrumb trail with BreadcrumbList JSON-LD (12px mono, muted; the same look as the
 * marketing header crumbs). "Home" is prepended; the last item is the current page.
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  if (items.length === 0) return null;
  const all = [{ name: "Home", path: "/" }, ...items];
  return (
    <nav aria-label="Breadcrumb" className={cn("font-mono text-[12px] text-muted-foreground", className)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={breadcrumbJsonLd(all)} />
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {all.map((item, i) => {
          const last = i === all.length - 1;
          return (
            <li key={item.path + i} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="text-foreground/80">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link href={item.path} className="link-draw transition-colors hover:text-foreground">
                    {item.name}
                  </Link>
                  <span aria-hidden="true" className="text-foreground-dim">
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
