import * as React from "react";
import { Inline } from "./inline";
import { cn } from "@/lib/utils";

/**
 * "FINE PRINT" plate: the page's limitations, stated plainly, on a card with a 2px warning rule.
 * Static information (role=note), never a live region.
 */
export function FinePrint({ items, title = "Limitations and requirements", className, children }: { items: string[]; title?: string; className?: string; children?: React.ReactNode }) {
  return (
    <aside role="note" aria-label={title} data-reveal className={cn("relative overflow-hidden rounded-[16px] border border-border bg-card p-6 shadow-[inset_0_1px_0_var(--hairline)] sm:p-7", className)}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[2px] bg-warning" />
      <p className="text-label flex items-center gap-2 text-warning">Fine print</p>
      <h2 className="text-display-4 mt-4">{title}</h2>
      <ul className="mt-5 space-y-3.5">
        {items.map((l, i) => (
          <li key={l} className="flex gap-3 text-[14px] leading-relaxed text-foreground/85">
            <span aria-hidden="true" className="mt-[3px] font-mono text-[11px] tabular-nums text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>
              <Inline text={l} />
            </span>
          </li>
        ))}
      </ul>
      {children}
    </aside>
  );
}
