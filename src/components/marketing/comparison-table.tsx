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
  const rail = "shadow-[inset_1px_0_0_color-mix(in_oklab,var(--primary)_45%,transparent),inset_-1px_0_0_color-mix(in_oklab,var(--primary)_45%,transparent)]";
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
              <th scope="col" className="sticky top-[74px] z-[4] w-[28%] border-b border-border bg-background/90 px-4 pb-4 pt-3 text-left align-bottom backdrop-blur-md">
                <span className="sr-only">Feature</span>
              </th>
              {columns.map((c, i) => (
                <th
                  scope="col"
                  key={c}
                  className={cn(
                    "sticky top-[74px] z-[2] border-b border-border bg-background/90 px-4 pb-4 pt-3 text-left align-bottom font-normal backdrop-blur-md",
                    hi(i) && cn(rail, "rounded-t-[14px] shadow-[inset_1px_0_0_color-mix(in_oklab,var(--primary)_45%,transparent),inset_-1px_0_0_color-mix(in_oklab,var(--primary)_45%,transparent),inset_0_2px_0_var(--primary)]"),
                  )}
                >
                  <span className={cn("block text-[15px] font-semibold tracking-[-0.01em]", hi(i) && "text-foreground")}>{c}</span>
                  {head?.[i]?.sub ? <span className="mt-0.5 block text-[12.5px] tabular-nums text-muted-foreground">{head[i].sub}</span> : null}
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
                <th scope="colgroup" colSpan={columns.length + 1} className="text-label border-b border-border bg-surface/60 px-4 py-3 text-left text-muted-foreground">
                  {collapsible ? <GroupToggle label={g.heading} count={g.rows.length} /> : g.heading}
                </th>
              </tr>
              {g.rows.map((r) => (
                <tr key={r.label} className="group">
                  <th scope="row" className="border-b border-border bg-background px-4 py-3.5 text-left align-top font-medium transition-colors group-hover:bg-surface">
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
    </div>
  );
}
