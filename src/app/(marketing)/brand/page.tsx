import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { site } from "@/config/site";
import { Logo, LogoMark } from "@/components/logo";
import { PageHeader } from "@/components/marketing/page-header";
import { Section, SectionHeader } from "@/components/marketing/section";
import { buttonClasses } from "@/components/ui/button";

export const metadata = routeMetadata("/brand");

/** The brand rendered live: the mark on paper and on ink (the dark palette as an island), the lockup, and the five motifs. */
const MOTIFS = [
  { name: "Ember rim", body: "A 1px light on the top edge of the things that matter: the composer, plan cards, product windows.", demo: <span className="rim block h-10 w-full rounded-[10px] border border-border-strong bg-card" /> },
  { name: "Selection mark", body: "Once per page, in the headline: the words look as if they had just been selected in the editor.", demo: <span className="text-[22px] font-semibold">Ship it. <span className="mark-select">Roll it back.</span></span> },
  { name: "Signal caret", body: "The cursor of the editor and the agent. Ember, blinking only while something is being written.", demo: <span className="font-mono text-[15px]">npm run dev<span className="caret" /></span> },
  { name: "Blueprint grid", body: "A quiet 64px grid behind heroes and calls to action, fading out from the centre.", demo: <span className="relative block h-10 w-full overflow-hidden rounded-[10px] border border-border"><span className="bg-blueprint absolute inset-0 [mask-image:none]" /></span> },
  { name: "Live dot", body: "Six pixels of green with an expanding ring, used only for things that really are live.", demo: <span className="inline-flex items-center gap-2 text-[14px]"><span className="live-dot" /> Live</span> },
];

export default function BrandPage() {
  return (
    <div data-tone="company">
      <PageHeader
        variant="editorial"
        crumbs={[{ name: "Brand", path: "/brand" }]}
        kicker="Brand"
        headline="A mark, a light, a voice."
        highlight="a voice."
        lede="Everything on this page is rendered live by the same components the product uses, so what you see is what ships."
        meta={[
          { label: "Name", value: `"${site.name}", one word, capital C` },
          { label: "Display face", value: "Mona Sans" },
          { label: "Interface", value: "Geist and Geist Mono" },
        ]}
      />
      <Section size="sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <figure className="flex flex-col items-center justify-center gap-6 rounded-[20px] border border-border bg-white p-12" style={{ "--foreground": "black", "--background": "white", color: "black" } as React.CSSProperties}>
            <div className="flex items-center gap-5">
              <LogoMark size={64} />
              <span className="text-2xl font-semibold uppercase tracking-[0.18em]">Codexa</span>
            </div>
            <figcaption className="font-mono text-[11px] uppercase tracking-[0.08em] opacity-60">On paper</figcaption>
          </figure>
          <figure className="dark flex flex-col items-center justify-center gap-6 rounded-[20px] border border-border-strong bg-background p-12 text-foreground">
            <div className="flex items-center gap-5">
              <LogoMark size={64} />
              <span className="text-2xl font-semibold uppercase tracking-[0.18em]">Codexa</span>
            </div>
            <figcaption className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">On ink</figcaption>
          </figure>
        </div>
        <div className="e1 mt-4 flex flex-wrap items-center gap-8 rounded-[20px] p-6">
          <Logo />
          <Logo withText={false} />
          <LogoMark size={28} state="running" />
          <p className="text-sm text-muted-foreground">The header lockup, the standalone mark, and the mark while the agent is working.</p>
        </div>
      </Section>
      <Section size="sm" className="border-t border-border/60">
        <SectionHeader index="01" eyebrow="Motifs" title="Five, and only five." description="The site and the product use these and nothing else for emphasis." />
        <ul data-reveal="stagger" className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {MOTIFS.map((m) => (
            <li key={m.name} className="flex flex-col gap-5 rounded-[18px] border border-border bg-card p-5">
              <div aria-hidden="true" className="flex min-h-12 items-center">
                {m.demo}
              </div>
              <div>
                <p className="text-[15px] font-semibold">{m.name}</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{m.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/brand-guidelines" className={buttonClasses("secondary", "md", "group")}>
            Brand guidelines
            <ArrowRight className="size-4 transition-transform duration-300 ease-snap group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <Link href="/press-kit" className={buttonClasses("outline", "md")}>
            Press kit
          </Link>
        </div>
      </Section>
    </div>
  );
}
