import { useCallback, useEffect, useState } from "react";
import { Clock, History as HistoryIcon, Rocket, RotateCcw, Save, Sparkles, Undo2 } from "lucide-react";
import { ApiError, historyApi, type Snapshot } from "../../lib/api";
import { cn, relativeTime } from "../../lib/util";
import { Badge, Button, Dialog, Spinner, toast } from "../../ui";

const KIND: Record<string, { label: string; icon: typeof Save; tint: string }> = {
  manual: { label: "Saved by you", icon: Save, tint: "text-fg" },
  auto: { label: "Auto-saved", icon: Clock, tint: "text-muted" },
  ai: { label: "AI change", icon: Sparkles, tint: "text-accent" },
  deploy: { label: "Published", icon: Rocket, tint: "text-success" },
  restore: { label: "Before restore", icon: Undo2, tint: "text-warning" },
};
const kindOf = (k: string) => KIND[k] ?? { label: k, icon: Clock, tint: "text-muted" };

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/** Checkpoints: every AI run and restore saves one; restoring brings the files back (and saves the current state first). */
export function HistoryPanel({ projectId, canEdit, onRestored }: { projectId: string; canEdit: boolean; onRestored: () => void }) {
  const [items, setItems] = useState<Snapshot[] | null>(null);
  const [confirm, setConfirm] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems((await historyApi.list(projectId)).snapshots);
    } catch {
      setItems([]);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data from the API when the project changes
    void load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      await historyApi.create(projectId, `Checkpoint ${new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`);
      await load();
      toast.success("Checkpoint saved");
    } catch (err) {
      toast.error("Couldn't save a checkpoint", err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const restore = async (s: Snapshot) => {
    setBusy(true);
    try {
      const r = await historyApi.restore(projectId, s.id);
      setConfirm(null);
      onRestored();
      await load();
      toast.success("Restored", `${r.paths.length} file${r.paths.length === 1 ? "" : "s"} changed back to “${s.name}”.`);
    } catch (err) {
      toast.error("Couldn't restore", err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <PanelHeader title="History" sub={items ? `${items.length} checkpoint${items.length === 1 ? "" : "s"} · restore any of them` : "Checkpoints of your files"}>
        {canEdit ? (
          <Button size="sm" onClick={() => void save()} loading={busy && !confirm} title="Save the current files as a checkpoint">
            <Save /> Checkpoint
          </Button>
        ) : null}
      </PanelHeader>
      <div className="scroll min-h-0 flex-1 px-3 py-2">
        {items === null ? (
          <Spinner className="m-4" />
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-border bg-surface text-muted">
              <HistoryIcon className="size-5" />
            </div>
            <p className="mt-4 text-[13.5px] font-medium">No checkpoints yet</p>
            <p className="mx-auto mt-1 max-w-[260px] text-[12.5px] leading-relaxed text-muted">Every AI change saves one automatically. You can also save one yourself before a risky edit.</p>
          </div>
        ) : (
          <ol>
            {items.map((s, i) => {
              const k = kindOf(s.kind);
              const day = dayLabel(s.createdAt);
              const header = i === 0 || day !== dayLabel(items[i - 1].createdAt) ? day : null;
              const current = i === 0;
              return (
                <li key={s.id}>
                  {header ? <p className={cn("px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-dim", i > 0 && "pt-4")}>{header}</p> : null}
                  <div className={cn("group relative flex gap-3 rounded-xl border px-3 py-2.5 transition-colors", current ? "border-border bg-surface/60 card-edge" : "border-transparent hover:border-border hover:bg-surface/40")}>
                    <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card", k.tint)}>
                      <k.icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium">{s.name}</span>
                        {current ? <Badge tone="success">Current</Badge> : null}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] text-muted">
                        {k.label} · {relativeTime(s.createdAt)} · {s.fileCount} files
                      </span>
                      {s.message ? <span className="mt-1 block truncate text-[12px] text-muted">{s.message}</span> : null}
                    </span>
                    {canEdit && !current ? (
                      <Button size="sm" variant="secondary" className="h-7 self-center px-2 text-[12px] opacity-0 group-hover:opacity-100 focus-visible:opacity-100" aria-label={`Restore ${s.name}`} onClick={() => setConfirm(s)}>
                        <RotateCcw className="!size-3.5" /> Restore
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      {items && items.length > 0 ? (
        <p className="border-t border-border px-4 py-2.5 text-[11.5px] leading-relaxed text-dim">Restoring is safe: the current files are saved as a checkpoint first, so you can always undo.</p>
      ) : null}
      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} title="Restore this checkpoint?" description={confirm ? `Your files go back to “${confirm.name}” (${confirm.fileCount} files, ${relativeTime(confirm.createdAt)}). The current state is saved as a checkpoint first, so you can undo this.` : undefined}>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} onClick={() => confirm && void restore(confirm)}>
            <RotateCcw /> Restore
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

export function PanelHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold">{title}</p>
        {sub ? <p className="truncate text-[11.5px] text-muted">{sub}</p> : null}
      </div>
      {children}
    </div>
  );
}
