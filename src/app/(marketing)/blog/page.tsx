import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { routeMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { formatDate, listDocs } from "@/lib/content";
import type { ContentSummary } from "@/lib/content/types";
import { LEARN_SIDEBAR } from "@/lib/content/nav";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { HubHeader } from "@/components/docs/hub-header";
import { NewsletterForm } from "@/components/docs/newsletter-form";
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

/** The other Learn sections, for wayfinding now that the blog is a full-width editorial page. */
const LEARN_LINKS = (LEARN_SIDEBAR[0]?.items ?? []).filter((i) => i.href !== "/blog");

/**
 * Blog index: a full-width editorial page (no docs rail). The latest post leads as a wide cover,
 * the rest follow in a three-column grid, and the page ends with the newsletter signup.
 */
export default async function BlogPage() {
  const posts = await listDocs("blog");
  const [featured, ...rest] = posts;
  return (
    <div data-tone="docs" className="container-x pb-20 pt-6 sm:pt-8 lg:pt-10">
      <Breadcrumbs items={[{ name: "Learn", path: "/learn" }, { name: "Blog", path: "/blog" }]} className="mb-8" />
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <HubHeader kicker="Blog" title="Notes from" dim="the build." lead="Engineering notes and product updates from the team building Codexa. Every post describes the product as it ships." />
        {LEARN_LINKS.length ? (
          <nav aria-label="More from Learn" className="lg:pb-2">
            <p className="text-label mb-2.5 text-foreground-dim">More from Learn</p>
            <ul className="flex flex-wrap gap-2">
              {LEARN_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex h-8 items-center rounded-full border border-border bg-card/60 px-3 text-[13px] text-muted-foreground transition-colors duration-(--dur-2) hover:border-border-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {l.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>

      {posts.length === 0 ? (
        <p className="mt-10 rounded-[18px] border border-dashed border-border-strong p-10 text-center text-sm text-muted-foreground">No posts yet.</p>
      ) : (
        <>
          <article className={`${featuredCard} mt-12 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]`}>
            <BlogCover title={featured.title} category={featured.category} size="lg" link={{ href: featured.href, level: 2 }} className="aspect-[16/10] border-b border-border sm:aspect-[16/9] lg:aspect-auto lg:min-h-[26rem] lg:border-b-0 lg:border-r" />
            <div className="flex flex-col p-6 sm:p-8 lg:p-10">
              <p className="text-label text-signal-ink">Latest post</p>
              <p className="mt-4 text-pretty text-[16px] leading-relaxed text-muted-foreground lg:text-[17px]">{featured.description}</p>
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
              <ul className={cn("mt-5 grid gap-5 md:grid-cols-2", rest.length >= 3 && "lg:grid-cols-3")}>
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

      <section aria-labelledby="blog-subscribe" className="mt-20 grid gap-6 rounded-[22px] border border-border bg-surface/60 p-6 sm:p-8 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 id="blog-subscribe" className="text-display-4">
            Get new posts by email
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground">Subscribe to the newsletter to hear when a new post or release lands. Product updates only.</p>
        </div>
        <NewsletterForm source="blog" />
      </section>
    </div>
  );
}
