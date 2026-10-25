import type { ReactNode } from "react";
import { Markdown, TableOfContents } from "@/components/content";
import type { ContentDoc, ContentSummary, Heading } from "@/lib/content/types";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { ArticleMeta, EditOnGitHub, PrevNext, RelatedLinks } from "./article-bits";
import { DocsSidebar, type SidebarGroup } from "./sidebar";
import { cn } from "@/lib/utils";
import { PageTitle } from "@/components/marketing/backdrop";

/**
 * Three-column article page: optional sidebar (desktop rail + mobile drawer),
 * the article, and an on-page table of contents. Used by docs, guides,
 * tutorials, blog, help, changelog and the hand-written developer pages.
 */
export function ArticleShell({ sidebar, children, className }: { sidebar?: SidebarGroup[]; children: ReactNode; className?: string }) {
  return (
    <div className={cn("container-x", className)}>
      <div className={cn("grid gap-8 py-6 lg:py-10", sidebar ? "lg:grid-cols-[15rem_minmax(0,1fr)]" : "")}>
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
}: {
  crumbs: Crumb[];
  title: string;
  description?: string;
  headings: Heading[];
  children: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  aside?: ReactNode;
}) {
  const hasToc = headings.length >= 2;
  return (
    <div className={cn("grid gap-10", hasToc ? "xl:grid-cols-[minmax(0,1fr)_13rem]" : "")}>
      <article className="min-w-0">
        <Breadcrumbs items={crumbs} className="mb-4" />
        <header className="max-w-3xl">
          <PageTitle>{title}</PageTitle>
          {description ? <p className="mt-3 text-base text-muted-foreground sm:text-lg">{description}</p> : null}
          {meta ? <div className="mt-4">{meta}</div> : null}
        </header>
        {hasToc ? (
          <details className="mt-6 rounded-lg border border-border p-3 xl:hidden">
            <summary className="cursor-pointer text-sm font-medium">On this page</summary>
            <ul className="mt-2 space-y-1 text-sm">
              {headings.map((h) => (
                <li key={h.id} className={h.depth === 3 ? "pl-4" : ""}>
                  <a href={`#${h.id}`} className="text-muted-foreground hover:text-foreground">
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <div className="mt-8">{children}</div>
        {footer ? <footer className="mt-12 space-y-10 border-t border-border pt-8">{footer}</footer> : null}
      </article>
      {hasToc ? (
        <aside className="hidden xl:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin">
            <TableOfContents headings={headings} />
            {aside ? <div className="mt-6">{aside}</div> : null}
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
        <Markdown>{doc.body}</Markdown>
      </ArticleBody>
    </ArticleShell>
  );
}
