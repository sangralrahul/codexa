import Link from "next/link";
import { GroupToggle } from "./comparison-toggle";
import { ComparisonMobile } from "./comparison-mobile";
import { CellValue, type ColumnHead, type ComparisonGroup } from "./comparison-cells";
import { cn } from "@/lib/utils";

export type { Cell, ColumnHead, ComparisonGroup, ComparisonRow } from "./comparison-cells";

/**
 * Comparison table. From md up the header row sticks under the site header (with the optional
 * price and CTA per column). Below md a phone form shows one column at a time with a switcher
 * (ComparisonMobile), so no column is ever clipped. `highlightColumn` gets 1px signal side rails
 * and a top cap instead of a grey slab. Groups can be collapsed (a small client toggle in each
 * group header; native <details> on phones). `columnNoun` names a column in the phone switcher.
 */
export function ComparisonTable({
  caption,
  columns,
  groups,
  highlightColumn,
  head,
  collapsible = false,
  columnNoun = "column",
  className,
}: {
  caption: string;
  columns: string[];
  groups: ComparisonGroup[];
  highlightColumn?: number;
  head?: ColumnHead[];
  collapsible?: boolean;
  columnNoun?: string;
  className?: string;
}) {
  const hi = (i: number) => i === highlightColumn;
  // The highlighted plan sits on the panel tone, capped with a 2px ink rule (the plan cells' treatment).
  const rail = "bg-(--pg-panel)";
  return (
    <div className={className}>
      <div className="md:hidden">
        <ComparisonMobile caption={caption} columnNoun={columnNoun} columns={columns} groups={groups} highlightColumn={highlightColumn} head={head} collapsible={collapsible} />
      </div>
      <div className="relative hidden md:block">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[13.5px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky top-[64px] z-[4] w-[28%] border-b border-border bg-background/90 pb-4 pl-(--g-pad,1rem) pr-4 pt-4 text-left align-bottom backdrop-blur-md">
                <span className="sr-only">Feature</span>
              </th>
              {columns.map((c, i) => (
                <th
                  scope="col"
                  key={c}
                  className={cn(
                    "sticky top-[64px] z-[2] border-b border-l border-border bg-background/90 px-4 pb-4 pt-4 text-left align-bottom font-normal backdrop-blur-md",
                    hi(i) && "bg-[color-mix(in_oklab,var(--pg-panel)_92%,transparent)] shadow-[inset_0_2px_0_var(--foreground)]",
                  )}
                >
                  <span className={cn("block font-mono text-[12px] uppercase tracking-[0.06em]", hi(i) ? "text-foreground" : "text-muted-foreground")}>{c}</span>
                  {head?.[i]?.sub ? <span className="mt-1.5 block text-[15px] font-semibold tracking-[-0.02em] text-foreground">{head[i].sub}</span> : null}
                  {head?.[i]?.href && head[i].cta ? (
                    <Link href={head[i].href!} className={cn("mt-3 inline-flex h-7 items-center whitespace-nowrap rounded-full px-3 text-[12px] font-medium transition-colors", hi(i) ? "bg-foreground text-background hover:opacity-90" : "border border-border text-foreground hover:border-border-strong")}>
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
                <th scope="colgroup" colSpan={columns.length + 1} className="border-b border-border bg-(--pg-panel,var(--surface)) py-3 pl-(--g-pad,1rem) pr-4 text-left font-mono text-[11.5px] font-normal uppercase tracking-[0.06em] text-(--g-dim)">
                  {collapsible ? <GroupToggle label={g.heading} count={g.rows.length} /> : g.heading}
                </th>
              </tr>
              {g.rows.map((r) => (
                <tr key={r.label} className="group">
                  <th scope="row" className="border-b border-border bg-background py-3.5 pl-(--g-pad,1rem) pr-4 text-left align-top font-medium transition-colors group-hover:bg-(--pg-panel)">
                    {r.label}
                    {r.hint ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{r.hint}</span> : null}
                  </th>
                  {r.values.map((v, i) => (
                    <td key={i} className={cn("border-b border-l border-border px-4 py-3.5 align-top text-foreground/85 transition-colors group-hover:bg-(--pg-panel)", hi(i) && rail)}>
                      <CellValue v={v} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
