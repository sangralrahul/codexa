"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, FileMinus2, FilePen, FilePlus2, RotateCcw } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { emit } from "@/lib/client/events";
import { cn } from "@/lib/utils";
import { Button, Dialog, DialogContent, DialogFooter, Spinner } from "@/components/ui";
import type { FileChangeStat } from "./types";

type RunDetails = {
  run: { id: string; status: string; snapshotBeforeId: string | null };
  stats: FileChangeStat[];
  snapshotBefore: { id: string; name: string } | null;
};

/**
 * "Review changes" for one generation run: lists the files that differ from
 * the pre-run snapshot with +/- line counts, opens them in the editor, and
 * offers "Revert this run" (restores the snapshot) behind a confirmation.
 */
export function ReviewChanges({ projectId, runId, changedCount, onReverted }: { projectId: string; runId: string; changedCount: number; onReverted?: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [details, setDetails] = React.useState<RunDetails | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState(false);
  const [reverting, setReverting] = React.useState(false);
  const [reverted, setReverted] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<RunDetails>(`/api/v1/projects/${encodeURIComponent(projectId)}/ai/runs/${encodeURIComponent(runId)}`);
      setDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the changes.");
    } finally {
      setLoading(false);
    }
  }, [projectId, runId]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !details && !loading) void load();
  };

  const revert = async () => {
    setReverting(true);
    setError(null);
    try {
      const res = await api<{ ok: true; revertedPaths: string[] }>(`/api/v1/projects/${encodeURIComponent(projectId)}/ai/runs/${encodeURIComponent(runId)}/revert`, { method: "POST" });
      setReverted(res.revertedPaths.length);
      setConfirm(false);
      emit("codexa:files-changed", { paths: res.revertedPaths, source: "snapshot" });
      onReverted?.();
      await load();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Revert failed.");
    } finally {
      setReverting(false);
    }
  };

  const stats = details?.stats ?? [];
  const panelId = `review-${runId}`;
  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        {open ? <ChevronDown className="size-3.5" aria-hidden="true" /> : <ChevronRight className="size-3.5" aria-hidden="true" />}
        Review changes
        <span className="text-muted-foreground">({details ? stats.length : changedCount} file{(details ? stats.length : changedCount) === 1 ? "" : "s"})</span>
        {reverted !== null ? <span className="ml-auto text-success">Reverted {reverted} file{reverted === 1 ? "" : "s"}</span> : null}
      </button>
      {open ? (
        <div id={panelId} className="border-t border-border px-3 py-2 text-xs">
          {loading ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Spinner /> Loading diff…
            </p>
          ) : error ? (
            <div className="space-y-2">
              <p role="alert" className="text-danger">
                {error}
              </p>
              <Button size="sm" variant="outline" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          ) : !details?.snapshotBefore ? (
            <p className="text-muted-foreground">This run did not change any files.</p>
          ) : stats.length === 0 ? (
            <p className="text-muted-foreground">The project currently matches the snapshot taken before this run.</p>
          ) : (
            <ul className="space-y-1">
              {stats.map((s) => {
                const Icon = s.action === "create" ? FilePlus2 : s.action === "delete" ? FileMinus2 : FilePen;
                return (
                  <li key={s.path} className="flex items-center gap-2">
                    <Icon className={cn("size-3.5 shrink-0", s.action === "create" ? "text-success" : s.action === "delete" ? "text-danger" : "text-primary")} aria-hidden="true" />
                    {s.action === "delete" ? (
                      <span className="min-w-0 truncate font-mono text-muted-foreground line-through">{s.path}</span>
                    ) : (
                      <button type="button" onClick={() => emit("codexa:open-file", { path: s.path })} className="min-w-0 truncate font-mono underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring" title={`Open ${s.path}`}>
                        {s.path}
                      </button>
                    )}
                    <span className="ml-auto shrink-0 font-mono">
                      <span className="text-success">+{s.added}</span> <span className="text-danger">−{s.removed}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {details?.snapshotBefore && stats.length > 0 ? (
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setConfirm(true)}>
                <RotateCcw className="size-3.5" aria-hidden="true" /> Revert this run
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent title="Revert this run?" description={`Restores the ${stats.length} file${stats.length === 1 ? "" : "s"} changed by this run to the snapshot "${details?.snapshotBefore?.name ?? "Before AI run"}". A safety snapshot of the current state is created first.`}>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)} disabled={reverting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void revert()} loading={reverting}>
              Revert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
