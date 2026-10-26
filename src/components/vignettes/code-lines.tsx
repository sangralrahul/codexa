import * as React from "react";
import { cn } from "@/lib/utils";
import { tokenize, type CodeLang, type Token, type TokenKind } from "./tokenize";

const COLOR: Record<TokenKind, string> = {
  keyword: "text-syn-keyword",
  string: "text-syn-string",
  fn: "text-syn-fn",
  tag: "text-syn-tag",
  number: "text-syn-number",
  comment: "text-syn-comment italic",
  attr: "text-syn-attr",
  type: "text-syn-type",
  punct: "text-code-fg/60",
  plain: "",
};

/**
 * Highlighted code lines with a gutter (M7). Pass `code` (+ `lang`) or pre-computed `tokens`
 * (from tokenize() on the server). `revealed` shows only the first n lines: each newly
 * revealed line slides in and flashes success. `highlight` tints lines (1-based) as added;
 * `errorLines` tints them danger. `caret` puts the signal caret at the end of the last
 * visible line. Sits on a dark code surface (bg-code-bg) in both themes. Server-safe.
 */
export function CodeLines({
  code,
  tokens,
  lang = "tsx",
  revealed,
  highlight,
  errorLines,
  startLine = 1,
  caret = false,
  gutter = true,
  wrap = false,
  className,
}: {
  code?: string;
  tokens?: Token[][];
  lang?: CodeLang;
  revealed?: number;
  highlight?: number[];
  errorLines?: number[];
  startLine?: number;
  caret?: boolean;
  gutter?: boolean;
  wrap?: boolean;
  className?: string;
  /** Accepted for API symmetry with the other vignettes (CodeLines is driven by `revealed`). */
  playing?: boolean;
}) {
  const lines = tokens ?? tokenize(code ?? "", lang);
  const count = revealed === undefined ? lines.length : Math.max(0, Math.min(lines.length, revealed));
  const animate = revealed !== undefined;
  const width = String(startLine + lines.length - 1).length;
  return (
    <div aria-hidden="true" className={cn("min-w-0 overflow-hidden font-mono text-[12.5px] leading-[1.7] text-code-fg", className)}>
      {lines.slice(0, count).map((line, i) => {
        const n = startLine + i;
        const added = highlight?.includes(n);
        const error = errorLines?.includes(n);
        return (
          <div
            key={i}
            className={cn(
              "flex rounded-[3px]",
              animate && "code-line-in",
              added && "bg-success/[0.09] shadow-[inset_2px_0_0_var(--success)]",
              error && "bg-danger/[0.12] shadow-[inset_2px_0_0_var(--danger)]",
            )}
          >
            {gutter ? (
              <span className="mr-4 shrink-0 select-none pl-2 text-right tabular-nums text-code-muted" style={{ minWidth: `${width + 1.5}ch` }}>
                {n}
              </span>
            ) : null}
            <span className={cn("min-w-0", wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre")}>
              {line.length === 0 ? " " : line.map((t, j) => (t.k === "plain" ? <React.Fragment key={j}>{t.v}</React.Fragment> : <span key={j} className={COLOR[t.k]}>{t.v}</span>))}
              {caret && i === count - 1 ? <span className="caret" /> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
