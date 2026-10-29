import { useCallback, useEffect, useState } from "react";
import { History as HistoryIcon, RotateCcw, Save } from "lucide-react";
import { ApiError, historyApi, type Snapshot } from "../../lib/api";
import { relativeTime } from "../../lib/util";
import { Badge, Button, Dialog, Spinner, toast } from "../../ui";

const KIND: Record<string, string> = { manual: "Saved", auto: "Auto-saved", ai: "AI change", deploy: "Published", restore: "Before restore" };

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
      <PanelHeader title="History" sub="Checkpoints of your files">
        {canEdit ? (
          <Button size="sm" onClick={() => void save()} loading={busy && !confirm}>
            <Save /> Save
          </Button>
        ) : null}
      </PanelHeader>
      <div className="scroll min-h-0 flex-1 p-2">
        {items === null ? (
          <Spinner className="m-4" />
        ) : items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <HistoryIcon className="mx-auto size-5 text-dim" />
            <p className="mt-3 text-[13px] font-medium">No checkpoints yet</p>
            <p className="mt-1 text-[12.5px] text-muted">Each AI change saves one automatically.</p>
          </div>
        ) : (
          <ol className="relative">
            {items.map((s, i) => (
              <li key={s.id} className="group relative flex gap-3 rounded-lg px-2.5 py-2.5 hover:bg-surface">
                <span className="relative flex w-3 justify-center pt-1.5">
                  <span className={i === 0 ? "size-2 rounded-full bg-accent" : "size-2 rounded-full border border-border-strong bg-card"} />
                  {i < items.length - 1 ? <span className="absolute top-4 h-[calc(100%+4px)] w-px bg-border" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{s.name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
                    <Badge className="h-4 px-1 text-[10px]">{KIND[s.kind] ?? s.kind}</Badge>
                    {relativeTime(s.createdAt)} · {s.fileCount} files
                  </span>
                </span>
                {canEdit && i > 0 ? (
                  <Button size="icon-sm" variant="ghost" aria-label={`Restore ${s.name}`} title="Restore" className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={() => setConfirm(s)}>
                    <RotateCcw />
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} title="Restore this checkpoint?" description={confirm ? `Your files go back to “${confirm.name}”. The current state is saved as a checkpoint first, so you can undo this.` : undefined}>
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
