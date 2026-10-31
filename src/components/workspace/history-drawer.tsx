"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock, Flag, GitCompare, History, Plus, Rocket, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { snapshotsApi } from "@/lib/client/workspace/api";
import type { FileDiff, SnapshotDto } from "@/lib/client/workspace/types";
import { changedLines } from "@/lib/client/workspace/line-diff";
import { emit } from "@/lib/client/events";
import { languageForPath } from "@/components/editor/language";
import { CodeDiffEditor } from "@/components/editor/code-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, Skeleton } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toast";
import { relativeTime } from "@/components/projects/format";
import { Drawer } from "./drawer";
import { ConfirmDialog } from "./confirm-dialog";

const KIND: Record<string, { label: string; Icon: typeof Clock; tone: string }> = {
  ai: { label: "AI run", Icon: Sparkles, tone: "bg-primary/12 text-primary ring-primary/30" },
  deploy: { label: "Deploy", Icon: Rocket, tone: "bg-success/12 text-success ring-success/30" },
  manual: { label: "Checkpoint", Icon: Flag, tone: "bg-foreground/[0.07] text-foreground ring-border-strong" },
  auto: { label: "Auto", Icon: Clock, tone: "bg-muted text-muted-foreground ring-border" },
  restore: { label: "Before restore", Icon: RotateCcw, tone: "bg-info/12 text-info ring-info/30" },
};
const kindOf = (k: string) => KIND[k] ?? KIND.auto;

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(today) - start(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

function lineStats(d: FileDiff) {
  const add = changedLines(d.before, d.after);
  const rem = changedLines(d.after, d.before);
  return { added: add.added.length + add.modified.length, removed: rem.added.length + rem.modified.length };
}

/**
 * Version history as a timeline grouped by day: nodes coloured by kind (AI, deploy, manual,
 * auto, restore), the working copy pulsing at the top, side-by-side diffs, and Restore behind
 * its confirmation (a safety snapshot is always taken first). Restoring plays the diff sweep
 * on the open file and confirms with a toast.
 */
export function HistoryDrawer({
  projectId,
  open,
  onOpenChange,
  canEdit,
  onChanged,
  changesCount,
  changesSince,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  canEdit: boolean;
  /** Called after a snapshot is created or restored so the parent can refresh indicators. */
  onChanged: () => void;
  /** Files changed since the latest checkpoint (GET /changes). */
  changesCount?: number | null;
  changesSince?: string | null;
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
  const [kindFilter, setKindFilter] = useState<"all" | "ai" | "deploy" | "manual">("all");

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
      toast.success("Checkpoint saved", n);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create checkpoint");
    } finally {
      setCreating(false);
    }
  };

  // Counts by kind for the summary strip and the filter (the "manual" bucket holds checkpoints people named).
  const counts = useMemo(() => {
    const c = { all: 0, ai: 0, deploy: 0, manual: 0, other: 0 };
    for (const s of snapshots ?? []) {
      c.all += 1;
      if (s.kind === "ai") c.ai += 1;
      else if (s.kind === "deploy") c.deploy += 1;
      else if (s.kind === "manual") c.manual += 1;
      else c.other += 1;
    }
    return c;
  }, [snapshots]);
  const shown = useMemo(() => (snapshots ?? []).filter((s) => kindFilter === "all" || s.kind === kindFilter), [snapshots, kindFilter]);
  const groups = useMemo(() => {
    const out: { day: string; items: SnapshotDto[] }[] = [];
    for (const s of shown) {
      const day = dayLabel(s.createdAt);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(s);
      else out.push({ day, items: [s] });
    }
    return out;
  }, [shown]);
  const oldest = snapshots?.length ? snapshots[snapshots.length - 1] : null;

  const stats = useMemo(() => new Map((diff ?? []).map((d) => [d.path, lineStats(d)])), [diff]);

  return (
    <Drawer
      open={open}
      onOpenChange={close}
      icon={<History aria-hidden="true" />}
      title={selected ? `Diff: ${selected.name}` : "Version history"}
      description={selected ? "Left: the checkpoint · Right: the current files" : "Checkpoints of every file in the project. Restore any of them at any time."}
      wide={Boolean(selected)}
    >
      {selected ? (
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
            <Button size="sm" variant="ghost" appearance="app" onClick={() => setSelected(null)}>
              <ArrowLeft className="size-4" aria-hidden="true" /> All checkpoints
            </Button>
            <span className="text-xs text-muted-foreground">{diff ? `${diff.length} file${diff.length === 1 ? "" : "s"} differ from the current project` : null}</span>
            {canEdit ? (
              <Button size="sm" variant="outline" appearance="app" className="ml-auto" onClick={() => setRestoring(selected)}>
                <RotateCcw className="size-4" aria-hidden="true" /> Restore this checkpoint
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
            <p className="p-6 text-center text-sm text-muted-foreground">This checkpoint is identical to the current files.</p>
          ) : (
            <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] md:grid-cols-[260px_1fr] md:grid-rows-1">
              <ul className="scrollbar-thin max-h-40 overflow-auto border-b border-border p-1.5 md:max-h-none md:border-b-0 md:border-r" aria-label="Changed files">
                {diff.map((d) => {
                  const st = stats.get(d.path);
                  return (
                    <li key={d.path} className="diff-row">
                      <div>
                        <button
                          type="button"
                          onClick={() => setFile(d)}
                          aria-current={file?.path === d.path ? "true" : undefined}
                          className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted", file?.path === d.path && "bg-muted")}
                        >
                          <span className={cn("w-3 shrink-0 font-mono font-semibold", d.action === "create" ? "text-success" : d.action === "delete" ? "text-danger" : "text-warning")} aria-label={d.action}>
                            {d.action === "create" ? "A" : d.action === "delete" ? "D" : "M"}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-mono">{d.path}</span>
                          {st ? (
                            <span className="shrink-0 font-mono text-[10.5px] tabular-nums">
                              <span className="text-success">+{st.added}</span> <span className="text-danger">−{st.removed}</span>
                            </span>
                          ) : null}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="min-h-[320px]">{file ? <CodeDiffEditor key={file.path} original={file.before ?? ""} modified={file.after ?? ""} language={languageForPath(file.path)} path={file.path} modelKey={`${selected.id}-${diffNonce}`} /> : null}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="px-5 py-4">
          {canEdit ? (
            <form onSubmit={create} className="mb-5 flex items-center gap-2 rounded-xl border border-border bg-surface/60 p-1.5 pl-3 shadow-[inset_0_1px_0_var(--hairline)]">
              <Flag className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <label htmlFor="snap-name" className="sr-only">
                New checkpoint name
              </label>
              <Input id="snap-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name a checkpoint, e.g. Before redesign" maxLength={100} className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
              <Button type="submit" size="sm" appearance="app" loading={creating} disabled={!name.trim()}>
                <Plus className="size-4" aria-hidden="true" /> Save
              </Button>
            </form>
          ) : null}
          {error ? (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          ) : null}
          {!snapshots ? (
            <div className="space-y-3" aria-busy="true">
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-start gap-3 py-1.5">
                  <Skeleton className="size-[27px] rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-7 w-40 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {snapshots.length ? (
                <div className="mb-4 space-y-3">
                  {/* Summary: counts by kind (every number is a snapshot row) and how far back the history goes. */}
                  <dl className="grid grid-cols-4 gap-2">
                    {(
                      [
                        ["Checkpoints", counts.all, Clock],
                        ["AI runs", counts.ai, Sparkles],
                        ["Deploys", counts.deploy, Rocket],
                        ["Named", counts.manual, Flag],
                      ] as const
                    ).map(([label, n, Icon]) => (
                      <div key={label} className="rounded-xl border border-border bg-surface/60 px-2.5 py-2">
                        <dt className="flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.05em] text-foreground-dim">
                          <Icon className="size-3" aria-hidden="true" /> {label}
                        </dt>
                        <dd className="mt-0.5 text-[18px] font-bold leading-none tabular-nums tracking-[-0.02em]">{n}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Segmented
                      aria-label="Filter by kind"
                      size="sm"
                      value={kindFilter}
                      onValueChange={setKindFilter}
                      options={[
                        { value: "all", label: "All", count: counts.all },
                        { value: "ai", label: "AI", count: counts.ai },
                        { value: "deploy", label: "Deploy", count: counts.deploy },
                        { value: "manual", label: "Named", count: counts.manual },
                      ]}
                    />
                    {oldest ? (
                      <p className="text-[11.5px] tabular-nums text-foreground-dim">
                        Since {new Date(oldest.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {relativeTime(oldest.createdAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            <ol className="relative" aria-label="Version history">
              <span className="absolute bottom-3 left-[13px] top-3 w-px bg-border" aria-hidden="true" />
              <li className="relative flex items-start gap-3 pb-5">
                <span className="ws-node-pulse relative z-[1] mt-0.5 flex size-[27px] shrink-0 items-center justify-center rounded-full bg-primary text-background shadow-[0_0_0_4px_var(--card)]" aria-hidden="true">
                  <span className="size-2 rounded-full bg-background" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold">Now · working copy</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {changesCount === null || changesCount === undefined
                      ? "The files as they are right now."
                      : changesCount === 0
                        ? "No changes since the last checkpoint."
                        : `${changesCount} file${changesCount === 1 ? "" : "s"} changed${changesSince ? ` since “${changesSince}”` : " since the last checkpoint"}.`}
                  </p>
                </div>
              </li>
              {snapshots.length === 0 ? <li className="relative pl-10 text-[13px] text-muted-foreground">No checkpoints yet. The agent saves one before every change; you can save your own above.</li> : null}
              {snapshots.length > 0 && shown.length === 0 ? <li className="relative pl-10 text-[13px] text-muted-foreground">No checkpoints of this kind yet.</li> : null}
              {groups.map((g) => (
                <li key={g.day} className="relative">
                  <p className="relative z-[1] mb-2 ml-10 text-[11.5px] font-medium text-muted-foreground">{g.day}</p>
                  <ol className="space-y-1 pb-4">
                    {g.items.map((s) => {
                      const k = kindOf(s.kind);
                      return (
                        <li key={s.id} className="group relative flex items-start gap-3 rounded-xl py-1.5 pr-2">
                          <span className={cn("relative z-[1] mt-0.5 flex size-[27px] shrink-0 items-center justify-center rounded-full ring-1 shadow-[0_0_0_4px_var(--card)]", k.tone)} aria-hidden="true">
                            <k.Icon className="size-3.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-medium">{s.name}</p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-muted-foreground">
                              <span>{k.label}</span>
                              <span aria-hidden="true">·</span>
                              <time dateTime={s.createdAt} title={new Date(s.createdAt).toLocaleString()}>
                                {timeOf(s.createdAt)} · {relativeTime(s.createdAt)}
                              </time>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">{s.fileCount} files</span>
                            </p>
                            {s.message ? <p className="mt-1 text-[12px] text-muted-foreground">{s.message}</p> : null}
                            <div className="mt-1.5 flex gap-1.5 opacity-90 transition-opacity group-hover:opacity-100">
                              <Button size="sm" variant="outline" appearance="app" className="h-7 px-2.5 text-xs" onClick={() => void openDiff(s)}>
                                <GitCompare className="size-3.5" aria-hidden="true" /> View diff
                              </Button>
                              {canEdit ? (
                                <Button size="sm" variant="ghost" appearance="app" className="h-7 px-2.5 text-xs" onClick={() => setRestoring(s)}>
                                  <RotateCcw className="size-3.5" aria-hidden="true" /> Restore
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </li>
              ))}
            </ol>
            </>
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
          emit("codexa:restored", { paths: res.paths, label: `Restored “${res.restored.name}”` });
          toast.success(`Restored “${res.restored.name}”`, `${res.paths.length} file${res.paths.length === 1 ? "" : "s"} updated. A safety checkpoint was saved first.`);
          setRestoring(null);
          setSelected(null);
          await load();
          onChanged();
        }}
      />
    </Drawer>
  );
}
