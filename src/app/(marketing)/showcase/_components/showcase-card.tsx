import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ShowcaseItemDto } from "@/lib/services/showcase";

export function BuiltWithBadge() {
  return (
    <Badge variant="accent">
      <span className="sr-only">Badge: </span>Built with Codexa
    </Badge>
  );
}

export function ShowcaseCard({ item }: { item: ShowcaseItemDto }) {
  return (
    <li className="flex h-full flex-col glow-card rounded-2xl border border-border p-5 text-card-foreground">
      <div className="flex items-start justify-between gap-3">
        <Badge variant="primary">{item.project.frameworkName}</Badge>
        <BuiltWithBadge />
      </div>
      <h3 className="mt-3 text-base font-semibold leading-tight">
        <Link href={`/showcase/${item.slug}`} className="hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
          {item.title}
        </Link>
      </h3>
      <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
      {item.tags.length ? (
        <ul className="mt-3 flex flex-wrap gap-1" aria-label="Tags">
          {item.tags.slice(0, 5).map((tag) => (
            <li key={tag}>
              <Badge variant="outline">{tag}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">{item.submittedBy ? `By ${item.submittedBy.name}` : "Community submission"}</p>
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-4 text-sm">
        <Link href={`/showcase/${item.slug}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          Details
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
        {item.liveUrl ? (
          <a href={item.liveUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            Open live site
            <ExternalLink className="size-3.5" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
      </div>
    </li>
  );
}
