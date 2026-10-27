"use client";

import * as React from "react";
import { Flag, RotateCcw, RotateCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

type Checkpoint = { id: string; name: string; kind: "ai" | "manual"; when: string; files: number };

// Sample history (labelled "Sample data" on screen). Kinds, tones and wording follow the IDE's version history.
const CHECKPOINTS: Checkpoint[] = [
  { id: "c3", name: "Before: invoices table", kind: "ai", when: "2 min ago", files: 14 },
  { id: "c2", name: "Before: contact form", kind: "ai", when: "1 h ago", files: 12 },
  { id: "c1", name: "Starter", kind: "manual", when: "yesterday", files: 9 },
];

const KIND = {
  ai: { label: "AI run", Icon: Sparkles, tone: "bg-signal/12 text-signal ring-signal/30" },
  manual: { label: "Checkpoint", Icon: Flag, tone: "bg-foreground/[0.07] text-foreground ring-border-strong" },
} as const;

/**
 * "Undo anything", whole-run half (the diff above it is the per-file half): a compact version
 * history like the IDE's, with the working copy on top and a checkpoint before every AI run.
 * Restore on any row (Re-apply on the restored one) updates the working-copy line and says in a
 * toast that it is illustrative. It grows with its tile: the oldest checkpoint stays pinned to
 * the bottom and the timeline line stretches to it. Sample data, nothing is stored.
 */
export function SnapshotTimeline({ className }: { className?: string }) {
  const [current, setCurrent] = React.useState<string | null>(null);
  const restored = CHECKPOINTS.find((c) => c.id === current) ?? null;

  const toggle = (c: Checkpoint) => {
    const next = current === c.id ? null : c.id;
    setCurrent(next);
    if (next) toast.info("Restored · illustrative", `In a real project every file goes back to “${c.name}”, after a safety checkpoint is saved.`);
    else toast.info("Re-applied · illustrative", "In a real project this brings back the files from before the restore.");
  };

  return (
    <div className={cn("min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background/60 shadow-sm", className)}>
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-[11.5px]">
        <span className="font-medium text-foreground">Version history</span>
        <span className="truncate text-muted-foreground">· whole project</span>
        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">Sample data</span>
      </div>
      <ol aria-label="Sample version history" className="relative flex flex-1 flex-col px-3 py-2">
        {/* The timeline line runs from the working copy's node to the oldest checkpoint's. */}
        <span aria-hidden="true" className="absolute bottom-[26px] left-[22px] top-[26px] w-px bg-border" />
        <li className="relative flex items-center gap-2.5 py-1">
          <span aria-hidden="true" className="relative z-[1] flex size-[22px] shrink-0 items-center justify-center rounded-full bg-signal shadow-[0_0_0_3px_var(--card)]">
            <span className="size-1.5 rounded-full bg-background" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-foreground">Now · working copy</p>
            <p key={current ?? "now"} className="truncate text-[11px] text-muted-foreground [animation:stage-swap-in_var(--dur-3)_var(--ease-out)_both] calm:[animation:none]">
              {restored ? `Restored “${restored.name}” · safety checkpoint saved` : "3 files changed by the last run"}
            </p>
          </div>
        </li>
        {CHECKPOINTS.map((c, i) => {
          const k = KIND[c.kind];
          const isCurrent = current === c.id;
          return (
            <li
              key={c.id}
              className={cn(
                "relative flex items-center gap-2.5 py-1 before:absolute before:-inset-x-1.5 before:inset-y-0 before:rounded-lg before:bg-signal/[0.07] before:opacity-0 before:transition-opacity before:duration-(--dur-3)",
                isCurrent && "before:opacity-100",
                i === CHECKPOINTS.length - 1 && "mt-auto",
              )}
            >
              <span aria-hidden="true" className={cn("relative z-[1] flex size-[22px] shrink-0 items-center justify-center rounded-full ring-1 shadow-[0_0_0_3px_var(--card)]", k.tone)}>
                <k.Icon className="size-3" />
              </span>
              <div className="relative min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-foreground">{c.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {k.label} · {c.when} · {c.files} files
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggle(c)}
                aria-label={isCurrent ? "Re-apply the working copy (illustration)" : `Restore the whole project to “${c.name}” (illustration)`}
                className="relative inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-border-strong bg-card px-2.5 text-[11.5px] font-medium text-foreground shadow-[inset_0_1px_0_var(--hairline)] transition-[border-color,background-color] hover:border-foreground/30 hover:bg-muted"
              >
                {isCurrent ? <RotateCw className="size-3" aria-hidden="true" /> : <RotateCcw className="size-3" aria-hidden="true" />}
                {isCurrent ? "Re-apply" : "Restore"}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
