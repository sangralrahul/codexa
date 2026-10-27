import { Check, X } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/marketing/page-header";
import { Section, SectionHeader } from "@/components/marketing/section";
import { CTABand } from "@/components/marketing/cta-band";

export const metadata = routeMetadata("/brand-guidelines");

/* The swatches render the live tokens from src/app/globals.css: the left half in your current theme, the right half on ink. */
const colors = [
  { name: "Background", token: "--background", cls: "bg-background" },
  { name: "Foreground", token: "--foreground", cls: "bg-foreground" },
  { name: "Surface", token: "--surface", cls: "bg-surface" },
  { name: "Border", token: "--border-strong", cls: "bg-border-strong" },
  { name: "Signal", token: "--signal", cls: "bg-signal" },
  { name: "Signal 2", token: "--signal-2", cls: "bg-signal-2" },
  { name: "Accent", token: "--accent", cls: "bg-accent" },
  { name: "Success", token: "--success", cls: "bg-success" },
  { name: "Warning", token: "--warning", cls: "bg-warning" },
  { name: "Danger", token: "--danger", cls: "bg-danger" },
];

const type = [
  { name: "Mona Sans", role: "Display: headings, prices, big numerals", sample: "Ship it. Roll it back.", cls: "font-display text-[2rem] font-bold tracking-[-0.04em] [font-stretch:108%]" },
  { name: "Geist", role: "Interface and body text", sample: "Describe what you want to build.", cls: "text-[1.375rem] font-medium tracking-[-0.01em]" },
  { name: "Geist Mono", role: "Code, paths, kickers, status", sample: "src/components/Invoice.tsx", cls: "font-mono text-[1.0625rem]" },
];

const dos = [
  "Use the mark in the foreground colour, on paper or on ink.",
  "Keep clear space of at least half the mark's width.",
  "Set the wordmark in Geist, semibold, uppercase, 0.18em tracking.",
  "Use the ember gradient on one call to action per screen, at most two per page.",
];
const donts = [
  "Recolour, rotate, stretch, or add shadows to the mark.",
  "Use ember as gradient text or as a large fill.",
  "Use the name to imply endorsement or partnership.",
  "Use Danger or Warning colours decoratively.",
];

export default function BrandGuidelinesPage() {
  return (
    <div data-tone="company">
      <PageHeader
        variant="editorial"
        crumbs={[
          { name: "Brand", path: "/brand" },
          { name: "Brand guidelines", path: "/brand-guidelines" },
        ]}
        kicker="Brand guidelines"
        headline="Tokens, type and the rules."
        highlight="the rules."
        lede="Colours, typography, and the rules for using the Codexa name and mark. Every value is a design token the product is built with."
        meta={[
          { label: "Themes", value: "Paper (light) and ink (dark)" },
          { label: "Source", value: "src/app/globals.css" },
        ]}
      />
      <Section size="sm">
        <SectionHeader index="01" eyebrow="Colour" title="Neutrals carry the page." description="About 70% neutrals, 20% surfaces, 10% colour. Each swatch shows the live token: left in your current theme, right on ink." />
        <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {colors.map((c) => (
            <li key={c.name} className="rounded-[16px] border border-border bg-card p-3">
              <div aria-hidden="true" className="grid h-16 grid-cols-2 overflow-hidden rounded-[10px] border border-border">
                <span className={c.cls} />
                <span className="dark contents">
                  <span className={c.cls} />
                </span>
              </div>
              <p className="mt-3 text-sm font-medium">{c.name}</p>
              <p className="font-mono text-[11.5px] text-muted-foreground">{c.token}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section size="sm" className="border-t border-border/60">
        <SectionHeader index="02" eyebrow="Typography" title="Three faces, three jobs." />
        <ul className="mt-10 divide-y divide-border border-y border-border">
          {type.map((t) => (
            <li key={t.name} className="grid grid-cols-1 gap-3 py-6 md:grid-cols-[14rem_minmax(0,1fr)] md:items-baseline">
              <div>
                <p className="text-[15px] font-semibold">{t.name}</p>
                <p className="text-[13px] text-muted-foreground">{t.role}</p>
              </div>
              <p className={t.cls}>{t.sample}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section size="sm" className="border-t border-border/60">
        <SectionHeader index="03" eyebrow="Usage" title="Do, and don't." />
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="e1 rounded-[20px] p-6 sm:p-7">
            <h3 className="flex items-center gap-2 text-[16px] font-semibold">
              <Check className="size-4 text-success" aria-hidden="true" /> Do
            </h3>
            <ul className="mt-4 space-y-2.5 text-[14.5px]">
              {dos.map((d) => (
                <li key={d} className="relative pl-5 text-foreground/85">
                  <span aria-hidden="true" className="absolute left-0 top-[0.65em] h-px w-2.5 bg-success" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="e1 rounded-[20px] p-6 sm:p-7">
            <h3 className="flex items-center gap-2 text-[16px] font-semibold">
              <X className="size-4 text-danger" aria-hidden="true" /> Don&apos;t
            </h3>
            <ul className="mt-4 space-y-2.5 text-[14.5px]">
              {donts.map((d) => (
                <li key={d} className="relative pl-5 text-foreground/85">
                  <span aria-hidden="true" className="absolute left-0 top-[0.65em] h-px w-2.5 bg-danger" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
      <CTABand tone="company" title="Need the files?" description="The mark is served as SVG at /icon and the social image at /opengraph-image." primary={{ label: "Press kit", href: "/press-kit" }} secondary={{ label: "Brand", href: "/brand" }} />
    </div>
  );
}
