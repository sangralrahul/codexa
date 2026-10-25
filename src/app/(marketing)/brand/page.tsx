import Link from "next/link";
import { routeMetadata } from "@/lib/seo";
import { site } from "@/config/site";
import { Logo, LogoMark } from "@/components/logo";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Section, SectionHeader } from "@/components/marketing/section";
import { buttonClasses } from "@/components/ui/button";

export const metadata = routeMetadata("/brand");

export default function BrandPage() {
  return (
    <>
      <article className="container-x py-10 sm:py-14">
        <Breadcrumbs items={[{ name: "Brand", path: "/brand" }]} />
        <header className="mt-6 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Company</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">The Codexa brand</h1>
          <p className="mt-4 text-lg text-muted-foreground">A mark, a wordmark, and a small set of colours. Everything on this page is rendered live from the same components the product uses, so what you see is what ships.</p>
        </header>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <figure className="rounded-xl border border-border bg-white p-10 text-[#0b0c0f]" style={{ colorScheme: "light" }}>
            <div className="flex items-center justify-center gap-6">
              <LogoMark size={64} className="[&_rect:first-child]:fill-[#0b0c0f]" />
              <span className="text-2xl font-semibold uppercase tracking-[0.18em]">Codexa</span>
            </div>
            <figcaption className="mt-6 text-center text-xs text-[#5b6270]">Mark and wordmark on light</figcaption>
          </figure>
          <figure className="rounded-xl border border-border bg-[#0b0c0f] p-10 text-[#f2f3f5]" style={{ colorScheme: "dark" }}>
            <div className="flex items-center justify-center gap-6">
              <LogoMark size={64} className="[&_rect:first-child]:fill-[#f2f3f5] [&_path]:stroke-[#0b0c0f]" />
              <span className="text-2xl font-semibold uppercase tracking-[0.18em]">Codexa</span>
            </div>
            <figcaption className="mt-6 text-center text-xs text-[#9aa3b2]">Mark and wordmark on dark</figcaption>
          </figure>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-6 rounded-xl border border-border bg-card p-6">
          <Logo />
          <Logo withText={false} />
          <p className="text-sm text-muted-foreground">The header lockup and the standalone mark, as rendered by the product.</p>
        </div>
      </article>
      <Section tone="surface" className="py-12">
        <SectionHeader title="Name" description={`Write it as "Codexa", capital C, one word. ${site.tagline}`} />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/brand-guidelines" className={buttonClasses("primary", "md")}>
            Brand guidelines
          </Link>
          <Link href="/press-kit" className={buttonClasses("outline", "md")}>
            Press kit
          </Link>
        </div>
      </Section>
    </>
  );
}
