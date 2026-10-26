"use client";

import * as React from "react";
import { RotateCcw, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { useCalm } from "@/lib/client/motion";
import { tokenize, type Token } from "./tokenize";

type DiffLine = { kind: "ctx" | "add" | "del"; code: string };

const DEFAULT_FILE = "src/lib/totals.ts";
const DEFAULT_LINES: DiffLine[] = [
  { kind: "ctx", code: "export function total(items: Item[]) {" },
  { kind: "del", code: "  return sum(items);" },
  { kind: "add", code: "  const subtotal = sum(items);" },
  { kind: "add", code: "  return subtotal * (1 + GST_RATE);" },
  { kind: "ctx", code: "}" },
];

function Code({ tokens }: { tokens: Token[] }) {
  const color: Record<string, string> = { keyword: "text-syn-keyword", fn: "text-syn-fn", type: "text-syn-type", number: "text-syn-number", string: "text-syn-string", punct: "text-code-fg/60" };
  return (
    <>
      {tokens.map((t, i) => (
        <span key={i} className={color[t.k]}>
          {t.v}
        </span>
      ))}
    </>
  );
}

/**
 * "Undo anything" (M9): a per-file diff from an AI run. "Restore snapshot" collapses the
 * added lines and brings the removed one back, with a light sweep; "Re-apply" reverses it.
 * Interactive and honest: a toast says "Restored · illustrative". Sample code.
 */
export function DiffRestore({ className, file = DEFAULT_FILE, lines = DEFAULT_LINES }: { playing?: boolean; className?: string; file?: string; lines?: DiffLine[] }) {
  const [restored, setRestored] = React.useState(false);
  const [sweep, setSweep] = React.useState(0);
  const calm = useCalm();
  const tokens = React.useMemo(() => lines.map((l) => tokenize(l.code, "ts")[0] ?? []), [lines]);
  const added = lines.filter((l) => l.kind === "add").length;
  const removed = lines.filter((l) => l.kind === "del").length;

  const toggle = () => {
    const next = !restored;
    setRestored(next);
    setSweep((n) => n + 1);
    toast.info(next ? "Restored · illustrative" : "Re-applied · illustrative", "In a real project this restores the snapshot taken before the AI run.");
  };

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-3 [contain:inline-size]", className)}>
      <div aria-hidden="true" className="overflow-hidden rounded-xl border border-code-border bg-code-bg shadow-sm">
        <div className="flex items-center gap-2 border-b border-code-border px-3 py-2 font-mono text-[11.5px] text-code-muted">
          <span className="truncate text-code-fg/85">{file}</span>
          <span className="ml-auto shrink-0 tabular-nums">
            {restored ? (
              <span className="text-code-muted">snapshot</span>
            ) : (
              <>
                <span className="text-syn-string">+{added}</span> <span className="text-syn-tag">−{removed}</span>
              </>
            )}
          </span>
        </div>
        <div key={sweep} className={cn("relative py-1.5 font-mono text-[12px] leading-[1.75] text-code-fg", sweep > 0 && !calm && "diff-sweep")}>
          {lines.map((l, i) => {
            const collapsed = restored ? l.kind === "add" : false;
            const asContext = restored && l.kind === "del";
            const tone = asContext || l.kind === "ctx" ? "" : l.kind === "add" ? "bg-success/[0.12]" : "bg-danger/[0.12]";
            const mark = asContext || l.kind === "ctx" ? " " : l.kind === "add" ? "+" : "−";
            return (
              <div key={i} className="diff-row" data-collapsed={collapsed ? "" : undefined}>
                <div className={cn("flex whitespace-pre px-3 transition-colors duration-300", tone)}>
                  <span className={cn("w-4 shrink-0 select-none", l.kind === "add" ? "text-syn-string" : l.kind === "del" ? "text-syn-tag" : "text-code-muted")}>{mark}</span>
                  <span className={cn("min-w-0 truncate", l.kind === "del" && !asContext && "opacity-75")}>
                    <Code tokens={tokens[i]} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={restored}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border-strong bg-background/70 px-3 text-xs font-medium text-foreground shadow-[inset_0_1px_0_var(--hairline)] transition-[border-color,background-color] hover:border-foreground/30 hover:bg-muted"
        >
          {restored ? <RotateCw className="size-3.5" aria-hidden="true" /> : <RotateCcw className="size-3.5" aria-hidden="true" />}
          {restored ? "Re-apply" : "Restore snapshot"}
        </button>
        <span className="text-[11px] text-muted-foreground">Sample code</span>
      </div>
    </div>
  );
}
