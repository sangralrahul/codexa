import type { ReactNode } from "react";
import { Markdown, TableOfContents } from "@/components/content";
import { BlogHero } from "@/components/content/blog-cover";
import { ReadingProgress } from "@/components/marketing/reading-progress";
import type { ContentDoc, ContentSummary, Heading } from "@/lib/content/types";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { ArticleMeta, EditOnGitHub, PrevNext, RelatedLinks } from "./article-bits";
import { DocsSidebar, type SidebarGroup } from "./sidebar";
import { cn } from "@/lib/utils";

/**
 * Three-column article page: optional sidebar (desktop rail + mobile drawer),
 * the article, and an on-page table of contents. Used by docs, guides,
 * tutorials, blog, help, changelog and the hand-written developer pages.
 */
export function ArticleShell({ sidebar, children, className }: { sidebar?: SidebarGroup[]; children: ReactNode; className?: string }) {
  return (
    <div data-tone="docs" className={cn("container-x", className)}>
      <div className={cn("grid gap-8 py-6 lg:gap-12 lg:py-10", sidebar ? "lg:grid-cols-[15.5rem_minmax(0,1fr)]" : "")}>
        {sidebar ? <DocsSidebar groups={sidebar} /> : null}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function ArticleBody({
  crumbs,
  title,
  description,
  headings,
  children,
  meta,
  footer,
  aside,
  kicker,
  blogCover,
}: {
  crumbs: Crumb[];
  title: string;
  description?: string;
  headings: Heading[];
  children: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  aside?: ReactNode;
  /** Small mono label above the title (section or category). */
  kicker?: string;
  /** Blog posts: set the h1 in the post's typographic cover (the area gradient of its index card). */
  blogCover?: { category: string };
}) {
  const hasToc = headings.length >= 2;
  return (
    <div className={cn("grid gap-10", hasToc ? "xl:grid-cols-[minmax(0,1fr)_14rem]" : "")}>
      <ReadingProgress />
      <article className="min-w-0">
        <Breadcrumbs items={crumbs} className="mb-8" />
        {blogCover ? (
          <header>
            <BlogHero title={title} category={blogCover.category} />
            <div className="max-w-3xl">
              {description ? <p className="text-lead mt-6">{description}</p> : null}
              {meta ? <div className="mt-5">{meta}</div> : null}
            </div>
          </header>
        ) : (
          <header className="max-w-3xl">
            {kicker ? <p className="text-label mb-4 text-signal-ink">{kicker}</p> : null}
            <h1 className="text-display-3">{title}</h1>
            {description ? <p className="text-lead mt-4">{description}</p> : null}
            {meta ? <div className="mt-5">{meta}</div> : null}
          </header>
        )}
        {hasToc ? (
          <details className="group mt-8 rounded-xl border border-border bg-card/60 xl:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
              On this page
              <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <ul className="space-y-1 border-t border-border px-4 py-3 text-sm">
              {headings.map((h) => (
                <li key={h.id} className={h.depth === 3 ? "pl-4" : ""}>
                  <a href={`#${h.id}`} className="block py-0.5 text-muted-foreground hover:text-foreground">
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <div className="mt-10 border-t border-border pt-8">{children}</div>
        {footer ? <footer className="mt-14 space-y-10 border-t border-border pt-8">{footer}</footer> : null}
      </article>
      {hasToc ? (
        <aside className="hidden xl:block">
          <div className="scrollbar-thin sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <TableOfContents headings={headings} />
            {aside ? <div className="mt-6 border-t border-border pt-5">{aside}</div> : null}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

/** Full article page for a markdown ContentDoc. */
export function ContentArticle({
  doc,
  crumbs,
  prev,
  next,
  related,
  sidebar,
}: {
  doc: ContentDoc;
  crumbs: Crumb[];
  prev: ContentSummary | null;
  next: ContentSummary | null;
  related: ContentSummary[];
  sidebar?: SidebarGroup[];
}) {
  return (
    <ArticleShell sidebar={sidebar}>
      <ArticleBody
        crumbs={crumbs}
        title={doc.title}
        description={doc.description}
        headings={doc.headings}
        kicker={doc.section === "changelog" && doc.version ? `v${doc.version} · ${doc.category}` : doc.category}
        blogCover={doc.section === "blog" ? { category: doc.category } : undefined}
        meta={<ArticleMeta doc={doc} />}
        aside={<EditOnGitHub sourceId={doc.sourceId} />}
        footer={
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                Last updated <time dateTime={doc.updated ?? doc.date}>{doc.updated ?? doc.date}</time>
              </span>
              <EditOnGitHub sourceId={doc.sourceId} />
            </div>
            <PrevNext prev={prev} next={next} />
            <RelatedLinks items={related} />
          </>
        }
      >
        <Markdown className="max-w-[46rem]">{doc.body}</Markdown>
      </ArticleBody>
    </ArticleShell>
  );
}
