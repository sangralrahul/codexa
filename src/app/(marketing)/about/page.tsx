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

export default async function AboutPage() {
  const shipped = await listDocs("changelog").catch(() => []);
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
          { label: "Changelog", value: `${shipped.length} entries so far` },
        ]}
      />

      {what ? (
        <Section size="sm">
          <div className="grid gap-10 lg:grid-cols-12">
            <Kicker className="lg:col-span-3">What we are building</Kicker>
            <p data-reveal className="text-display-4 text-pretty lg:col-span-9">
              <Inline text={what.text} />
            </p>
          </div>
        </Section>
      ) : null}

      {principles.length ? (
        <Section size="sm" className="border-t border-border/60">
          <SectionHeader index="01" eyebrow="How we work" title="Four rules the product keeps." />
          <ul data-reveal="stagger" data-spotlight="grid" className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((p, i) => {
              const meta = PRINCIPLE_META[i] ?? { title: `Principle ${i + 1}`, Icon: Eye };
              // "Honest states: when something…" → the part after the label, capitalised.
              const rest = p.includes(":") ? p.slice(p.indexOf(":") + 1).trim() : p;
              const body = rest.charAt(0).toUpperCase() + rest.slice(1);
              return (
                <li key={p} data-spotlight-tile className="relative flex flex-col rounded-[18px] border border-border bg-card p-6 shadow-[inset_0_1px_0_var(--hairline)]">
                  <span aria-hidden="true" className="mk-num font-display text-[56px] font-extrabold leading-none tracking-[-0.05em] text-foreground/[0.08] [font-stretch:112%]">
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
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <SectionHeader index="02" eyebrow="What we have shipped" title="Read the changelog, not a pitch." description="Every entry below is a release note from the changelog, newest first. Planned work lives on the roadmap." />
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
          <ol className="relative lg:col-span-7">
            <span aria-hidden="true" className="absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-signal via-border-strong to-transparent" />
            {shipped.map((e, i) => (
              <li key={e.href} data-reveal style={{ "--reveal-delay": `${Math.min(i, 6) * 60}ms` } as React.CSSProperties} className="relative pb-10 pl-10 last:pb-0">
                <span aria-hidden="true" className={`absolute left-0 top-1.5 size-[15px] rounded-full border-2 ${i === 0 ? "border-signal bg-background shadow-[0_0_0_4px_color-mix(in_oklab,var(--signal)_15%,transparent)]" : "border-border-strong bg-background"}`} />
                <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                  {e.version ? <span className="rounded-full bg-signal/10 px-2 py-0.5 font-mono text-[11px] font-medium text-signal-ink">v{e.version}</span> : null}
                  <time dateTime={e.date}>{formatDate(e.date)}</time>
                  <span aria-hidden="true">·</span>
                  <span>{e.category}</span>
                </p>
                <h3 className="mt-2 text-[18px] font-semibold tracking-[-0.015em]">
                  <Link href={e.href} className="link-draw outline-offset-4">
                    {e.title}
                  </Link>
                </h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted-foreground">{e.description}</p>
              </li>
            ))}
            {shipped.length === 0 ? <li className="text-muted-foreground">No releases yet.</li> : null}
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
