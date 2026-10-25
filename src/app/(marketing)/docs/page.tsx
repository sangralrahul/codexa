import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { getNavigation } from "@/lib/content";
import { sectionSidebar } from "@/lib/content/nav";
import { ArticleShell } from "@/components/docs/article-layout";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { buttonClasses } from "@/components/ui/button";
import { PageTitle } from "@/components/marketing/backdrop";

export const metadata = routeMetadata("/docs");

export default async function DocsIndexPage() {
  const [groups, sidebar] = await Promise.all([getNavigation("docs"), sectionSidebar("docs")]);
  return (
    <ArticleShell sidebar={sidebar}>
      <Breadcrumbs items={[{ name: "Documentation", path: "/docs" }]} className="mb-4" />
      <header className="max-w-3xl">
        <PageTitle>Documentation</PageTitle>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          How Codexa works, from your first prompt to a deployed application. Everything here describes the product as it ships today; roadmap items are marked as such.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/docs/quickstart" className={buttonClasses("primary", "md")}>
            Quickstart
          </Link>
          <Link href="/api" className={buttonClasses("outline", "md")}>
            HTTP API
          </Link>
        </div>
      </header>
      <div className="mt-10 space-y-10">
        {groups.map((g) => (
          <section key={g.category} aria-labelledby={`group-${g.category}`}>
            <h2 id={`group-${g.category}`} className="text-lg font-semibold">
              {g.category}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {g.items.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className="group flex h-full flex-col rounded-lg border border-border p-4 transition hover:border-border-strong hover:bg-muted/40">
                    <span className="flex items-center justify-between font-medium group-hover:text-primary">
                      {d.title}
                      <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                    </span>
                    <span className="mt-1 text-sm text-muted-foreground">{d.description}</span>
                    <span className="mt-2 text-xs text-muted-foreground">{d.readingTime.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </ArticleShell>
  );
}
