import * as React from "react";
import Link from "next/link";
import { ArrowRight, LifeBuoy } from "lucide-react";
import type { ContentPage, Crumb, Tone } from "@/content/marketing/types";
import { getRoute } from "@/config/routes";
import { site } from "@/config/site";
import { ReviewNote } from "./review-note";
import { ContentSections, LandingSections } from "./content-blocks";
import { CTABand } from "./cta-band";
import { PageHeader, type HeaderMeta } from "./page-header";
import { OnThisPage } from "./on-this-page";
import { ReadingProgress } from "./reading-progress";
import { VignetteWindow } from "./vignette-window";

function crumbsFor(path: string, explicit?: Crumb[]): Crumb[] {
  if (explicit) return explicit;
  const parts = path.split("/").filter(Boolean);
  const out: Crumb[] = [];
  let acc = "";
  for (const p of parts) {
    acc += `/${p}`;
    const r = getRoute(acc);
    out.push({ name: r?.navLabel ?? r?.title ?? p.replace(/-/g, " "), path: acc });
  }
  return out;
}

/** The area tint for the page backdrop, from the route manifest group. */
function toneFor(path: string): Tone {
  const g = getRoute(path)?.group;
  if (g === "trust") return "trust";
  if (g === "pricing") return "pricing";
  if (g === "company") return "company";
  if (g === "support" || g === "docs" || g === "learn" || g === "api") return "docs";
  return "product";
}

function words(page: ContentPage): number {
  const text = JSON.stringify(page.sections) + page.intro;
  return text.split(/\s+/).length;
}

function formatDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Desktop side card when a page has no index: where to get help (real routes and the support address). */
function HelpCard() {
  const links = [
    { label: "Support", href: "/support" },
    { label: "Documentation", href: "/docs" },
    { label: "Status", href: "/status" },
    { label: "Contact", href: "/contact" },
  ];
  return (
    <div className="e1 rounded-[16px] p-5">
      <LifeBuoy className="size-4 text-signal-ink" aria-hidden="true" />
      <p className="mt-3 text-[14px] font-semibold">Need a hand?</p>
      <ul className="mt-3 space-y-1.5 text-[13.5px]">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="group inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
              <ArrowRight className="size-3 opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-border pt-3 text-[12.5px] text-muted-foreground">
        Or email{" "}
        <a href={`mailto:${site.company.supportEmail}`} className="link-draw text-foreground">
          {site.company.supportEmail}
        </a>
      </p>
    </div>
  );
}

/** "Before you send" card beside a form on pages that have no sections of their own. */
function BeforeYouSend() {
  const links = [
    { label: "Status", href: "/status", body: "Is something already known to be down?" },
    { label: "Troubleshooting", href: "/docs/troubleshooting", body: "Common errors and how to fix them." },
    { label: "Roadmap", href: "/roadmap", body: "What is already planned." },
  ];
  return (
    <div className="space-y-4">
      <p className="text-label text-muted-foreground">Before you send</p>
      <ul className="divide-y divide-border border-y border-border">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="group flex items-start justify-between gap-3 py-4">
              <span>
                <span className="block font-medium">{l.label}</span>
                <span className="block text-[14px] text-muted-foreground">{l.body}</span>
              </span>
              <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-snap group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-[14px] text-muted-foreground">Everything you send is read by the people who build Codexa. Replies come by email.</p>
    </div>
  );
}

/**
 * Content page template (PLAN §5.3) with three variants:
 * - landing: the split product header (vignette, diagram or the page's form in the first fold) and
 *   12-column rows whose visual blocks alternate sides;
 * - article: editorial header with a meta column, a 68ch reading measure (17px / 1.7) and the
 *   in-page index (five or more sections) or a help card;
 * - legal: article plus a reading-progress hairline, a "Last revised" pill and print styles.
 * The ReviewNote stays visible whenever the page needs review. `layout="form"` puts the page's
 * form (children) beside the sections. The in-page index (OnThisPage) appears on article, legal and
 * landing pages with five or more sections. The header meta (reading time, sections) is only shown
 * on reading pages with three or more sections and never beside a form; `meta` replaces it.
 */
export function PageTemplate({
  page,
  children,
  aside,
  after,
  layout = "article",
  visual,
  meta: metaOverride,
}: {
  page: ContentPage;
  children?: React.ReactNode;
  aside?: React.ReactNode;
  after?: React.ReactNode;
  layout?: "article" | "form";
  /** Overrides the landing hero visual (for example a diagram). */
  visual?: React.ReactNode;
  /** The editorial header's meta column, when the page has better facts than reading time. */
  meta?: HeaderMeta[];
}) {
  const crumbs = crumbsFor(page.path, page.breadcrumbs);
  const variant = page.variant ?? (page.review || page.updated ? "legal" : "article");
  const tone = page.tone ?? toneFor(page.path);
  const headline = page.headline ?? page.title;
  const form = layout === "form";
  const cta = page.cta ? <CTABand tone={tone} title={page.cta.title} description={page.cta.description} primary={page.cta.primary} secondary={page.cta.secondary ?? null} /> : null;
  const items = page.sections.map((s) => ({ id: s.id, title: s.navLabel ?? s.heading }));

  const landingToc = !form && page.sections.length >= 5;
  if (variant === "landing") {
    const heroVisual = visual ?? (form && children ? children : page.visual ? <VignetteWindow id={page.visual} /> : undefined);
    return (
      <div data-tone={tone}>
        <PageHeader
          variant="product"
          crumbs={crumbs}
          kicker={page.eyebrow}
          headline={headline}
          mark={page.mark}
          highlight={page.highlight}
          lede={page.intro}
          actions={!form && page.cta ? [page.cta.primary, ...(page.cta.secondary ? [page.cta.secondary] : [])] : undefined}
          visual={heroVisual}
        />
        <div className="container-x pb-16 pt-16 lg:pt-24">
          {page.review ? <ReviewNote kind={page.review} className="mb-12 max-w-3xl" /> : null}
          {landingToc ? (
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_12rem] lg:gap-x-12 xl:gap-x-16">
              {/* Phones: the chip bar sticks through the sections (display: contents keeps it in their box). */}
              <div className="min-w-0">
                <div className="contents lg:hidden">
                  <OnThisPage items={items} />
                </div>
                <div>
                  <LandingSections sections={page.sections} />
                </div>
              </div>
              <aside data-print-hide className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
                <OnThisPage items={items} />
              </aside>
            </div>
          ) : (
            <LandingSections sections={page.sections} />
          )}
          {!form && children ? <div className="mt-16">{children}</div> : null}
          {after}
        </div>
        {cta}
      </div>
    );
  }

  const legal = variant === "legal";
  const minutes = Math.max(1, Math.round(words(page) / 220));
  // Reading time and a section count describe reading pages, not a short page with a form.
  const reading = !form && page.sections.length >= 3;
  const meta: HeaderMeta[] = metaOverride ?? [
    ...(page.updated
      ? [
          {
            label: "Last revised",
            value: (
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 text-[12.5px]">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-signal" />
                <time dateTime={page.updated}>{formatDay(page.updated)}</time>
              </span>
            ),
          },
        ]
      : []),
    ...(reading ? [{ label: "Reading time", value: `${minutes} min` }] : []),
    ...(page.review ? [{ label: "Status", value: `Draft · pending ${page.review === "both" ? "legal and security" : page.review} review` }] : reading ? [{ label: "Sections", value: String(page.sections.length) }] : []),
  ];
  const toc = !form && page.sections.length >= 5;

  return (
    <div data-tone={tone}>
      {legal ? <ReadingProgress /> : null}
      <PageHeader variant="editorial" crumbs={crumbs} kicker={page.eyebrow} headline={headline} mark={page.mark} highlight={page.highlight} lede={page.intro} meta={meta} />
      <div className="container-x pb-20 pt-12 lg:pt-16">
        {page.review ? <ReviewNote kind={page.review} className="mb-12 max-w-3xl" /> : null}
        {form ? (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] xl:gap-20">
            <div className="min-w-0 lg:order-2 lg:sticky lg:top-24 lg:self-start">{children}</div>
            <div data-print-article className="min-w-0 max-w-[68ch] space-y-12 text-[17px] leading-[1.7]">
              {page.sections.length ? <ContentSections sections={page.sections} /> : <BeforeYouSend />}
              {aside}
            </div>
          </div>
        ) : (
          // Block on phones (so the chip bar from the display: contents aside sticks through the article), grid from lg.
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-10 xl:gap-20">
            <aside data-print-hide className="contents lg:sticky lg:top-24 lg:order-2 lg:block lg:space-y-6 lg:self-start">
              {toc ? <OnThisPage items={items} /> : null}
              <div className={toc ? "hidden" : "hidden lg:block"}>{aside ?? <HelpCard />}</div>
            </aside>
            <article data-print-article className="min-w-0 max-w-[68ch] space-y-12 text-[17px] leading-[1.7]">
              {children}
              <ContentSections sections={page.sections} />
              {toc && aside ? <div>{aside}</div> : null}
            </article>
          </div>
        )}
        {after}
      </div>
      {cta}
    </div>
  );
}

