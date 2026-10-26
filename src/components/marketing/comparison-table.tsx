import Link from "next/link";
import { Check, Minus, X } from "lucide-react";
import { Inline } from "./inline";
import { GroupToggle } from "./comparison-toggle";
import { cn } from "@/lib/utils";

export type Cell = string | boolean | null;
export type ComparisonRow = { label: string; values: Cell[]; hint?: string };
export type ComparisonGroup = { heading: string; rows: ComparisonRow[] };
export type ColumnHead = { sub?: string; href?: string; cta?: string };

function CellValue({ v }: { v: Cell }) {
  if (v === true)
    return (
      <span className="inline-flex size-5 items-center justify-center rounded-full bg-success/12 text-success">
        <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
        <span className="sr-only">Yes</span>
      </span>
    );
  if (v === false)
    return (
      <span className="inline-flex items-center text-foreground-dim">
        <X className="size-4" aria-hidden="true" />
        <span className="sr-only">No</span>
      </span>
    );
  if (v === null)
    return (
      <span className="text-foreground-dim">
        <Minus className="size-4" aria-hidden="true" />
        <span className="sr-only">Not applicable</span>
      </span>
    );
  return <Inline text={v} />;
}

/**
 * Comparison table. From md up the header row sticks under the site header (with the optional
 * price and CTA per column); below md the table scrolls sideways with the first column pinned.
 * `highlightColumn` gets 1px signal side rails and a top cap instead of a grey slab. Groups can
 * be collapsed (a small client toggle in each group header).
 */
export function ComparisonTable({
  caption,
  columns,
  groups,
  highlightColumn,
  head,
  collapsible = false,
  className,
}: {
  caption: string;
  columns: string[];
  groups: ComparisonGroup[];
  highlightColumn?: number;
  head?: ColumnHead[];
  collapsible?: boolean;
  className?: string;
}) {
  const hi = (i: number) => i === highlightColumn;
  const rail = "shadow-[inset_1px_0_0_color-mix(in_oklab,var(--signal)_45%,transparent),inset_-1px_0_0_color-mix(in_oklab,var(--signal)_45%,transparent)]";
  return (
    <div className={cn("relative -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:mx-0 md:overflow-visible md:px-0", className)}>
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[13.5px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-[3] w-[28%] border-b border-border bg-background px-4 pb-4 pt-3 text-left align-bottom md:top-[74px] md:z-[4] md:bg-background/90 md:backdrop-blur-md">
              <span className="sr-only">Feature</span>
            </th>
            {columns.map((c, i) => (
              <th
                scope="col"
                key={c}
                className={cn(
                  "border-b border-border bg-background px-4 pb-4 pt-3 text-left align-bottom font-normal md:sticky md:top-[74px] md:z-[2] md:bg-background/90 md:backdrop-blur-md",
                  hi(i) && cn(rail, "rounded-t-[14px] shadow-[inset_1px_0_0_color-mix(in_oklab,var(--signal)_45%,transparent),inset_-1px_0_0_color-mix(in_oklab,var(--signal)_45%,transparent),inset_0_2px_0_var(--signal)]"),
                )}
              >
                <span className={cn("block text-[15px] font-semibold tracking-[-0.01em]", hi(i) && "text-foreground")}>{c}</span>
                {head?.[i]?.sub ? <span className="mt-0.5 block text-[12.5px] tabular-nums text-muted-foreground">{head[i].sub}</span> : null}
                {head?.[i]?.href && head[i].cta ? (
                  <Link href={head[i].href!} className={cn("mt-3 inline-flex h-7 items-center rounded-full px-3 text-[12px] font-medium transition-colors", hi(i) ? "bg-foreground text-background hover:opacity-90" : "border border-border text-foreground hover:border-border-strong")}>
                    {head[i].cta}
                  </Link>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.heading} className="[&[data-collapsed]>tr:not(:first-child)]:hidden">
            <tr>
              <th scope="colgroup" colSpan={columns.length + 1} className="text-label border-b border-border bg-surface/60 px-4 py-3 text-left text-muted-foreground">
                {collapsible ? <GroupToggle label={g.heading} count={g.rows.length} /> : g.heading}
              </th>
            </tr>
            {g.rows.map((r) => (
              <tr key={r.label} className="group">
                <th scope="row" className="sticky left-0 z-[1] border-b border-border bg-background px-4 py-3.5 text-left align-top font-medium transition-colors group-hover:bg-surface md:static">
                  {r.label}
                  {r.hint ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{r.hint}</span> : null}
                </th>
                {r.values.map((v, i) => (
                  <td key={i} className={cn("border-b border-border px-4 py-3.5 align-top text-foreground/85 transition-colors group-hover:bg-surface/70", hi(i) && rail)}>
                    <CellValue v={v} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
