import Link from "next/link";
import { routeMetadata } from "@/lib/seo";
import { formatDate, listDocs } from "@/lib/content";
import { LEARN_SIDEBAR } from "@/lib/content/nav";
import { ArticleShell } from "@/components/docs/article-layout";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { PageTitle } from "@/components/marketing/backdrop";

export const metadata = routeMetadata("/blog");

export default async function BlogPage() {
  const posts = await listDocs("blog");
  return (
    <ArticleShell sidebar={LEARN_SIDEBAR}>
      <Breadcrumbs items={[{ name: "Learn", path: "/learn" }, { name: "Blog", path: "/blog" }]} className="mb-4" />
      <header className="max-w-3xl">
        <PageTitle>Blog</PageTitle>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">Engineering notes and product updates from the team building Codexa.</p>
      </header>
      {posts.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-border-strong p-8 text-center text-sm text-muted-foreground">No posts yet.</p>
      ) : (
        <ol className="mt-8 divide-y divide-border">
          {posts.map((p) => (
            <li key={p.href} className="py-6 first:pt-0">
              <article>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{p.category}</Badge>
                  <time dateTime={p.date}>{formatDate(p.date)}</time>
                  <span aria-hidden="true">·</span>
                  <span>{p.readingTime.text}</span>
                </div>
                <h2 className="mt-2 text-xl font-semibold leading-snug">
                  <Link href={p.href} className="hover:text-primary">
                    {p.title}
                  </Link>
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{p.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">By {p.author}</p>
              </article>
            </li>
          ))}
        </ol>
      )}
    </ArticleShell>
  );
}
