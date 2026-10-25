import Link from "next/link";
import { routeMetadata } from "@/lib/seo";
import { formatDate, listDocs } from "@/lib/content";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { NewsletterForm } from "@/components/docs/newsletter-form";
import { PageTitle } from "@/components/marketing/backdrop";

export const metadata = routeMetadata("/changelog");

export default async function ChangelogPage() {
  const entries = await listDocs("changelog");
  const versions = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = e.version ?? "unversioned";
    versions.set(key, [...(versions.get(key) ?? []), e]);
  }
  return (
    <div className="container-x py-10 sm:py-14">
      <Breadcrumbs items={[{ name: "Changelog", path: "/changelog" }]} className="mb-4" />
      <header className="max-w-3xl">
        <PageTitle>Changelog</PageTitle>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">What each release actually ships, by area. Entries describe implemented behaviour only; planned work lives on the <Link href="/roadmap" className="text-primary underline">roadmap</Link>.</p>
      </header>
      {entries.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-border-strong p-8 text-center text-sm text-muted-foreground">No releases yet.</p>
      ) : (
        <div className="mt-10 space-y-12">
          {[...versions.entries()].map(([version, items]) => (
            <section key={version} aria-labelledby={`v-${version}`}>
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 id={`v-${version}`} className="text-2xl font-semibold tracking-tight">
                  {version === "unversioned" ? "Updates" : `Version ${version}`}
                </h2>
                <time dateTime={items[0].date} className="text-sm text-muted-foreground">
                  {formatDate(items[0].date)}
                </time>
              </div>
              <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                {items.map((e) => (
                  <li key={e.href}>
                    <Link href={e.href} className="block h-full rounded-lg border border-border p-4 transition hover:border-border-strong hover:bg-muted/40">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{e.category}</Badge>
                        <span className="text-xs text-muted-foreground">{e.readingTime.text}</span>
                      </div>
                      <span className="mt-2 block font-medium">{e.title}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">{e.description}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
      <section aria-labelledby="changelog-subscribe" className="mt-14 max-w-xl">
        <h2 id="changelog-subscribe" className="text-lg font-semibold">
          Get release notes by email
        </h2>
        <NewsletterForm className="mt-3" source="changelog" />
      </section>
    </div>
  );
}
