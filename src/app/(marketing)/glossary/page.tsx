import Link from "next/link";
import { routeMetadata } from "@/lib/seo";
import { groupGlossaryByLetter, GLOSSARY } from "@/lib/content/glossary";
import { LEARN_SIDEBAR } from "@/lib/content/nav";
import { ArticleShell } from "@/components/docs/article-layout";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { HubHeader } from "@/components/docs/hub-header";

export const metadata = routeMetadata("/glossary");

export default function GlossaryPage() {
  const groups = groupGlossaryByLetter();
  return (
    <ArticleShell sidebar={LEARN_SIDEBAR}>
      <Breadcrumbs items={[{ name: "Learn", path: "/learn" }, { name: "Glossary", path: "/glossary" }]} className="mb-8" />
      <HubHeader kicker="Glossary" title="Glossary." dim="The words we use." lead={`${GLOSSARY.length} terms used across Codexa, each linked to the page that explains it in depth.`} />
      <nav aria-label="Jump to letter" className="sticky top-[7.75rem] z-10 mt-10 rounded-[14px] border border-border bg-card/95 p-1.5 shadow-md backdrop-blur-md lg:top-24">
        <ul className="flex gap-0.5 overflow-x-auto [scrollbar-width:none] sm:flex-wrap [&::-webkit-scrollbar]:hidden">
          {groups.map((g) => (
            <li key={g.letter}>
              <a
                href={`#letter-${g.letter}`}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] font-mono text-[13px] font-medium text-muted-foreground transition-colors duration-(--dur-2) hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                {g.letter}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-10 space-y-12">
        {groups.map((g) => (
          <section key={g.letter} aria-labelledby={`letter-${g.letter}`} className="grid gap-x-8 sm:grid-cols-[4rem_minmax(0,1fr)]">
            <h2 id={`letter-${g.letter}`} className="font-display scroll-mt-48 text-[40px] font-bold leading-none tracking-[-0.04em] text-foreground-dim lg:scroll-mt-44">
              {g.letter}
            </h2>
            <dl className="mt-3 divide-y divide-border border-y border-border sm:mt-0">
              {g.terms.map((t) => (
                <div key={t.slug} id={t.slug} className="group scroll-mt-48 py-5 lg:scroll-mt-44">
                  <dt className="text-[16px] font-semibold tracking-[-0.01em]">
                    <a href={`#${t.slug}`} className="inline-flex items-center gap-2 hover:text-foreground">
                      {t.term}
                      <span aria-hidden="true" className="font-mono text-[12px] font-normal text-foreground-dim opacity-0 transition-opacity group-hover:opacity-100">
                        #
                      </span>
                    </a>
                  </dt>
                  <dd className="mt-1.5 max-w-3xl text-[14.5px] leading-relaxed text-muted-foreground">
                    {t.definition}
                    {t.href ? (
                      <>
                        {" "}
                        <Link href={t.href} className="link-draw whitespace-nowrap font-medium text-foreground">
                          Learn more
                        </Link>
                      </>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </ArticleShell>
  );
}
