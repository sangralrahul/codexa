import Link from "next/link";
import type { ContentPage, Crumb } from "@/content/marketing/types";
import { getRoute } from "@/config/routes";
import { Breadcrumbs } from "./breadcrumbs";
import { ReviewNote } from "./review-note";
import { ContentSections } from "./content-blocks";
import { CTABand } from "./cta-band";
import { cn } from "@/lib/utils";

function crumbsFor(path: string, explicit?: Crumb[]): Crumb[] {
  if (explicit) return explicit;
  const parts = path.split("/").filter(Boolean);
  const out: Crumb[] = [];
  let acc = "";
  for (const p of parts) {
    acc += `/${p}`;
    const r = getRoute(acc);
    out.push({ name: r?.title ?? p.replace(/-/g, " "), path: acc });
  }
  return out;
}

/** Simple content page: breadcrumbs, h1, intro, optional review note, data-driven sections, optional side nav. */
export function PageTemplate({ page, children, aside, after }: { page: ContentPage; children?: React.ReactNode; aside?: React.ReactNode; after?: React.ReactNode }) {
  const crumbs = crumbsFor(page.path, page.breadcrumbs);
  const hasToc = page.sections.length >= 4;
  return (
    <>
      <article className="container-x py-10 sm:py-14">
        <Breadcrumbs items={crumbs} />
        <header className="mt-6 max-w-3xl">
          {page.eyebrow ? <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">{page.eyebrow}</p> : null}
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">{page.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{page.intro}</p>
          {page.updated ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Last revised <time dateTime={page.updated}>{page.updated}</time>
            </p>
          ) : null}
        </header>
        {page.review ? <ReviewNote kind={page.review} className="mt-6 max-w-3xl" /> : null}
        <div className={cn("mt-10 grid gap-10", hasToc || aside ? "lg:grid-cols-[minmax(0,1fr)_260px]" : "")}>
          <div className="min-w-0 max-w-3xl space-y-10">
            {children}
            <ContentSections sections={page.sections} />
          </div>
          {hasToc || aside ? (
            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              {hasToc ? (
                <nav aria-label="On this page" className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {page.sections.map((s) => (
                      <li key={s.id}>
                        <Link href={`${page.path}#${s.id}`} className="text-muted-foreground hover:text-foreground">
                          {s.heading}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : null}
              {aside}
            </aside>
          ) : null}
        </div>
        {after}
      </article>
      {page.cta ? <CTABand title={page.cta.title} description={page.cta.description} primary={page.cta.primary} secondary={page.cta.secondary ?? null} /> : null}
    </>
  );
}
