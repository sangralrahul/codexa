import Link from "next/link";
import { ArrowRight, LifeBuoy } from "lucide-react";
import { routeMetadata, jsonLd } from "@/lib/seo";
import { FAQ_GROUPS } from "@/lib/content/faq";
import { site } from "@/config/site";
import { PageHeader } from "@/components/marketing/page-header";
import { FAQ } from "@/components/marketing/faq";
import { OnThisPage } from "@/components/marketing/on-this-page";
import { CTABand } from "@/components/marketing/cta-band";

export const metadata = routeMetadata("/faq");

const questions = FAQ_GROUPS.reduce((n, g) => n + g.items.length, 0);

/** Each answer keeps its "read more" destination as an inline link (rendered by the FAQ's Inline). */
const itemsFor = (g: (typeof FAQ_GROUPS)[number]) => g.items.map((i) => ({ question: i.q, answer: i.href ? `${i.a} [Read more](${i.href})` : i.a }));

export default function FaqPage() {
  const ld = jsonLd({
    "@type": "FAQPage",
    mainEntity: FAQ_GROUPS.flatMap((g) => g.items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } }))),
  });
  return (
    <div data-tone="docs">
      <script type="application/ld+json" dangerouslySetInnerHTML={ld} />
      <PageHeader
        variant="editorial"
        crumbs={[{ name: "FAQ", path: "/faq" }]}
        kicker="Frequently asked questions"
        headline="Short answers, linked to the docs."
        mark="linked to the docs."
        lede={
          <>
            Each answer is short and points to the page with the full detail. For problems with your own account or projects, the{" "}
            <Link href="/help" className="link-draw font-medium text-foreground">
              help center
            </Link>{" "}
            and support are faster.
          </>
        }
        meta={[
          { label: "Topics", value: String(FAQ_GROUPS.length) },
          { label: "Questions", value: String(questions) },
          { label: "Source", value: "The same answers as the docs" },
        ]}
      />
      <div className="container-x pb-8 pt-12 lg:pt-16">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_15rem] xl:gap-20">
          <aside className="contents lg:sticky lg:top-24 lg:order-2 lg:block lg:space-y-6 lg:self-start">
            <OnThisPage items={FAQ_GROUPS.map((g) => ({ id: g.id, title: g.title }))} label="Topics" />
            <div className="hidden rounded-[16px] border border-border bg-card p-5 shadow-[inset_0_1px_0_var(--hairline)] lg:block">
              <LifeBuoy className="size-4 text-signal-ink" aria-hidden="true" />
              <p className="mt-3 text-[14px] font-semibold">Not answered here?</p>
              <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                Email{" "}
                <a href={`mailto:${site.company.supportEmail}`} className="link-draw text-foreground">
                  {site.company.supportEmail}
                </a>{" "}
                or use the form.
              </p>
              <Link href="/support" className="group mt-3 inline-flex items-center gap-1 text-[13px] font-medium">
                Contact support
                <ArrowRight className="size-3.5 transition-transform duration-300 ease-snap group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </aside>
          <div className="min-w-0 max-w-3xl space-y-16">
            {FAQ_GROUPS.map((g, i) => (
              <section key={g.id} id={g.id} aria-labelledby={`faq-${g.id}`} className="scroll-mt-32">
                <p aria-hidden="true" className="text-label text-signal-ink">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2 id={`faq-${g.id}`} className="text-display-4 mt-3">
                  {g.title}
                </h2>
                <FAQ items={itemsFor(g)} className="mt-6" />
              </section>
            ))}
          </div>
        </div>
      </div>
      <CTABand variant="docs" tone="docs" />
    </div>
  );
}
