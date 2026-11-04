import { useCallback, useEffect, useState } from "react";
import { Clock, History as HistoryIcon, Plus, Rocket, RotateCcw, Save, ShieldCheck, Sparkles, Undo2 } from "lucide-react";
import { ApiError, historyApi, type Snapshot } from "../../lib/api";
import { cn, relativeTime } from "../../lib/util";
import { Badge, Button, Dialog, Tip, toast } from "../../ui";

const KIND: Record<string, { label: string; icon: typeof Save; tint: string }> = {
  manual: { label: "Saved by you", icon: Save, tint: "text-fg" },
  auto: { label: "Auto-saved", icon: Clock, tint: "text-dim" },
  ai: { label: "AI change", icon: Sparkles, tint: "text-fg" },
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

  // Group by calendar day, newest first (the API already returns newest first).
  const days: { label: string; items: { s: Snapshot; index: number }[] }[] = [];
  (items ?? []).forEach((snap, index) => {
    const label = dayLabel(snap.createdAt);
    const last = days.at(-1);
    if (last?.label === label) last.items.push({ s: snap, index });
    else days.push({ label, items: [{ s: snap, index }] });
  });

  return (
    <div className="flex h-full flex-col bg-card">
      <PanelHeader title="History" sub={items ? `${items.length} checkpoint${items.length === 1 ? "" : "s"} · restore any of them` : "Checkpoints of your files"}>
        {canEdit ? (
          <Tip label="Save the current files as a checkpoint" align="end">
            <Button size="xs" onClick={() => void save()} loading={busy && !confirm}>
              {busy && !confirm ? null : <Plus className="!size-3.5" />} Checkpoint
            </Button>
          </Tip>
        ) : null}
      </PanelHeader>
      <div className="scroll min-h-0 flex-1">
        {items === null ? (
          <div className="space-y-4 px-4 py-4" aria-label="Loading history">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="pulse size-6 rounded-full bg-surface" />
                <span className="flex-1 space-y-1.5">
                  <span className="pulse block h-3 w-2/3 rounded-sm bg-surface" />
                  <span className="pulse block h-2.5 w-1/3 rounded-sm bg-surface" />
                </span>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-lg border border-border bg-panel text-dim">
              <HistoryIcon className="size-5" />
            </div>
            <p className="mt-4 text-[14px] font-semibold tracking-[-0.01em]">No checkpoints yet</p>
            <p className="mx-auto mt-1 max-w-[260px] text-[12.5px] leading-relaxed text-muted">Every AI change saves one automatically. You can also save one yourself before a risky edit.</p>
          </div>
        ) : (
          days.map((d) => (
            <section key={d.label} aria-label={d.label}>
              <h3 className="ws-label sticky top-0 z-[1] flex items-center gap-2 border-b border-border bg-card/95 px-4 py-2 backdrop-blur-sm">
                {d.label}
                <span className="text-dim/70">· {d.items.length}</span>
              </h3>
              <ol className="ws-timeline py-1.5">
                {d.items.map(({ s, index }) => {
                  const k = kindOf(s.kind);
                  const current = index === 0;
                  return (
                    <li key={s.id} className="group relative flex items-start gap-3 py-2 pl-3 pr-3 transition-colors hover:bg-panel dark:hover:bg-surface/50">
                      <span className={cn("relative z-[1] mt-px flex size-[22px] shrink-0 items-center justify-center rounded-full border bg-card", current ? "border-fg text-fg" : "border-border-strong", !current && k.tint)} aria-hidden="true">
                        <k.icon className="size-3" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-medium leading-snug">{s.name}</span>
                          {current ? <Badge tone="accent">Current</Badge> : null}
                        </span>
                        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[11.5px] text-muted">
                          <span className="truncate">{k.label}</span>
                          <span className="text-dim">·</span>
                          <time dateTime={s.createdAt} title={new Date(s.createdAt).toLocaleString()} className="mono text-[10.5px] text-dim">
                            {new Date(s.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          </time>
                          <span className="text-dim">·</span>
                          <span className="mono text-[10.5px] text-dim">{s.fileCount} files</span>
                        </span>
                        {s.message ? <span className="mt-1 block truncate text-[12px] text-muted">{s.message}</span> : null}
                      </span>
                      {canEdit && !current ? (
                        <Button size="xs" variant="secondary" className="shrink-0 self-center opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100" aria-label={`Restore ${s.name}`} onClick={() => setConfirm(s)}>
                          <RotateCcw className="!size-3.5" /> Restore
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))
        )}
      </div>
      {items && items.length > 0 ? (
        <p className="flex items-start gap-2 border-t border-border px-4 py-2.5 text-[11.5px] leading-relaxed text-dim">
          <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden="true" /> Restoring is safe: the current files are saved as a checkpoint first, so you can always undo.
        </p>
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
    <div className="ws-bar pl-4 pr-2">
      <div className="min-w-0 flex-1">
        <h2 className="text-[13px] font-semibold leading-tight">{title}</h2>
        {sub ? <p className="truncate text-[11px] leading-tight text-dim">{sub}</p> : null}
      </div>
      {children}
    </div>
  );
}
