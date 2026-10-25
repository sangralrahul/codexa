"use client";

import { useCallback, useEffect, useState } from "react";
import { GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { filesApi } from "@/lib/client/workspace/api";
import type { ChangeSummary } from "@/lib/client/workspace/types";
import { on } from "@/lib/client/events";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";

/**
 * "Changed files" indicator: files that differ from the latest snapshot
 * (GET /projects/:id/changes). Refreshes after any codexa:files-changed event
 * and whenever `version` changes (e.g. after a snapshot is created/restored).
 */
export function ChangedFiles({ projectId, version, onOpenFile, onOpenHistory }: { projectId: string; version: number; onOpenFile: (path: string) => void; onOpenHistory: () => void }) {
  const [state, setState] = useState<{ snapshot: { name: string } | null; changes: ChangeSummary[] } | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await filesApi.changes(projectId);
      setState({ snapshot: res.snapshot, changes: res.changes });
      setError(false);
    } catch {
      setError(true);
    }
  }, [projectId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load, version]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const off = on("codexa:files-changed", () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => void load(), 1200);
    });
    return () => {
      off();
      if (t) clearTimeout(t);
    };
  }, [load]);

  const count = state?.changes.length ?? 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs",
            count > 0 ? "border-warning/50 bg-warning/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted",
          )}
          aria-label={`${count} file${count === 1 ? "" : "s"} changed since last snapshot`}
          title="Changed since last snapshot"
        >
          <GitCompare className="size-3.5" aria-hidden="true" />
          <span className="tabular-nums">{error ? "?" : count}</span>
          <span className="hidden sm:inline">changed</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-72 overflow-auto">
        <DropdownMenuLabel className="text-xs">
          {error ? "Could not load changes" : state?.snapshot ? `Since "${state.snapshot.name}"` : "No snapshot yet"}
        </DropdownMenuLabel>
        {count === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">{error ? "Try again later." : "No changes since the last snapshot."}</p>
        ) : (
          state!.changes.map((c) => (
            <DropdownMenuItem key={c.path} onSelect={() => c.action !== "delete" && onOpenFile(c.path)} disabled={c.action === "delete"} className="font-mono text-xs">
              <span className={cn("w-3 shrink-0", c.action === "create" ? "text-success" : c.action === "delete" ? "text-danger" : "text-warning")} aria-label={c.action}>
                {c.action === "create" ? "+" : c.action === "delete" ? "−" : "~"}
              </span>
              <span className="truncate">{c.path}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onOpenHistory} className="text-xs">
          Open version history
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
