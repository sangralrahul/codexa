import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, ExternalLink } from "lucide-react";
import { site } from "@/config/site";
import { formatDate } from "@/lib/content";
import type { ContentSummary } from "@/lib/content/types";
import { cn } from "@/lib/utils";
import { DocIcon } from "./doc-icons";

/** Byline row: author · updated date · reading time (articles only; index cards omit reading time). */
export function ArticleMeta({ doc, className }: { doc: ContentSummary; className?: string }) {
  const updated = doc.updated ?? doc.date;
  const parts = [doc.author, `Updated ${formatDate(updated)}`, doc.readingTime.text, doc.difficulty ? doc.difficulty[0].toUpperCase() + doc.difficulty.slice(1) : null, doc.duration ?? null].filter(Boolean);
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[12px] text-muted-foreground", className)}>
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-2.5">
          {i > 0 ? (
            <span aria-hidden="true" className="text-foreground-dim">
              ·
            </span>
          ) : null}
          {i === 1 ? <time dateTime={updated}>{p}</time> : p}
        </span>
      ))}
    </p>
  );
}

export function EditOnGitHub({ sourceId, className }: { sourceId: string; className?: string }) {
  const href = `${site.social.github}/blob/main/content/${sourceId}`;
  return (
    <a href={href} rel="noopener noreferrer" target="_blank" className={cn("inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground", className)}>
      Edit this page on GitHub
      <ExternalLink className="size-3.5" aria-hidden="true" />
    </a>
  );
}

export function PrevNext({ prev, next, className }: { prev: ContentSummary | null; next: ContentSummary | null; className?: string }) {
  if (!prev && !next) return null;
  const card = "group e1 flex flex-col gap-1 rounded-[16px] p-4 transition-[border-color,box-shadow,translate] duration-(--dur-3) hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg calm:hover:translate-y-0";
  return (
    <nav aria-label="Pagination" className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {prev ? (
        <Link href={prev.href} rel="prev" className={card}>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft className="size-3.5 transition-transform duration-(--dur-3) group-hover:-translate-x-0.5" aria-hidden="true" /> Previous
          </span>
          <span className="font-medium">{prev.title}</span>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
      {next ? (
        <Link href={next.href} rel="next" className={cn(card, "items-end text-right")}>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            Next <ArrowRight className="size-3.5 transition-transform duration-(--dur-3) group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
          <span className="font-medium">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}

export function RelatedLinks({ items, className, title = "Related" }: { items: ContentSummary[]; className?: string; title?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className={className}>
      <h2 id="related-heading" className="text-label text-muted-foreground">
        {title}
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="group flex h-full gap-3 rounded-[14px] border border-border p-4 transition-colors duration-(--dur-2) hover:border-border-strong hover:bg-surface">
              <DocIcon href={it.href} category={it.category} size="sm" />
              <span className="min-w-0">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-foreground-dim">{it.section}</span>
                <span className="mt-0.5 block font-medium">{it.title}</span>
                <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{it.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Card for article indexes (guides, tutorials, learn). No reading time on index cards (PLAN §5.4). */
export function ArticleCard({ doc, showSection = false }: { doc: ContentSummary; showSection?: boolean }) {
  return (
    <article data-spotlight-tile className="group relative flex h-full flex-col rounded-[18px] border border-border bg-card p-5 shadow-[inset_0_1px_0_var(--hairline)] transition-[border-color,box-shadow,translate] duration-(--dur-3) hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg calm:hover:translate-y-0">
      <div className="flex items-center justify-between gap-3">
        <DocIcon href={doc.href} category={doc.category} />
        <ArrowUpRight className="size-4 text-muted-foreground transition-[translate,color] duration-(--dur-3) group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
      </div>
      <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-foreground-dim">
        {showSection ? `${doc.section} · ` : ""}
        {doc.category}
      </p>
      <h3 className="mt-1.5 text-[16px] font-semibold leading-snug tracking-[-0.01em]">
        <Link href={doc.href} className="outline-none after:absolute after:inset-0 after:rounded-[18px] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring">
          {doc.title}
        </Link>
      </h3>
      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{doc.description}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-meta text-muted-foreground">
        <time dateTime={doc.date}>{formatDate(doc.date)}</time>
        {doc.difficulty ? <span className="rounded-full border border-border px-2 py-px capitalize">{doc.difficulty}</span> : null}
        {doc.duration ? <span>{doc.duration}</span> : null}
      </div>
    </article>
  );
}

export function ArticleGrid({ docs, showSection = false, emptyMessage = "Nothing here yet." }: { docs: ContentSummary[]; showSection?: boolean; emptyMessage?: string }) {
  if (docs.length === 0) return <p className="rounded-[18px] border border-dashed border-border-strong p-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  return (
    <ul data-spotlight="grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {docs.map((d) => (
        <li key={d.href} className="relative">
          <ArticleCard doc={d} showSection={showSection} />
        </li>
      ))}
    </ul>
  );
}
