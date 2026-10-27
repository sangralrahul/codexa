import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { formatDate, listDocs } from "@/lib/content";
import type { ContentSummary } from "@/lib/content/types";
import { LEARN_SIDEBAR } from "@/lib/content/nav";
import { ArticleShell } from "@/components/docs/article-layout";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { HubHeader } from "@/components/docs/hub-header";
import { BlogCover } from "@/components/content/blog-cover";

export const metadata = routeMetadata("/blog");

function Byline({ post }: { post: ContentSummary }) {
  return (
    <p className="text-meta flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
      <span>{post.category}</span>
      <span aria-hidden="true" className="text-foreground-dim">
        ·
      </span>
      <time dateTime={post.date}>{formatDate(post.date)}</time>
      <span aria-hidden="true" className="text-foreground-dim">
        ·
      </span>
      <span>{post.author}</span>
    </p>
  );
}

const surface =
  "group relative overflow-hidden rounded-[22px] border border-border bg-card shadow-[inset_0_1px_0_var(--hairline)] transition-[border-color,box-shadow,translate] duration-(--dur-3) hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg calm:hover:translate-y-0";
const card = `${surface} flex h-full flex-col`;
const featuredCard = `${surface} flex flex-col`;

export default async function BlogPage() {
  const posts = await listDocs("blog");
  const [featured, ...rest] = posts;
  return (
    <ArticleShell sidebar={LEARN_SIDEBAR}>
      <Breadcrumbs items={[{ name: "Learn", path: "/learn" }, { name: "Blog", path: "/blog" }]} className="mb-8" />
      <HubHeader kicker="Blog" title="Notes from" dim="the build." lead="Engineering notes and product updates from the team building Codexa. Every post describes the product as it ships." />

      {posts.length === 0 ? (
        <p className="mt-10 rounded-[18px] border border-dashed border-border-strong p-10 text-center text-sm text-muted-foreground">No posts yet.</p>
      ) : (
        <>
          <article className={`${featuredCard} mt-10 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]`}>
            <BlogCover title={featured.title} category={featured.category} size="lg" link={{ href: featured.href, level: 2 }} className="aspect-[16/10] border-b border-border sm:aspect-[16/9] lg:aspect-auto lg:min-h-[22rem] lg:border-b-0 lg:border-r" />
            <div className="flex flex-col p-6 sm:p-8">
              <p className="text-label text-signal-ink">Latest post</p>
              <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">{featured.description}</p>
              <div className="mt-auto pt-6">
                <Byline post={featured} />
                <span aria-hidden="true" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
                  Read the post
                  <ArrowRight className="size-3.5 transition-transform duration-(--dur-3) group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </article>

          {rest.length > 0 ? (
            <section aria-labelledby="more-posts" className="mt-14">
              <h2 id="more-posts" className="text-label text-muted-foreground">
                More posts
              </h2>
              <ul className="mt-5 grid gap-5 md:grid-cols-2">
                {rest.map((p) => (
                  <li key={p.href}>
                    <article className={card}>
                      <BlogCover title={p.title} category={p.category} link={{ href: p.href, level: 3 }} className="aspect-[16/9] border-b border-border" />
                      <div className="flex flex-1 flex-col p-5 sm:p-6">
                        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
                        <div className="mt-auto pt-5">
                          <Byline post={p} />
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </ArticleShell>
  );
}
