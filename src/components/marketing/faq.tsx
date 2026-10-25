import { ChevronDown } from "lucide-react";
import type { FAQItem } from "@/content/marketing/types";
import { jsonLd } from "@/lib/seo";
import { Inline } from "./inline";
import { cn } from "@/lib/utils";

/** Accessible accordion built on native <details>/<summary>: keyboard operable, no JS required. */
export function FAQ({ items, className, withJsonLd = false }: { items: FAQItem[]; className?: string; withJsonLd?: boolean }) {
  return (
    <div data-reveal className={cn("glass divide-y divide-border overflow-hidden rounded-2xl border border-border", className)}>
      {withJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd({
            "@type": "FAQPage",
            mainEntity: items.map((it) => ({
              "@type": "Question",
              name: it.question,
              acceptedAnswer: { "@type": "Answer", text: it.answer.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") },
            })),
          })}
        />
      ) : null}
      {items.map((it) => (
        <details key={it.question} className="group px-6 py-5 transition-colors open:bg-muted/40 hover:bg-muted/30">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-medium [&::-webkit-details-marker]:hidden">
            <span>{it.question}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            <Inline text={it.answer} />
          </p>
        </details>
      ))}
    </div>
  );
}
