import { ArrowUpRight, ExternalLink, GitFork } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BlogCover } from "@/components/content/blog-cover";
import { FRAMEWORK_SHORT } from "@/components/templates/gallery-search";
import type { ShowcaseItemDto } from "@/lib/services/showcase";
import { RemixButton } from "./remix-button";

/** "Remixed 12 times" (null when nobody has remixed the entry yet). */
export function remixCountLabel(count: number) {
  if (count <= 0) return null;
  return count === 1 ? "Remixed once" : `Remixed ${count.toLocaleString("en-US")} times`;
}

export function BuiltWithBadge() {
  return (
    <Badge variant="accent">
      <span className="sr-only">Badge: </span>Built with Codexa
    </Badge>
  );
}

/**
 * Showcase entry card. Community projects have no captured screenshot, so the cover is typographic
 * (the entry's own title over the framework's tone, pure CSS) — nothing on it is invented. The
 * title is the card's stretched link; the live-site link sits above it.
 */
export function ShowcaseCard({ item, signedIn }: { item: ShowcaseItemDto; signedIn: boolean }) {
  const remixed = remixCountLabel(item.remixCount);
  return (
    <li
      data-spotlight-tile
      className="group relative flex h-full flex-col overflow-hidden rounded-[20px] border border-border bg-card shadow-[inset_0_1px_0_var(--hairline)] transition-[border-color,box-shadow,translate] duration-(--dur-3) hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg calm:hover:translate-y-0"
    >
      <BlogCover title={item.title} category={FRAMEWORK_SHORT[item.project.framework] ?? item.project.frameworkName} label="Showcase" link={{ href: `/showcase/${item.slug}`, level: 3 }} className="aspect-[16/9] border-b border-border" />
      <div className="flex flex-1 flex-col p-5">
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        {item.tags.length ? (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
            {item.tags.slice(0, 5).map((tag) => (
              <li key={tag} className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11.5px] text-muted-foreground">
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
          <p className="text-meta text-muted-foreground">
            {item.submittedBy ? `By ${item.submittedBy.name}` : "Community submission"}
            {remixed ? (
              <span className="mt-0.5 flex items-center gap-1">
                <GitFork className="size-3" aria-hidden="true" />
                {remixed}
              </span>
            ) : null}
          </p>
          <div className="flex items-center gap-3">
            {item.remixable ? <RemixButton slug={item.slug} title={item.title} signedIn={signedIn} variant="outline" size="sm" /> : null}
            {item.liveUrl ? (
              <a
                href={item.liveUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="relative z-[3] inline-flex items-center gap-1 rounded-md text-[13px] font-medium text-foreground transition-colors hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Live site
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <ArrowUpRight className="size-4 text-muted-foreground transition-[translate,color] duration-(--dur-3) group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
