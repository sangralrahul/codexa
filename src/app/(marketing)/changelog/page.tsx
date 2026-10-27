import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { formatDate, getBySection } from "@/lib/content";
import type { ContentDoc } from "@/lib/content/types";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { HubHeader } from "@/components/docs/hub-header";
import { NewsletterForm } from "@/components/docs/newsletter-form";
import { Markdown } from "@/components/content";
import { ScrollFill } from "@/components/content/scroll-fill";
import { buttonClasses } from "@/components/ui/button";

export const metadata = routeMetadata("/changelog");

/** Dot colours for the areas of a release (decorative; the area name is always written out). */
const TONES = ["var(--signal)", "var(--accent)", "var(--info)", "var(--success)", "var(--warning)", "var(--syn-attr)", "var(--syn-keyword)", "var(--syn-tag)"];

/** One noun for a release's entries, everywhere on the page. */
function areas(n: number) {
  return `${n} ${n === 1 ? "area" : "areas"}`;
}

/** A one-sentence summary for a release with several areas: the area names, joined. */
function latestSummary(items: ContentDoc[]) {
  const names = items.map((e) => e.title.toLowerCase());
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
  return `This release covers ${list}.`;
}

/** Inline notes: headings become bold lead-ins so the page keeps one outline and unique ids. */
function inlineNotes(body: string) {
  return body.replace(/^#{2,6}\s+(.+)$/gm, "**$1**");
}

function anchor(version: string) {
  return `v-${version.replace(/\./g, "-")}`;
}

/** Plain text of one line of inline markdown (links keep their text; emphasis and code ticks go). */
function plainInline(md: string) {
  return md
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]+/g, "")
    .trim();
}

type Highlight = { title: string; text: string; href: string };

/** Longest highlight blurb, so the hero cards read as complete sentences without clamping. */
const BLURB_MAX = 90;

/**
 * A short, complete blurb taken verbatim from the notes: the first sentence (across the given
 * candidates) that fits, else the first sentence cut at a word boundary with an ellipsis.
 */
function blurb(candidates: string[]) {
  const sentences = candidates.flatMap((c) => plainInline(c).split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/));
  const fit = sentences.find((t) => t.length > 0 && t.length <= BLURB_MAX);
  if (fit) return fit;
  const first = sentences[0] ?? "";
  const cut = first.slice(0, BLURB_MAX - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 0)).replace(/[,;:\s]+$/, "")}…`;
}

/**
 * Up to three headline highlights for the release hero, from the notes themselves: the first three
 * areas when the release has several, otherwise the lead entry's own sections (heading + a short point).
 */
function releaseHighlights(items: ContentDoc[]): Highlight[] {
  if (items.length >= 3) return items.slice(0, 3).map((e) => ({ title: e.title, text: blurb([e.description]), href: `#${e.slug}` }));
  const lead = items[0];
  if (!lead) return [];
  const out: Highlight[] = [];
  for (const section of lead.body.split(/^## /m).slice(1)) {
    const [heading, ...rest] = section.split("\n");
    const points = rest.filter((l) => /^[-*]\s+/.test(l)).map((l) => l.replace(/^[-*]\s+/, ""));
    if (!points.length) continue;
    out.push({ title: plainInline(heading), text: blurb(points), href: `#${lead.slug}` });
    if (out.length === 3) break;
  }
  return out;
}

export default async function ChangelogPage() {
  const entries = await getBySection("changelog");
  const versions = new Map<string, ContentDoc[]>();
  for (const e of entries) {
    const key = e.version ?? "unversioned";
    versions.set(key, [...(versions.get(key) ?? []), e]);
  }
  const tone = new Map(entries.map((e, i) => [e.slug, TONES[i % TONES.length]]));
  const [latestVersion, latestItems] = [...versions.entries()][0] ?? [null, []];
  const highlights = releaseHighlights(latestItems);

  return (
    <div data-tone="docs" className="container-x pb-20 pt-6 sm:pt-8 lg:pt-10">
      <Breadcrumbs items={[{ name: "Changelog", path: "/changelog" }]} className="mb-8" />
      <HubHeader
        kicker="Changelog"
        title="What shipped,"
        dim="release by release."
        lead={
          <>
            What each release actually ships, by area. Entries describe implemented behaviour only; planned work lives on the{" "}
            <Link href="/roadmap" className="link-draw text-foreground">
              roadmap
            </Link>
            .
          </>
        }
      />

      {entries.length === 0 ? (
        <p className="mt-10 rounded-[18px] border border-dashed border-border-strong p-10 text-center text-sm text-muted-foreground">No releases yet.</p>
      ) : (
        <>
          {latestVersion ? (
            <section aria-labelledby="latest-release" className="e2 relative mt-12 overflow-hidden rounded-[24px] p-6 sm:p-8">
              <div aria-hidden="true" className="bg-blueprint absolute inset-0 opacity-50 [mask-image:linear-gradient(to_right,black,transparent_70%)]" />
              <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-12">
                <div className="flex flex-col">
                  <p className="text-label flex items-center gap-2 text-muted-foreground">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-signal shadow-[0_0_0_3px_color-mix(in_oklab,var(--signal)_18%,transparent)]" />
                    Latest release
                  </p>
                  <h2 id="latest-release" className="mt-4 font-mono text-[clamp(44px,7vw,76px)] font-medium leading-none tracking-[-0.025em]">
                    {latestVersion === "unversioned" ? "Updates" : `v${latestVersion}`}
                  </h2>
                  <p className="text-meta mt-4 text-muted-foreground">
                    <time dateTime={latestItems[0].date}>{formatDate(latestItems[0].date)}</time>
                    {latestItems.length > 1 ? ` · ${areas(latestItems.length)}` : highlights.length ? ` · ${highlights.length} ${highlights.length === 1 ? "highlight" : "highlights"}` : null}
                  </p>
                  <a href={`#${anchor(latestVersion)}`} className={`${buttonClasses("secondary", "md")} mt-6 self-start lg:mt-auto`}>
                    Read the ship log
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </a>
                </div>
                <div>
                  {/* The full summary lives once, in the timeline below; the hero names the release and its highlights. */}
                  <p className="text-balance text-[20px] font-semibold leading-snug tracking-[-0.015em] text-foreground sm:text-[24px]">
                    {latestItems.length === 1 ? latestItems[0].title : latestSummary(latestItems)}
                  </p>
                  {highlights.length ? (
                    <ul className="mt-6 grid gap-3 sm:grid-cols-3" aria-label={`Highlights of ${latestVersion === "unversioned" ? "the latest updates" : `v${latestVersion}`}`}>
                      {highlights.map((h, i) => (
                        <li key={h.title}>
                          <a
                            href={h.href}
                            className="group flex h-full flex-col rounded-[14px] border border-border bg-card/80 p-4 transition-[border-color,translate] duration-(--dur-3) ease-out hover:-translate-y-0.5 hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring calm:hover:translate-y-0"
                          >
                            <span className="flex items-center gap-2 text-[14px] font-semibold tracking-[-0.01em]">
                              <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: TONES[i % TONES.length] }} />
                              {h.title}
                            </span>
                            <span className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{h.text}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          <div className="mt-16 space-y-16">
            {[...versions.entries()].map(([version, items]) => (
              <section key={version} aria-labelledby={anchor(version)} className="grid gap-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10">
                <div className="lg:sticky lg:top-28 lg:self-start">
                  <h2 id={anchor(version)} className="scroll-mt-28 font-mono text-[22px] font-medium tracking-[-0.02em]">
                    {version === "unversioned" ? "Updates" : `v${version}`}
                  </h2>
                  <p className="text-meta mt-1.5 text-muted-foreground">
                    <time dateTime={items[0].date}>{formatDate(items[0].date)}</time>
                  </p>
                  <p className="text-meta mt-0.5 text-foreground-dim">{areas(items.length)}</p>
                </div>
                <ScrollFill>
                  <ol className="space-y-3">
                    {items.map((e) => (
                      <li key={e.slug} id={e.slug} className="relative scroll-mt-28 pl-9">
                        <span aria-hidden="true" className="absolute left-[3px] top-[22px] size-[9px] rounded-full ring-4 ring-background" style={{ background: tone.get(e.slug) }} />
                        <article className="rounded-[18px] border border-border bg-card p-5 shadow-[inset_0_1px_0_var(--hairline)] transition-colors duration-(--dur-2) hover:border-border-strong">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                            <h3 className="text-[17px] font-semibold tracking-[-0.01em]">
                              <Link href={e.href} className="link-draw">
                                {e.title}
                              </Link>
                            </h3>
                            <span className="font-mono text-[11.5px] text-foreground-dim">{e.tags.filter((t) => t !== "release").join(" · ")}</span>
                          </div>
                          <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted-foreground">{e.description}</p>
                          <details className="group/notes mt-3">
                            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-medium text-foreground marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                              <ChevronDown className="size-4 transition-transform duration-(--dur-2) group-open/notes:rotate-180" aria-hidden="true" />
                              <span className="group-open/notes:hidden">What ships</span>
                              <span className="hidden group-open/notes:inline">Hide notes</span>
                            </summary>
                            <div className="mt-3 border-t border-border pt-4">
                              <Markdown className="text-[14px] [&_li]:my-1 [&_p]:my-2 [&_strong]:text-foreground [&_ul]:my-2">{inlineNotes(e.body)}</Markdown>
                            </div>
                          </details>
                        </article>
                      </li>
                    ))}
                  </ol>
                </ScrollFill>
              </section>
            ))}
          </div>
        </>
      )}

      <section aria-labelledby="changelog-subscribe" className="mt-20 grid gap-6 rounded-[22px] border border-border bg-surface/60 p-6 sm:p-8 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 id="changelog-subscribe" className="text-display-4">
            Get release notes by email
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground">Subscribe to the newsletter to hear when a new release lands.</p>
        </div>
        <NewsletterForm source="changelog" />
      </section>
    </div>
  );
}
