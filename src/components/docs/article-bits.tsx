import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink, Clock, CalendarDays } from "lucide-react";
import { site } from "@/config/site";
import { formatDate } from "@/lib/content";
import type { ContentSummary } from "@/lib/content/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ArticleMeta({ doc, className }: { doc: ContentSummary; className?: string }) {
  const updated = doc.updated ?? doc.date;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground", className)}>
      <span>By {doc.author}</span>
      <span className="inline-flex items-center gap-1">
        <CalendarDays className="size-3.5" aria-hidden="true" />
        <time dateTime={updated}>Updated {formatDate(updated)}</time>
      </span>
      <span className="inline-flex items-center gap-1">
        <Clock className="size-3.5" aria-hidden="true" />
        {doc.readingTime.text}
      </span>
      {doc.difficulty ? <Badge variant="outline" className="capitalize">{doc.difficulty}</Badge> : null}
      {doc.duration ? <span>{doc.duration}</span> : null}
    </div>
  );
}

export function EditOnGitHub({ sourceId, className }: { sourceId: string; className?: string }) {
  const href = `${site.social.github}/blob/main/content/${sourceId}`;
  return (
    <a href={href} rel="noopener noreferrer" target="_blank" className={cn("inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground", className)}>
      Edit this page on GitHub
      <ExternalLink className="size-3.5" aria-hidden="true" />
    </a>
  );
}

export function PrevNext({ prev, next, className }: { prev: ContentSummary | null; next: ContentSummary | null; className?: string }) {
  if (!prev && !next) return null;
  return (
    <nav aria-label="Pagination" className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {prev ? (
        <Link href={prev.href} rel="prev" className="group rounded-lg border border-border p-4 transition hover:border-border-strong hover:bg-muted/40">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Previous
          </span>
          <span className="mt-1 block font-medium group-hover:text-primary">{prev.title}</span>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
      {next ? (
        <Link href={next.href} rel="next" className="group rounded-lg border border-border p-4 text-right transition hover:border-border-strong hover:bg-muted/40">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            Next <ArrowRight className="size-3.5" aria-hidden="true" />
          </span>
          <span className="mt-1 block font-medium group-hover:text-primary">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}

export function RelatedLinks({ items, className, title = "Related" }: { items: ContentSummary[]; className?: string; title?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className={className}>
      <h2 id="related-heading" className="text-base font-semibold">
        {title}
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="block h-full rounded-lg border border-border p-4 transition hover:border-border-strong hover:bg-muted/40">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{it.section}</span>
              <span className="mt-1 block font-medium">{it.title}</span>
              <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{it.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ArticleCard({ doc, showSection = false }: { doc: ContentSummary; showSection?: boolean }) {
  return (
    <Card className="flex h-full flex-col transition hover:border-border-strong">
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {showSection ? <Badge variant="outline">{doc.section}</Badge> : null}
          <span>{doc.category}</span>
          <span aria-hidden="true">·</span>
          <span>{doc.readingTime.text}</span>
        </div>
        <h3 className="mt-2 text-base font-semibold leading-snug">
          <Link href={doc.href} className="after:absolute after:inset-0 hover:text-primary">
            {doc.title}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">{doc.description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-xs text-muted-foreground">
          <time dateTime={doc.date}>{formatDate(doc.date)}</time>
          {doc.difficulty ? <Badge variant="outline" className="capitalize">{doc.difficulty}</Badge> : null}
          {doc.duration ? <span>{doc.duration}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function ArticleGrid({ docs, showSection = false, emptyMessage = "Nothing here yet." }: { docs: ContentSummary[]; showSection?: boolean; emptyMessage?: string }) {
  if (docs.length === 0) return <p className="rounded-lg border border-dashed border-border-strong p-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {docs.map((d) => (
        <li key={d.href} className="relative">
          <ArticleCard doc={d} showSection={showSection} />
        </li>
      ))}
    </ul>
  );
}
