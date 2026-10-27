"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowRight } from "lucide-react";
import { GlideIndicator, useGlide } from "@/components/motion/glide";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CellValue, type ColumnHead, type ComparisonGroup } from "./comparison-cells";

/**
 * Phone form of the comparison table (below md): one column at a time. A radiogroup of column
 * names (arrow keys, Home/End, a gliding pill) sits above that column's header card and a
 * label → value list per group, so nothing is clipped and nothing scrolls sideways. Groups are
 * native <details> when the table is collapsible. The desktop table renders the same data.
 */
export function ComparisonMobile({
  caption,
  columnNoun,
  columns,
  groups,
  highlightColumn,
  head,
  collapsible = false,
}: {
  caption: string;
  columnNoun: string;
  columns: string[];
  groups: ComparisonGroup[];
  highlightColumn?: number;
  head?: ColumnHead[];
  collapsible?: boolean;
}) {
  const [col, setCol] = React.useState(highlightColumn ?? 0);
  const id = React.useId();
  const box = React.useRef<HTMLDivElement>(null);
  const glide = useGlide(box, { selector: '[role="radio"][aria-checked="true"]', axis: "both" });

  const onKey = (e: React.KeyboardEvent) => {
    const last = columns.length - 1;
    const step: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next: number | null = null;
    if (e.key in step) next = (col + step[e.key] + columns.length) % columns.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    setCol(next);
    const target = next;
    requestAnimationFrame(() => box.current?.querySelector<HTMLElement>(`[data-col="${target}"]`)?.focus());
  };

  const h = head?.[col];
  const hi = col === highlightColumn;

  return (
    <div>
      <p id={`${id}-label`} className="text-label text-muted-foreground">
        Choose a {columnNoun}
        <span className="sr-only">: {caption}</span>
      </p>
      <div
        ref={box}
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        onKeyDown={onKey}
        className="relative isolate mt-3 flex flex-wrap gap-1 rounded-[14px] bg-muted p-1 shadow-[inset_0_0_0_1px_var(--border)]"
      >
        <GlideIndicator ref={glide} className="rounded-[10px]" />
        {columns.map((c, i) => {
          const checked = i === col;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              data-col={i}
              data-no-ripple
              onClick={() => setCol(i)}
              className={cn(
                "relative z-[1] inline-flex h-9 flex-1 basis-auto items-center justify-center whitespace-nowrap rounded-[10px] px-3 text-[13.5px] font-medium transition-colors duration-200",
                checked ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* Re-keyed on change so the column swaps in (stage-swap; calm shows the final frame). */}
      <div key={col} className="stage-swap mt-5">
        <div
          className={cn(
            "rounded-[16px] border bg-card p-4 shadow-[inset_0_1px_0_var(--hairline)]",
            hi ? "border-signal/45 shadow-[inset_0_2px_0_var(--signal),inset_0_1px_0_var(--hairline)]" : "border-border",
          )}
        >
          <p className="text-[17px] font-semibold tracking-[-0.01em]">{columns[col]}</p>
          {h?.sub ? <p className="mt-0.5 text-[13px] text-muted-foreground">{h.sub}</p> : null}
          {h?.href && h.cta ? (
            <Link href={h.href} className={buttonClasses(hi ? "secondary" : "outline", "md", "mt-4 w-full")}>
              {h.cta}
              {hi ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
            </Link>
          ) : null}
        </div>

        <div className="mt-6 space-y-6">
          {groups.map((g) => {
            const rows = (
              <dl className="border-t border-border">
                {g.rows.map((r) => (
                  <div key={r.label} className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-start gap-4 border-b border-border py-3 text-[14px]">
                    <dt className="font-medium">
                      {r.label}
                      {r.hint ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{r.hint}</span> : null}
                    </dt>
                    <dd className="flex justify-end text-right text-foreground/85">
                      <CellValue v={r.values[col] ?? null} />
                    </dd>
                  </div>
                ))}
              </dl>
            );
            return collapsible ? (
              <details key={g.heading} open className="group">
                <summary className="text-label flex cursor-pointer list-none items-center justify-between gap-3 py-2 text-muted-foreground [&::-webkit-details-marker]:hidden">
                  {g.heading}
                  <span aria-hidden="true" className="relative inline-flex size-4 items-center justify-center">
                    <span className="absolute h-px w-2.5 bg-current" />
                    <span className="absolute h-2.5 w-px bg-current transition-transform duration-300 ease-snap group-open:scale-y-0" />
                  </span>
                </summary>
                {rows}
              </details>
            ) : (
              <section key={g.heading} aria-label={g.heading}>
                <p className="text-label py-2 text-muted-foreground">{g.heading}</p>
                {rows}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
