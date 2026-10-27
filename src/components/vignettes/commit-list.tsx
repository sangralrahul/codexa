"use client";

import { Check, GitBranch, GitCommitHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScript } from "./use-script";

export type Commit = { hash: string; message: string; added: number; removed: number; when: string };

const DEFAULT_COMMITS: Commit[] = [
  { hash: "a1f9c3e", message: "Add invoices table and GST totals", added: 12, removed: 3, when: "just now" },
  { hash: "7c2d0b4", message: "Add paid / unpaid filter", added: 24, removed: 6, when: "1h ago" },
  { hash: "e93b1a7", message: "Start from the dashboard template", added: 310, removed: 0, when: "2d ago" },
];

/**
 * Real code, in your repo: a commit list where the newest commit materialises with
 * "Pushed to GitHub" (M10). Sample hashes and messages. GitHub sync needs OAuth configured
 * by the operator — say so next to it. Final frame on the server and when calm. Decorative.
 */
export function CommitList({ playing, className, commits = DEFAULT_COMMITS, branch = "main" }: { playing?: boolean; className?: string; commits?: Commit[]; branch?: string }) {
  const { ref, index, started, calm } = useScript([0, 900, 1900], 2400, playing);
  const showNewest = !started || index >= 1;
  const pushed = !started || index >= 2;
  const list = showNewest ? commits : commits.slice(1);
  return (
    <div ref={ref} aria-hidden="true" className={cn("flex w-full min-w-0 flex-col gap-2 text-[13px] [contain:inline-size]", className)}>
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/70 px-2 py-0.5 font-mono text-[11px] text-foreground">
          <GitBranch className="size-3" /> {branch}
        </span>
        <span>{commits.length} commits</span>
        {pushed ? (
          <span className={cn("ml-auto inline-flex items-center gap-1 text-[11.5px] font-medium text-success", started && !calm && "pop-in")}>
            <Check className="size-3.5" /> Pushed to GitHub
          </span>
        ) : null}
      </div>
      <div className="relative">
        <span className="absolute bottom-3 left-[13px] top-3 w-px bg-border" />
        <ol className="relative space-y-1">
          {list.map((c, i) => {
            const fresh = started && !calm && i === 0 && showNewest && c === commits[0];
            const rowClass = cn("relative flex items-center gap-2.5 rounded-[10px] px-1.5 py-1.5", i === 0 && showNewest && "bg-foreground/[0.04] shadow-[inset_0_0_0_1px_var(--border)]");
            const cells = (
              <>
                <span className={cn("relative z-[1] flex size-[22px] shrink-0 items-center justify-center rounded-full border bg-card", i === 0 ? "border-signal/50 text-signal" : "border-border text-muted-foreground", fresh && "materialize__icon")}>
                  <GitCommitHorizontal className="size-3.5" />
                </span>
                <span className="w-[60px] shrink-0 font-mono text-[11.5px] text-muted-foreground">{c.hash}</span>
                <span className="min-w-0 flex-1 truncate">{c.message}</span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums">
                  <span className="text-success">+{c.added}</span> <span className="text-danger">−{c.removed}</span>
                </span>
              </>
            );
            // The materialising row keeps valid list markup: <li class="materialize"> → <div> (the
            // collapsing grid row) → the row itself.
            return fresh ? (
              <li key={c.hash} className="materialize">
                <div>
                  <div className={rowClass}>{cells}</div>
                </div>
              </li>
            ) : (
              <li key={c.hash} className={rowClass}>
                {cells}
              </li>
            );
          })}
        </ol>
      </div>
      <p className="text-[11px] text-muted-foreground">Sample commits</p>
    </div>
  );
}
