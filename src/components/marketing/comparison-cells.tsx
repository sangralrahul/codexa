import { Check, Minus, X } from "lucide-react";
import { Inline } from "./inline";

/** Shared by the desktop comparison table (server) and its phone form (client). */
export type Cell = string | boolean | null;
export type ComparisonRow = { label: string; values: Cell[]; hint?: string };
export type ComparisonGroup = { heading: string; rows: ComparisonRow[] };
export type ColumnHead = { sub?: string; href?: string; cta?: string };

export function CellValue({ v }: { v: Cell }) {
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
