"use client";

import * as React from "react";
import { ChevronRight, History, RotateCcw, Undo2 } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { emit } from "@/lib/client/events";
import { useAgent, type RunDetails } from "@/lib/client/workspace/agent";
import { snapshotsApi } from "@/lib/client/workspace/api";
import { formatElapsed } from "@/lib/client/workspace/runtime";
import { cn } from "@/lib/utils";
import { Button, Dialog, DialogContent, DialogFooter, Spinner, toast } from "@/components/ui";

/** Run details (diff stats + the pre-run checkpoint), shared through the agent context when there is one. */
export function useRunDetails(projectId: string, runId: string | null, auto = false) {
  const agent = useAgent();
  const shared = agent.projectId === projectId;
  const [local, setLocal] = React.useState<RunDetails | "loading" | "error" | undefined>(undefined);
  const value = runId ? (shared ? agent.details[runId] : local) : undefined;
  const { loadDetails } = agent;
  const load = React.useCallback(
    async (force = false) => {
      if (!runId) return;
      if (shared) return loadDetails(runId, { force });
      setLocal("loading");
      try {
        const res = await api<RunDetails>(`/api/v1/projects/${encodeURIComponent(projectId)}/ai/runs/${encodeURIComponent(runId)}`);
        setLocal({ stats: res.stats, snapshotBefore: res.snapshotBefore });
      } catch {
        setLocal("error");
      }
    },
    [projectId, runId, shared, loadDetails],
  );
  React.useEffect(() => {
    if (!auto || !runId || value !== undefined) return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [auto, runId, value, load]);
  return { details: value && value !== "loading" && value !== "error" ? value : null, loading: value === "loading", error: value === "error", load };
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n));

/**
 * The run card footer: Review changes (+/− per file from the real diff), Revert this run,
 * tokens and duration, and the pre-run checkpoint with "Restore to here". Both restore
 * actions keep their confirmations and create a safety snapshot server-side first.
 */
export function RunFooter({
  projectId,
  runId,
  snapshotBeforeId,
  changedCount,
  tokens,
  startedAt,
  finishedAt,
  canEdit = true,
  autoLoad = false,
  onReverted,
}: {
  projectId: string;
  runId: string;
  snapshotBeforeId: string | null;
  changedCount: number;
  tokens: number;
  startedAt?: number | null;
  finishedAt?: number | null;
  canEdit?: boolean;
  /** Fetch the diff stats right away (latest run) instead of on first expand. */
  autoLoad?: boolean;
  onReverted?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const { details, loading, error, load } = useRunDetails(projectId, runId, autoLoad);
  const [confirm, setConfirm] = React.useState<"revert" | "restore" | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [reverted, setReverted] = React.useState<number | null>(null);
  const stats = details?.stats ?? [];
  const checkpoint = details?.snapshotBefore ?? null;
  const panelId = `review-${runId}`;
  const count = details ? stats.length : changedCount;
  const added = stats.reduce((n, s) => n + s.added, 0);
  const removed = stats.reduce((n, s) => n + s.removed, 0);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !details && !loading) void load();
  };

  const run = async () => {
    setBusy(true);
    setActionError(null);
    try {
      if (confirm === "revert") {
        const res = await api<{ ok: true; revertedPaths: string[] }>(`/api/v1/projects/${encodeURIComponent(projectId)}/ai/runs/${encodeURIComponent(runId)}/revert`, { method: "POST" });
        setReverted(res.revertedPaths.length);
        emit("codexa:files-changed", { paths: res.revertedPaths, source: "snapshot" });
        emit("codexa:restored", { paths: res.revertedPaths, label: "Reverted this run" });
        toast.success("Run reverted", `${res.revertedPaths.length} file${res.revertedPaths.length === 1 ? "" : "s"} restored to the checkpoint before it.`);
      } else if (confirm === "restore" && (checkpoint?.id ?? snapshotBeforeId)) {
        const sid = (checkpoint?.id ?? snapshotBeforeId) as string;
        const res = await snapshotsApi.restore(projectId, sid);
        emit("codexa:files-changed", { paths: res.paths, source: "snapshot" });
        emit("codexa:restored", { paths: res.paths, label: `Restored “${res.restored.name}”` });
        toast.success(`Restored “${res.restored.name}”`, "A safety checkpoint of the previous state was saved first.");
      }
      setConfirm(null);
      onReverted?.();
      void load(true);
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const duration = startedAt && finishedAt && finishedAt >= startedAt ? (finishedAt - startedAt < 1000 ? "<1s" : formatElapsed(finishedAt - startedAt)) : null;
  const checkpointAt = checkpoint?.createdAt ?? (startedAt ? new Date(startedAt).toISOString() : null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {changedCount > 0 || snapshotBeforeId ? (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls={panelId}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-[12.5px] font-medium shadow-[inset_0_1px_0_var(--hairline)] transition-colors hover:border-border-strong hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ChevronRight className={cn("size-3.5 transition-transform duration-200", open && "rotate-90")} aria-hidden="true" />
            Review changes
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {count} file{count === 1 ? "" : "s"}
              {details && (added || removed) ? (
                <>
                  {" "}
                  <span className="text-success">+{added}</span> <span className="text-danger">−{removed}</span>
                </>
              ) : null}
            </span>
          </button>
        ) : null}
        {canEdit && snapshotBeforeId && changedCount > 0 && !(details && stats.length === 0) ? (
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setConfirm("revert");
            }}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[12.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Undo2 className="size-3.5" aria-hidden="true" /> Revert
          </button>
        ) : null}
        <span className="ml-auto flex items-center gap-2 font-mono text-[11px] tabular-nums text-muted-foreground">
          {tokens ? <span>{compact(tokens)} tokens</span> : null}
          {duration ? <span aria-label={`Took ${duration}`}>{duration}</span> : null}
        </span>
      </div>

      {reverted !== null ? <p className="text-[12px] text-success">Reverted {reverted} file{reverted === 1 ? "" : "s"}.</p> : null}

      {open ? (
        <div id={panelId} className="overflow-hidden rounded-xl border border-border bg-card text-[12.5px]">
          {loading ? (
            <p className="flex items-center gap-2 px-3 py-2.5 text-muted-foreground">
              <Spinner /> Loading the diff…
            </p>
          ) : error ? (
            <div className="flex items-center gap-2 px-3 py-2.5">
              <p role="alert" className="flex-1 text-danger">
                Could not load the changes.
              </p>
              <Button size="sm" variant="outline" onClick={() => void load(true)}>
                Retry
              </Button>
            </div>
          ) : !checkpoint ? (
            <p className="px-3 py-2.5 text-muted-foreground">This run did not change any files.</p>
          ) : stats.length === 0 ? (
            <p className="px-3 py-2.5 text-muted-foreground">The project currently matches the checkpoint taken before this run.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.map((s) => (
                <li key={s.path} className="flex items-center gap-2 px-3 py-1.5">
                  <span className={cn("w-3 shrink-0 font-mono text-[11px] font-semibold", s.action === "create" ? "text-success" : s.action === "delete" ? "text-danger" : "text-warning")} aria-label={s.action}>
                    {s.action === "create" ? "A" : s.action === "delete" ? "D" : "M"}
                  </span>
                  {s.action === "delete" ? (
                    <span className="min-w-0 truncate font-mono text-muted-foreground line-through">{s.path}</span>
                  ) : (
                    <button type="button" onClick={() => emit("codexa:open-file", { path: s.path })} className="min-w-0 truncate text-left font-mono underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring" title={`Open ${s.path}`}>
                      {s.path}
                    </button>
                  )}
                  <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums">
                    <span className="text-success">+{s.added}</span> <span className="text-danger">−{s.removed}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {snapshotBeforeId && checkpointAt ? (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border-strong px-2 py-0.5">
            <History className="size-3" aria-hidden="true" />
            Checkpoint · {timeOf(checkpointAt)}
          </span>
          {canEdit ? (
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setConfirm("restore");
              }}
              className="inline-flex items-center gap-1 rounded-md px-1 font-medium text-foreground/80 underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              <RotateCcw className="size-3" aria-hidden="true" /> Restore to here
            </button>
          ) : null}
        </div>
      ) : null}

      <Dialog open={confirm !== null} onOpenChange={(o) => !o && !busy && setConfirm(null)}>
        <DialogContent
          title={confirm === "restore" ? `Restore “${checkpoint?.name ?? "Before AI run"}”?` : "Revert this run?"}
          description={
            confirm === "restore"
              ? "All current files are replaced with this checkpoint, including changes made after this run. A safety snapshot of the current state is created first, so nothing is lost."
              : `Restores the ${count} file${count === 1 ? "" : "s"} changed by this run to the checkpoint “${checkpoint?.name ?? "Before AI run"}”. A safety snapshot of the current state is created first.`
          }
        >
          {actionError ? (
            <p role="alert" className="text-sm text-danger">
              {actionError}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant={confirm === "restore" ? "primary" : "danger"} onClick={() => void run()} loading={busy}>
              {confirm === "restore" ? "Restore" : "Revert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
