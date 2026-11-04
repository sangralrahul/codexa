import { Spinner } from "@/components/ui/misc";

/** While Monaco loads: a gutter and code-shaped lines (decorative), with one announced status line. */
export const EditorLoading = () => (
  // The library centres its loading node in a flex box: stretch to fill it instead.
  <div className="relative size-full self-stretch overflow-hidden" role="status">
    <div className="flex gap-4 px-3 pt-3" aria-hidden="true">
      <div className="w-6 space-y-[11px] pt-px text-right">
        {LOADING_LINES.map((_, i) => (
          <div key={i} className="ml-auto h-[9px] w-3 rounded-sm bg-muted" />
        ))}
      </div>
      <div className="min-w-0 flex-1 space-y-[11px] pt-px">
        {LOADING_LINES.map(([indent, width], i) => (
          <div key={i} className="h-[9px] animate-pulse rounded-sm bg-muted calm:animate-none" style={{ marginLeft: indent * 16, width: `${width}%` }} />
        ))}
      </div>
    </div>
    <p className="absolute bottom-3 right-3 flex items-center gap-2 whitespace-nowrap rounded-md bg-card px-2 py-1 text-[11.5px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">
      <Spinner className="size-3" /> Loading editor…
    </p>
  </div>
);
/** [indent, width%] for the loading placeholder lines. */
const LOADING_LINES: [number, number][] = [
  [0, 38], [0, 46], [0, 0], [0, 30], [1, 52], [1, 44], [2, 60], [2, 34], [1, 20], [0, 8], [0, 0], [0, 42], [1, 56], [1, 28],
];
