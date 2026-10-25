import { Check, X } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Section, SectionHeader } from "@/components/marketing/section";
import { CTABand } from "@/components/marketing/cta-band";

export const metadata = routeMetadata("/brand-guidelines");

/* Token values mirror src/app/globals.css; the swatches use the tokens themselves. */
const colors = [
  { name: "Background", token: "bg-background", light: "#ffffff", dark: "#0b0c0f" },
  { name: "Foreground", token: "bg-foreground", light: "#0b0c0f", dark: "#f2f3f5" },
  { name: "Surface", token: "bg-surface", light: "#f6f7f9", dark: "#111318" },
  { name: "Muted", token: "bg-muted", light: "#f1f3f6", dark: "#1a1d23" },
  { name: "Border", token: "bg-border", light: "#e3e6eb", dark: "#23262d" },
  { name: "Primary", token: "bg-primary", light: "#2f6bff", dark: "#4d80ff" },
  { name: "Accent", token: "bg-accent", light: "#6d5cff", dark: "#8b7bff" },
  { name: "Success", token: "bg-success", light: "#15803d", dark: "#22c55e" },
  { name: "Warning", token: "bg-warning", light: "#b45309", dark: "#f59e0b" },
  { name: "Danger", token: "bg-danger", light: "#dc2626", dark: "#ef4444" },
];

const dos = ["Use the mark in the foreground colour on light or dark backgrounds.", "Keep clear space of at least half the mark's width.", "Set the wordmark in Geist Sans, semibold, uppercase, 0.18em tracking.", "Use Primary for one action per screen; use Muted and Border for structure."];
const donts = ["Recolour, rotate, stretch, or add shadows to the mark.", "Place the mark inside another shape or badge.", "Use the name to imply endorsement or partnership.", "Use Danger or Warning colours decoratively."];

export default function BrandGuidelinesPage() {
  return (
    <>
      <article className="container-x py-10 sm:py-14">
        <Breadcrumbs items={[{ name: "Brand", path: "/brand" }, { name: "Brand guidelines", path: "/brand-guidelines" }]} />
        <header className="mt-6 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Company</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">Brand guidelines</h1>
          <p className="mt-4 text-lg text-muted-foreground">Colours, typography, and the rules for using the Codexa name and mark. The values are the design tokens the product is built with.</p>
        </header>
      </article>
      <Section tone="surface" className="py-12">
        <SectionHeader title="Colour" description="Each token has a light and a dark value; the product switches automatically. Swatches below render the live token in your current theme." />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {colors.map((c) => (
            <li key={c.name} className="rounded-xl border border-border bg-card p-3">
              <div className={`h-14 rounded-lg border border-border ${c.token}`} aria-hidden="true" />
              <p className="mt-2 text-sm font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                <code>{c.light}</code> light · <code>{c.dark}</code> dark
              </p>
            </li>
          ))}
        </ul>
      </Section>
      <Section className="py-12">
        <SectionHeader title="Typography" description="Geist Sans for interface and marketing text; Geist Mono for code, file paths, and values." />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Geist Sans</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">Build software at the speed of thought.</p>
            <p className="mt-2 text-base text-muted-foreground">Regular for body, medium for labels, semibold for headings. Headings use tight letter-spacing.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Geist Mono</p>
            <pre className="mt-3">
              <code>{`npm run dev\nsrc/components/Invoice.tsx\n429 Too Many Requests`}</code>
            </pre>
          </div>
        </div>
      </Section>
      <Section tone="surface" className="py-12">
        <SectionHeader title="Logo usage" />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Check className="size-4 text-success" aria-hidden="true" /> Do
            </h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-6 text-sm">
              {dos.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <X className="size-4 text-danger" aria-hidden="true" /> Don&apos;t
            </h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-6 text-sm">
              {donts.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
      <CTABand title="Need the files?" description="The mark is served as SVG at /icon; the social image at /opengraph-image." primary={{ label: "Press kit", href: "/press-kit" }} secondary={{ label: "Brand", href: "/brand" }} />
    </>
  );
}
