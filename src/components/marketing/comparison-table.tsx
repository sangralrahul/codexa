import { Check, Minus, X } from "lucide-react";
import { Inline } from "./inline";
import { cn } from "@/lib/utils";

export type Cell = string | boolean | null;
export type ComparisonRow = { label: string; values: Cell[]; hint?: string };
export type ComparisonGroup = { heading: string; rows: ComparisonRow[] };

function CellValue({ v }: { v: Cell }) {
  if (v === true)
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <Check className="size-4" aria-hidden="true" />
        <span className="sr-only">Yes</span>
      </span>
    );
  if (v === false)
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <X className="size-4" aria-hidden="true" />
        <span className="sr-only">No</span>
      </span>
    );
  if (v === null)
    return (
      <span className="text-muted-foreground">
        <Minus className="size-4" aria-hidden="true" />
        <span className="sr-only">Not applicable</span>
      </span>
    );
  return <Inline text={v} />;
}

export function ComparisonTable({
  caption,
  columns,
  groups,
  highlightColumn,
  className,
}: {
  caption: string;
  columns: string[];
  groups: ComparisonGroup[];
  highlightColumn?: number;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-x-auto rounded-xl border border-border", className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-muted">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-semibold">
              <span className="sr-only">Feature</span>
            </th>
            {columns.map((c, i) => (
              <th scope="col" key={c} className={cn("px-4 py-3 text-left font-semibold", i === highlightColumn && "text-primary")}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.heading}>
            <tr className="border-t border-border bg-surface">
              <th scope="colgroup" colSpan={columns.length + 1} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {g.heading}
              </th>
            </tr>
            {g.rows.map((r) => (
              <tr key={r.label} className="border-t border-border">
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  {r.label}
                  {r.hint ? <span className="block text-xs font-normal text-muted-foreground">{r.hint}</span> : null}
                </th>
                {r.values.map((v, i) => (
                  <td key={i} className={cn("px-4 py-3 align-top text-foreground/90", i === highlightColumn && "bg-primary/5")}>
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
