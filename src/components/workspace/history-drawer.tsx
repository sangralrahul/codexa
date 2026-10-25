"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Clock, GitCompare, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { snapshotsApi } from "@/lib/client/workspace/api";
import type { FileDiff, SnapshotDto } from "@/lib/client/workspace/types";
import { emit } from "@/lib/client/events";
import { languageForPath } from "@/components/editor/language";
import { CodeDiffEditor } from "@/components/editor/code-editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/input";
import { Alert, Skeleton } from "@/components/ui/misc";
import { Drawer } from "./drawer";
import { ConfirmDialog } from "./confirm-dialog";
import { relativeTime } from "@/components/projects/format";

const KIND_LABEL: Record<string, string> = { manual: "Checkpoint", auto: "Auto", ai: "AI", deploy: "Deploy", restore: "Before restore" };

export function HistoryDrawer({
  projectId,
  open,
  onOpenChange,
  canEdit,
  onChanged,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  canEdit: boolean;
  /** Called after a snapshot is created or restored so the parent can refresh indicators. */
  onChanged: () => void;
}) {
  const [snapshots, setSnapshots] = useState<SnapshotDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<SnapshotDto | null>(null);
  const [diff, setDiff] = useState<FileDiff[] | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [file, setFile] = useState<FileDiff | null>(null);
  const [diffNonce, setDiffNonce] = useState(0);
  const [restoring, setRestoring] = useState<SnapshotDto | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await snapshotsApi.list(projectId);
      setSnapshots(res.snapshots);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load history");
    }
  }, [projectId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    snapshotsApi
      .list(projectId)
      .then((res) => {
        if (cancelled) return;
        setSnapshots(res.snapshots);
        setError(null);
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load history"));
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const close = (o: boolean) => {
    if (!o) {
      setSelected(null);
      setDiff(null);
      setFile(null);
    }
    onOpenChange(o);
  };

  const openDiff = async (s: SnapshotDto) => {
    setSelected(s);
    setDiff(null);
    setDiffError(null);
    setFile(null);
    setDiffNonce((n) => n + 1);
    try {
      const res = await snapshotsApi.get(projectId, s.id);
      setDiff(res.diff);
      setFile(res.diff[0] ?? null);
    } catch (e) {
      setDiffError(e instanceof Error ? e.message : "Could not load diff");
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setCreating(true);
    try {
      await snapshotsApi.create(projectId, { name: n });
      setName("");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create checkpoint");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={close} title={selected ? `Diff: ${selected.name}` : "Version history"} description={selected ? "Left: snapshot · Right: current files" : "Snapshots of every file in the project. Restore any of them at any time."} wide={Boolean(selected)}>
      {selected ? (
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
              <ArrowLeft className="size-4" /> All snapshots
            </Button>
            <span className="text-xs text-muted-foreground">
              {diff ? `${diff.length} file${diff.length === 1 ? "" : "s"} differ from the current project` : null}
            </span>
            {canEdit ? (
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => setRestoring(selected)}>
                <RotateCcw className="size-4" /> Restore this snapshot
              </Button>
            ) : null}
          </div>
          {diffError ? (
            <Alert variant="danger" className="m-4">
              {diffError}
            </Alert>
          ) : !diff ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          ) : diff.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">This snapshot is identical to the current files.</p>
          ) : (
            <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] md:grid-cols-[220px_1fr] md:grid-rows-1">
              <ul className="max-h-40 overflow-auto border-b border-border md:max-h-none md:border-b-0 md:border-r" aria-label="Changed files">
                {diff.map((d) => (
                  <li key={d.path}>
                    <button
                      type="button"
                      onClick={() => setFile(d)}
                      aria-current={file?.path === d.path ? "true" : undefined}
                      className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted", file?.path === d.path && "bg-muted")}
                    >
                      <span className={cn("w-3 shrink-0 font-mono", d.action === "create" ? "text-success" : d.action === "delete" ? "text-danger" : "text-warning")} aria-label={d.action}>
                        {d.action === "create" ? "+" : d.action === "delete" ? "−" : "~"}
                      </span>
                      <span className="truncate">{d.path}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="min-h-[320px]">
                {file ? <CodeDiffEditor key={file.path} original={file.before ?? ""} modified={file.after ?? ""} language={languageForPath(file.path)} path={file.path} modelKey={`${selected.id}-${diffNonce}`} /> : null}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4">
          {canEdit ? (
            <form onSubmit={create} className="mb-4 flex items-end gap-2">
              <Field label="New checkpoint" htmlFor="snap-name" className="flex-1">
                <Input id="snap-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Before redesign" maxLength={100} />
              </Field>
              <Button type="submit" loading={creating} disabled={!name.trim()}>
                <Plus className="size-4" /> Save
              </Button>
            </form>
          ) : null}
          {error ? (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          ) : null}
          {!snapshots ? (
            <div className="space-y-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : snapshots.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No snapshots yet.</p>
          ) : (
            <ul className="space-y-2" aria-label="Snapshots">
              {snapshots.map((s) => (
                <li key={s.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          {KIND_LABEL[s.kind] ?? s.kind}
                        </Badge>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" aria-hidden="true" /> {relativeTime(s.createdAt)}
                        </span>
                        <span>{s.fileCount} files</span>
                      </p>
                      {s.message ? <p className="mt-1 text-xs text-muted-foreground">{s.message}</p> : null}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => void openDiff(s)}>
                      <GitCompare className="size-4" /> View diff
                    </Button>
                    {canEdit ? (
                      <Button size="sm" variant="ghost" onClick={() => setRestoring(s)}>
                        <RotateCcw className="size-4" /> Restore
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(restoring)}
        onOpenChange={(o) => !o && setRestoring(null)}
        title={`Restore "${restoring?.name}"?`}
        description="All current files are replaced with the snapshot. A safety snapshot of the current state is created first, so nothing is lost."
        confirmLabel="Restore"
        onConfirm={async () => {
          if (!restoring) return;
          const res = await snapshotsApi.restore(projectId, restoring.id);
          emit("codexa:files-changed", { paths: res.paths, source: "snapshot" });
          setRestoring(null);
          setSelected(null);
          await load();
          onChanged();
        }}
      />
    </Drawer>
  );
}
