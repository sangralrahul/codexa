import Link from "next/link";
import { routeMetadata, jsonLd } from "@/lib/seo";
import { FAQ_GROUPS } from "@/lib/content/faq";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { FaqAccordion } from "@/components/docs/faq-accordion";

export const metadata = routeMetadata("/faq");

export default function FaqPage() {
  const ld = jsonLd({
    "@type": "FAQPage",
    mainEntity: FAQ_GROUPS.flatMap((g) => g.items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } }))),
  });
  return (
    <div className="container-x py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={ld} />
      <Breadcrumbs items={[{ name: "FAQ", path: "/faq" }]} className="mb-4" />
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Frequently asked questions</h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">Short answers with links to the full documentation. For account-specific problems, see the <Link href="/help" className="text-primary underline">help center</Link>.</p>
      </header>
      <nav aria-label="FAQ sections" className="mt-6">
        <ul className="flex flex-wrap gap-2">
          {FAQ_GROUPS.map((g) => (
            <li key={g.id}>
              <a href={`#${g.id}`} className="inline-flex rounded-full border border-border px-3 py-1 text-sm text-muted-foreground hover:border-border-strong hover:text-foreground">
                {g.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-10 max-w-3xl">
        <FaqAccordion groups={FAQ_GROUPS} />
      </div>
    </div>
  );
}
