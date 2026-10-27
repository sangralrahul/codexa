import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Eye, Globe, RotateCcw, ServerCog } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { formatDate, listDocs } from "@/lib/content";
import { COMPANY_PAGES } from "@/content/marketing/company";
import type { ContentBlock } from "@/content/marketing/types";
import { PageHeader, Kicker } from "@/components/marketing/page-header";
import { Section, SectionHeader } from "@/components/marketing/section";
import { ContentBlocks } from "@/components/marketing/content-blocks";
import { CTABand } from "@/components/marketing/cta-band";
import { Inline } from "@/components/marketing/inline";

const PATH = "/about";
export const metadata = routeMetadata(PATH);

const page = COMPANY_PAGES[PATH];
const section = (id: string) => page.sections.find((s) => s.id === id);
const listItems = (id: string) => (section(id)?.blocks.find((b) => b.type === "list") as Extract<ContentBlock, { type: "list" }> | undefined)?.items ?? [];

/** Each principle is a sentence from the content model with an icon and a short title. */
const PRINCIPLE_META = [
  { title: "Honest states", Icon: Eye },
  { title: "Reversible by default", Icon: RotateCcw },
  { title: "Enforced on the server", Icon: ServerCog },
  { title: "India and the world", Icon: Globe },
];

type Entry = Awaited<ReturnType<typeof listDocs>>[number];
type Release = { key: string; version?: string; date: string; entries: Entry[] };

/** Changelog entries grouped into releases (same version and date), newest first, keeping entry order. */
function releasesOf(entries: Entry[]): Release[] {
  const map = new Map<string, Release>();
  for (const e of entries) {
    const key = `${e.version ?? ""}|${e.date}`;
    const r = map.get(key) ?? { key, version: e.version, date: e.date, entries: [] };
    r.entries.push(e);
    map.set(key, r);
  }
  return [...map.values()];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default async function AboutPage() {
  const shipped = await listDocs("changelog").catch(() => []);
  const releases = releasesOf(shipped);
  const what = section("what")?.blocks.find((b) => b.type === "paragraph") as Extract<ContentBlock, { type: "paragraph" }> | undefined;
  const principles = listItems("principles");
  const stage = listItems("stage");
  const contact = section("contact");

  return (
    <div data-tone="company">
      <PageHeader
        variant="editorial"
        crumbs={[{ name: "About", path: PATH }]}
        kicker={page.eyebrow}
        headline={page.headline ?? page.title}
        mark={page.mark}
        lede={page.intro}
        meta={[
          { label: "Stage", value: "Early, small founding team" },
          { label: "Where", value: "Built in India, remote" },
          { label: "Shipped", value: `${plural(releases.length, "release")} · ${plural(shipped.length, "change")}` },
        ]}
      />

      {what ? (
        <Section size="sm">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Top-aligned with the statement's first line (a stretched flex row would centre it on all five). */}
            <Kicker className="self-start lg:col-span-3 lg:pt-3">What we are building</Kicker>
            <p data-reveal className="text-display-4 text-pretty lg:col-span-9">
              <Inline text={what.text} />
            </p>
          </div>
        </Section>
      ) : null}

      {principles.length ? (
        <Section size="sm" className="border-t border-border/60">
          <SectionHeader index="01" eyebrow="How we work" title="Four rules the product keeps." />
          <ul data-reveal="stagger" data-spotlight="grid" className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((p, i) => {
              const meta = PRINCIPLE_META[i] ?? { title: `Principle ${i + 1}`, Icon: Eye };
              // "Honest states: when something…" → the part after the label, capitalised.
              const rest = p.includes(":") ? p.slice(p.indexOf(":") + 1).trim() : p;
              const body = rest.charAt(0).toUpperCase() + rest.slice(1);
              return (
                <li key={p} data-spotlight-tile className="relative flex flex-col rounded-[18px] border border-border bg-card p-6 shadow-[inset_0_1px_0_var(--hairline)]">
                  <span aria-hidden="true" className="mk-num font-display text-[56px] font-extrabold leading-none tracking-[-0.025em] text-foreground/[0.08] [font-stretch:112%]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-6 flex items-center gap-2 text-[17px] font-semibold tracking-[-0.015em]">
                    <meta.Icon className="size-4 text-signal-ink" aria-hidden="true" />
                    {meta.title}
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
                    <Inline text={body} />
                  </p>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      <Section size="sm" className="border-t border-border/60">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="min-w-0 lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <SectionHeader index="02" eyebrow="What we have shipped" title="Read the changelog, not a pitch." description="Every release below comes from the changelog, newest first, with the changes it shipped. Planned work lives on the roadmap." />
              <ul className="mt-8 space-y-2.5 border-t border-border pt-6 text-[14.5px]">
                {stage.map((s) => (
                  <li key={s} className="relative pl-5 text-muted-foreground">
                    <span aria-hidden="true" className="absolute left-0 top-[0.65em] h-px w-2.5 bg-foreground/40" />
                    <Inline text={s} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <ol className="relative min-w-0 lg:col-span-7">
            <span aria-hidden="true" className="absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-signal via-border-strong to-transparent" />
            {releases.map((r, i) => {
              // A category on every row only helps when a release mixes them (not "Release" eight times).
              const mixed = new Set(r.entries.map((e) => e.category)).size > 1;
              return (
                <li key={r.key} data-reveal style={{ "--reveal-delay": `${Math.min(i, 6) * 60}ms` } as React.CSSProperties} className="relative min-w-0 pb-12 pl-10 last:pb-0">
                  <span aria-hidden="true" className={`absolute left-0 top-1.5 size-[15px] rounded-full border-2 ${i === 0 ? "border-signal bg-background shadow-[0_0_0_4px_color-mix(in_oklab,var(--signal)_15%,transparent)]" : "border-border-strong bg-background"}`} />
                  <h3 className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    {r.version ? <span className="mk-num font-display text-[22px] font-bold leading-none tracking-[-0.02em]">v{r.version}</span> : null}
                    <span className="text-[13px] text-muted-foreground">
                      <time dateTime={r.date}>{formatDate(r.date)}</time>
                      <span aria-hidden="true"> · </span>
                      {plural(r.entries.length, "change")}
                    </span>
                  </h3>
                  <ul className="mt-4 min-w-0 divide-y divide-border rounded-[14px] border border-border bg-card/60 shadow-[inset_0_1px_0_var(--hairline)]">
                    {r.entries.map((e) => (
                      <li key={e.href}>
                        <Link href={e.href} className="group flex min-w-0 items-start gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.03]">
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline gap-x-2">
                              <span className="text-[14.5px] font-medium">{e.title}</span>
                              {mixed && e.category ? <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">{e.category}</span> : null}
                            </span>
                            <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{e.description}</span>
                          </span>
                          <ArrowUpRight className="mt-1 size-3.5 shrink-0 text-muted-foreground transition-[translate,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground group-focus-visible:text-foreground" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
            {releases.length === 0 ? <li className="text-muted-foreground">No releases yet.</li> : null}
          </ol>
        </div>
      </Section>

      {contact ? (
        <Section size="sm" className="border-t border-border/60">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeader index="03" eyebrow="Get in touch" title="Talk to the team." />
            <Link href="/mission" className="link-draw inline-flex items-center gap-1 text-[14px] font-medium">
              Why we are doing this <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-10">
            <ContentBlocks blocks={contact.blocks} />
          </div>
        </Section>
      ) : null}

      {page.cta ? <CTABand tone="company" title={page.cta.title} description={page.cta.description} primary={page.cta.primary} secondary={page.cta.secondary ?? null} /> : null}
    </div>
  );
}
