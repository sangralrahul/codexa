import Link from "next/link";
import type { ContentPage, Crumb } from "@/content/marketing/types";
import { getRoute } from "@/config/routes";
import { Breadcrumbs } from "./breadcrumbs";
import { ReviewNote } from "./review-note";
import { ContentSections } from "./content-blocks";
import { CTABand } from "./cta-band";
import { cn } from "@/lib/utils";
import { Eyebrow, PageTitle } from "./backdrop";

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

/**
 * Simple content page: breadcrumbs, h1, intro, optional review note, data-driven sections, optional side nav.
 * `layout="form"` puts the page's form (children) in a sticky right column beside the sections.
 */
export function PageTemplate({
  page,
  children,
  aside,
  after,
  layout = "article",
}: {
  page: ContentPage;
  children?: React.ReactNode;
  aside?: React.ReactNode;
  after?: React.ReactNode;
  layout?: "article" | "form";
}) {
  const crumbs = crumbsFor(page.path, page.breadcrumbs);
  const split = layout === "form" && page.sections.length > 0;
  const hasToc = !split && page.sections.length >= 4;
  return (
    <>
      <article className="container-x py-10 sm:py-16">
        <Breadcrumbs items={crumbs} />
        <header className="mt-8 max-w-3xl">
          {page.eyebrow ? (
            <div data-reveal className="mb-5">
              <Eyebrow>{page.eyebrow}</Eyebrow>
            </div>
          ) : null}
          <PageTitle>{page.title}</PageTitle>
          <p data-reveal style={{ "--reveal-delay": "160ms" } as React.CSSProperties} className="mt-5 text-pretty text-lg text-muted-foreground">
            {page.intro}
          </p>
          {page.updated ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Last revised <time dateTime={page.updated}>{page.updated}</time>
            </p>
          ) : null}
        </header>
        {page.review ? <ReviewNote kind={page.review} className="mt-6 max-w-3xl" /> : null}
        {split ? (
          <div className="mt-12 grid gap-12 lg:grid-cols-2 xl:gap-20">
            <div className="min-w-0 lg:sticky lg:top-24 lg:order-2 lg:self-start">{children}</div>
            <div className="min-w-0 space-y-10 lg:border-t lg:border-border lg:pt-8">
              <ContentSections sections={page.sections} />
              {aside}
            </div>
          </div>
        ) : (
          <div className={cn("mt-10 grid gap-10", hasToc || aside ? "lg:grid-cols-[minmax(0,1fr)_260px]" : "")}>
            <div className="min-w-0 max-w-3xl space-y-10">
              {children}
              <ContentSections sections={page.sections} />
            </div>
            {hasToc || aside ? (
              <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                {hasToc ? (
                  <nav aria-label="On this page" className="glass rounded-2xl border border-border p-5">
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
        )}
        {after}
      </article>
      {page.cta ? <CTABand title={page.cta.title} description={page.cta.description} primary={page.cta.primary} secondary={page.cta.secondary ?? null} /> : null}
    </>
  );
}
