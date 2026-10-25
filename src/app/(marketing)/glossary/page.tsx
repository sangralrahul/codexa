import Link from "next/link";
import { routeMetadata } from "@/lib/seo";
import { groupGlossaryByLetter, GLOSSARY } from "@/lib/content/glossary";
import { LEARN_SIDEBAR } from "@/lib/content/nav";
import { ArticleShell } from "@/components/docs/article-layout";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";

export const metadata = routeMetadata("/glossary");

export default function GlossaryPage() {
  const groups = groupGlossaryByLetter();
  return (
    <ArticleShell sidebar={LEARN_SIDEBAR}>
      <Breadcrumbs items={[{ name: "Learn", path: "/learn" }, { name: "Glossary", path: "/glossary" }]} className="mb-4" />
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Glossary</h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">{GLOSSARY.length} terms used across Codexa, each linked to the page that explains it in depth.</p>
      </header>
      <nav aria-label="Jump to letter" className="sticky top-16 z-10 -mx-4 mt-6 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        <ul className="flex flex-wrap gap-1">
          {groups.map((g) => (
            <li key={g.letter}>
              <a href={`#letter-${g.letter}`} className="inline-flex size-8 items-center justify-center rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                {g.letter}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-8 space-y-10">
        {groups.map((g) => (
          <section key={g.letter} aria-labelledby={`letter-${g.letter}`}>
            <h2 id={`letter-${g.letter}`} className="scroll-mt-32 text-2xl font-semibold tracking-tight">
              {g.letter}
            </h2>
            <dl className="mt-3 divide-y divide-border">
              {g.terms.map((t) => (
                <div key={t.slug} id={t.slug} className="scroll-mt-32 py-4">
                  <dt className="font-semibold">
                    <a href={`#${t.slug}`} className="hover:text-primary">
                      {t.term}
                    </a>
                  </dt>
                  <dd className="mt-1 max-w-3xl text-sm text-muted-foreground">
                    {t.definition}
                    {t.href ? (
                      <>
                        {" "}
                        <Link href={t.href} className="text-primary underline">
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
