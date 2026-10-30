import type { FAQItem } from "@/content/marketing/types";
import { jsonLd } from "@/lib/seo";
import { Inline } from "./inline";
import { cn } from "@/lib/utils";

/**
 * Accordion on native <details>/<summary>: keyboard operable without JS, and it opens and
 * closes smoothly where the browser animates ::details-content (globals.css). The plus morphs
 * into a minus and a signal bar marks the open question. Optional FAQPage JSON-LD.
 */
export function FAQ({ items, className, withJsonLd = false }: { items: FAQItem[]; className?: string; withJsonLd?: boolean }) {
  return (
    <div data-reveal className={cn("border-t border-border", className)}>
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
        <details key={it.question} className="group relative border-b border-border">
          <span aria-hidden="true" className="absolute inset-y-3 -left-px w-[2px] origin-top scale-y-0 rounded-full bg-primary transition-transform duration-300 ease-out group-open:scale-y-100" />
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 rounded-md px-4 py-5 text-left text-[15.5px] font-medium tracking-[-0.01em] transition-colors hover:text-foreground sm:text-base [&::-webkit-details-marker]:hidden">
            <span>{it.question}</span>
            <span
              aria-hidden="true"
              className="relative mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-[color,border-color,background-color,rotate] duration-300 ease-snap group-open:rotate-180 group-open:border-primary/40 group-open:bg-primary/10 group-open:text-primary group-hover:border-border-strong group-hover:text-foreground"
            >
              <span className="absolute h-px w-2.5 bg-current" />
              <span className="absolute h-2.5 w-px bg-current transition-transform duration-300 ease-snap group-open:scale-y-0" />
            </span>
          </summary>
          <div className="pb-6 pl-4 pr-14 text-[15px] leading-relaxed text-muted-foreground">
            <p>
              <Inline text={it.answer} />
            </p>
          </div>
        </details>
      ))}
    </div>
  );
}
