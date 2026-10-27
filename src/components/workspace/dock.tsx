"use client";

import { ChevronDown, ChevronUp, CircleAlert, FileWarning, ListChecks, TerminalSquare, TriangleAlert, Wand2 } from "lucide-react";
import { emit } from "@/lib/client/events";
import { useLogSnapshot, useRuntime } from "@/lib/client/workspace/runtime";
import type { Problem } from "@/lib/client/workspace/problems";
import { Tooltip } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { LogsPanel } from "./logs-panel";
import { toolButton } from "./panel-tabs";

export type DockTab = "terminal" | "problems";

/**
 * The bottom dock under the canvas (Ctrl/⌘+J): Terminal and Problems. Collapsed, it is a
 * one-line ticker with the last real log line and the error count. The terminal stays
 * mounted either way so no output is lost.
 */
export function Dock({
  open,
  collapsible = true,
  onOpenChange,
  tab,
  onTabChange,
  problems,
}: {
  open: boolean;
  collapsible?: boolean;
  onOpenChange: (open: boolean) => void;
  tab: DockTab;
  onTabChange: (tab: DockTab) => void;
  problems: Problem[];
}) {
  const rt = useRuntime();
  const snap = useLogSnapshot(rt.logs);
  const errors = problems.filter((p) => p.severity === "error").length;
  const last = snap.last;

  return (
    <div className="ws-card flex h-full min-h-0 flex-col" data-dock={open ? "open" : "collapsed"}>
      {/* Header (expanded) / ticker (collapsed) */}
      {open ? (
        <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border px-1.5">
          <div role="tablist" aria-label="Dock" className="flex items-center gap-0.5">
            {(
              [
                ["terminal", "Terminal", TerminalSquare, null],
                ["problems", "Problems", ListChecks, problems.length],
              ] as const
            ).map(([id, label, Icon, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`dock-tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`dock-panel-${id}`}
                tabIndex={tab === id ? 0 : -1}
                onClick={() => onTabChange(id)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const next = tab === "terminal" ? "problems" : "terminal";
                    onTabChange(next);
                    document.getElementById(`dock-tab-${next}`)?.focus();
                  }
                }}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  tab === id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
                {count ? (
                  <span className={cn("rounded-full px-1.5 font-mono text-[10.5px] tabular-nums", errors ? "bg-danger/12 text-danger" : "bg-warning/12 text-warning")}>{count}</span>
                ) : null}
              </button>
            ))}
          </div>
          {collapsible ? (
            <>
              <span className="ml-auto hidden items-center gap-1 text-[11px] text-muted-foreground md:flex">
                <Kbd mod>J</Kbd>
              </span>
              <Tooltip content="Collapse the dock">
                <button type="button" onClick={() => onOpenChange(false)} aria-label="Collapse the dock" className={cn(toolButton, "size-7")}>
                  <ChevronDown className="size-4" aria-hidden="true" />
                </button>
              </Tooltip>
            </>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-label={`Open the terminal${errors ? ` (${errors} problem${errors === 1 ? "" : "s"})` : ""}`}
          className="flex h-full min-h-0 w-full items-center gap-2.5 px-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <TerminalSquare className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted-foreground">
            {last ? (
              <span key={snap.total} className={cn("ws-ticker-line inline-block", last.stream === "stderr" && "text-danger")}>
                {last.line}
              </span>
            ) : snap.conn === "ended" ? (
              "No runtime running"
            ) : (
              "Terminal"
            )}
          </span>
          {errors ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-danger/12 px-1.5 py-0.5 font-mono text-[10.5px] font-medium tabular-nums text-danger">
              <CircleAlert className="size-3" aria-hidden="true" /> {errors}
            </span>
          ) : null}
          <ChevronUp className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      )}

      <div id="dock-panel-terminal" role="tabpanel" aria-labelledby="dock-tab-terminal" className="min-h-0 flex-1" hidden={!open || tab !== "terminal"} inert={!open || tab !== "terminal"}>
        <LogsPanel visible={open && tab === "terminal"} />
      </div>
      <div id="dock-panel-problems" role="tabpanel" aria-labelledby="dock-tab-problems" className="scrollbar-thin min-h-0 flex-1 overflow-y-auto" hidden={!open || tab !== "problems"}>
        <ProblemsList problems={problems} />
      </div>
    </div>
  );
}

export function ProblemsList({ problems }: { problems: Problem[] }) {
  if (!problems.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1.5 p-6 text-center">
        <ListChecks className="size-5 text-success" aria-hidden="true" />
        <p className="text-[13px] font-medium">No problems</p>
        <p className="max-w-xs text-[12px] text-muted-foreground">Errors from the dev server and failed checks after an AI run show up here.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border" aria-label="Problems">
      {problems.map((p) => (
        <li key={p.id} className="group flex items-start gap-2.5 px-3 py-2 text-[12.5px] hover:bg-muted/40">
          {p.severity === "error" ? <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-danger" aria-label="Error" /> : <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-label="Warning" />}
          <div className="min-w-0 flex-1">
            <p className="break-words font-mono text-[12px] leading-5">{p.message}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-muted-foreground">
              <span>{p.source === "checks" ? "AI run checks" : "Dev server"}</span>
              {p.file ? (
                <button type="button" onClick={() => emit("codexa:open-file", { path: p.file!, line: p.line })} className="inline-flex items-center gap-1 font-mono underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                  <FileWarning className="size-3" aria-hidden="true" />
                  {p.file}
                  {p.line ? `:${p.line}` : ""}
                  {p.column ? `:${p.column}` : ""}
                </button>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={() => emit("codexa:ai-fix-request", { error: p.file ? `${p.message} (${p.file}${p.line ? `:${p.line}` : ""})` : p.message, logs: p.context })}
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2 text-[12px] font-medium opacity-80 transition-[opacity,background-color] hover:bg-muted group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Wand2 className="size-3.5" aria-hidden="true" /> Fix with AI
          </button>
        </li>
      ))}
    </ul>
  );
}
