import { useEffect, useMemo, useState, type FormEvent } from "react";
import { app } from "./app";
import { Icon } from "../../shared/Icon";
import type { Field, Row, Tone, Value } from "./types";

const TONE: Record<Tone, string> = {
  good: "bg-good/10 text-good ring-good/25",
  warn: "bg-warn/10 text-warn ring-warn/25",
  bad: "bg-bad/10 text-bad ring-bad/25",
  neutral: "bg-surface text-muted ring-line",
  accent: "bg-accent/10 text-accent ring-accent/25",
};

const statusField = app.fields.find((f) => f.key === app.statusKey)!;
const statuses = statusField.options ?? [];
const seedRows = (): Row[] => app.seed.map((r, i) => ({ ...r, id: `seed-${i + 1}` }));

function load(): Row[] {
  try {
    const raw = localStorage.getItem(app.storageKey);
    if (raw) return JSON.parse(raw) as Row[];
  } catch {
    /* storage blocked: fall back to sample data */
  }
  return seedRows();
}

function money(n: number) {
  return `${app.currency ?? "$"}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function show(f: Field, v: Value | undefined) {
  if (v === undefined || v === "") return "—";
  if (f.type === "money") return money(Number(v));
  if (f.type === "date") {
    const d = new Date(`${v}T00:00:00`);
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }
  if (f.type === "number") return Number(v).toLocaleString();
  return String(v);
}

function Pill({ value }: { value: string }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE[app.tones[value] ?? "neutral"]}`}>{value}</span>;
}

function Editor({ row, onSave, onClose }: { row: Row | null; onSave: (r: Row) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Record<string, Value>>(() => row ?? Object.fromEntries(app.fields.map((f) => [f.key, f.type === "select" ? (f.options?.[0] ?? "") : ""])));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = Object.fromEntries(app.fields.map((f) => [f.key, f.type === "number" || f.type === "money" ? Number(draft[f.key] || 0) : String(draft[f.key] ?? "").trim()]));
    onSave({ ...clean, id: row?.id ?? crypto.randomUUID() });
  };
  const input = "mt-1.5 block w-full rounded-card border border-line bg-bg px-3 text-[15px] outline-none focus:border-accent";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-labelledby="editor-title" onSubmit={submit} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-card border border-line bg-bg p-6 shadow-2xl">
        <h2 id="editor-title" className="font-heading text-xl font-semibold">
          {row ? `Edit ${app.entity.singular.toLowerCase()}` : `New ${app.entity.singular.toLowerCase()}`}
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {app.fields.map((f, i) => (
            <label key={f.key} className={`text-sm font-medium ${f.type === "longtext" || i === 0 ? "sm:col-span-2" : ""}`}>
              {f.label}
              {f.type === "select" ? (
                <select value={String(draft[f.key] ?? "")} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} className={`${input} h-11`}>
                  {f.options?.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : f.type === "longtext" ? (
                <textarea value={String(draft[f.key] ?? "")} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} rows={3} className={`${input} py-2.5`} />
              ) : (
                <input
                  autoFocus={i === 0}
                  required={f.required}
                  type={f.type === "money" || f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : "text"}
                  step={f.type === "money" ? "0.01" : undefined}
                  min={f.type === "money" ? 0 : undefined}
                  value={String(draft[f.key] ?? "")}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  className={`${input} h-11`}
                />
              )}
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-card border border-line px-4 font-medium hover:bg-surface">
            Cancel
          </button>
          <button type="submit" className="h-10 rounded-card bg-accent px-4 font-medium text-accent-fg hover:opacity-90">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [rows, setRows] = useState<Row[]>(load);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [view, setView] = useState(app.views[0]);
  const [editing, setEditing] = useState<Row | "new" | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(app.storageKey, JSON.stringify(rows));
    } catch {
      /* storage blocked: changes last for this visit only */
    }
  }, [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (filter === "All" || r[app.statusKey] === filter) && (!q || Object.values(r).some((v) => String(v).toLowerCase().includes(q))));
  }, [rows, query, filter]);

  const columns = app.fields.filter((f) => !f.hideInTable);
  const save = (r: Row) => {
    setRows((list) => (list.some((x) => x.id === r.id) ? list.map((x) => (x.id === r.id ? r : x)) : [r, ...list]));
    setEditing(null);
  };
  const remove = (r: Row) => {
    if (confirm(`Delete "${r[app.titleKey]}"?`)) setRows((list) => list.filter((x) => x.id !== r.id));
  };
  const move = (r: Row, status: string) => setRows((list) => list.map((x) => (x.id === r.id ? { ...x, [app.statusKey]: status } : x)));

  return (
    <div className="min-h-screen bg-surface font-body text-fg antialiased">
      <header className="border-b border-line bg-bg">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-5 sm:px-8">
          <span className="grid h-9 w-9 place-items-center rounded-card bg-accent text-accent-fg">
            <Icon name={app.icon} className="h-5 w-5" />
          </span>
          <span className="font-heading text-lg font-semibold">{app.brand}</span>
          <button type="button" onClick={() => confirm("Replace your changes with the sample data?") && setRows(seedRows())} className="ml-auto text-sm text-muted hover:text-fg">
            Reset sample data
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-5 py-8 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{app.title}</h1>
            <p className="mt-1 text-muted">{app.subtitle}</p>
          </div>
          <button type="button" onClick={() => setEditing("new")} className="inline-flex h-10 items-center gap-2 rounded-card bg-accent px-4 font-medium text-accent-fg hover:opacity-90">
            <span aria-hidden="true" className="text-lg leading-none">
              +
            </span>
            New {app.entity.singular.toLowerCase()}
          </button>
        </div>

        <section aria-label="Summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {app.summary.map((s) => {
            const subset = s.status ? rows.filter((r) => r[app.statusKey] === s.status) : rows;
            const field = app.fields.find((f) => f.key === s.field);
            const value = s.kind === "count" ? subset.length.toLocaleString() : (() => {
              const total = subset.reduce((n, r) => n + Number(r[s.field ?? ""] ?? 0), 0);
              return field?.type === "money" ? money(total) : total.toLocaleString();
            })();
            return (
              <div key={s.label} className="rounded-card border border-line bg-bg p-5">
                <p className="text-sm text-muted">{s.label}</p>
                <p className="mt-2 font-heading text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
              </div>
            );
          })}
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <label className="min-w-0 flex-1 sm:max-w-xs">
            <span className="sr-only">Search {app.entity.plural.toLowerCase()}</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${app.entity.plural.toLowerCase()}`} className="h-10 w-full rounded-card border border-line bg-bg px-3.5 text-[15px] outline-none placeholder:text-muted focus:border-accent" />
          </label>
          <label>
            <span className="sr-only">Filter by {statusField.label.toLowerCase()}</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-10 rounded-card border border-line bg-bg px-3 text-[15px] outline-none focus:border-accent">
              <option>All</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          {app.views.length > 1 ? (
            <div className="ml-auto flex rounded-card border border-line bg-bg p-1" role="group" aria-label="View">
              {app.views.map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`h-8 rounded-[calc(var(--radius-card)-2px)] px-3 text-sm font-medium capitalize ${view === v ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}>
                  {v}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {view === "table" ? (
          <div className="overflow-hidden rounded-card border border-line bg-bg">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[15px]">
                <thead className="border-b border-line text-sm text-muted">
                  <tr>
                    {columns.map((c) => (
                      <th key={c.key} scope="col" className={`px-5 py-3 font-medium ${c.type === "money" || c.type === "number" ? "text-right" : ""}`}>
                        {c.label}
                      </th>
                    ))}
                    <th scope="col" className="px-5 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shown.map((r) => (
                    <tr key={r.id} className="group hover:bg-surface/60">
                      {columns.map((c) => (
                        <td key={c.key} className={`px-5 py-3.5 ${c.key === app.titleKey ? "font-medium" : "text-muted"} ${c.type === "money" || c.type === "number" ? "text-right tabular-nums" : ""}`}>
                          {c.key === app.statusKey ? <Pill value={String(r[c.key])} /> : show(c, r[c.key])}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-5 py-3.5 text-right text-sm">
                        <button type="button" onClick={() => setEditing(r)} className="rounded px-2 py-1 font-medium text-accent hover:underline">
                          Edit
                        </button>
                        <button type="button" onClick={() => remove(r)} className="rounded px-2 py-1 text-muted hover:text-bad">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {shown.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="font-medium">No {app.entity.plural.toLowerCase()} found</p>
                <p className="mt-1 text-sm text-muted">{rows.length ? "Try a different search or filter." : `Add your first ${app.entity.singular.toLowerCase()} to get started.`}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${statuses.length}, minmax(240px, 1fr))` }}>
            {statuses.map((s) => {
              const items = shown.filter((r) => r[app.statusKey] === s);
              return (
                <section key={s} aria-label={s} className="rounded-card border border-line bg-bg/60 p-3">
                  <h2 className="flex items-center justify-between px-1 pb-3 text-sm font-semibold">
                    <Pill value={s} />
                    <span className="tabular-nums text-muted">{items.length}</span>
                  </h2>
                  <ul className="space-y-2.5">
                    {items.map((r) => (
                      <li key={r.id} className="rounded-card border border-line bg-bg p-3.5 shadow-sm">
                        <button type="button" onClick={() => setEditing(r)} className="text-left font-medium hover:underline">
                          {String(r[app.titleKey])}
                        </button>
                        <dl className="mt-2 space-y-1 text-sm text-muted">
                          {columns
                            .filter((c) => c.key !== app.titleKey && c.key !== app.statusKey)
                            .slice(0, 2)
                            .map((c) => (
                              <div key={c.key} className="flex justify-between gap-2">
                                <dt>{c.label}</dt>
                                <dd className="truncate text-fg tabular-nums">{show(c, r[c.key])}</dd>
                              </div>
                            ))}
                        </dl>
                        <label className="mt-3 block">
                          <span className="sr-only">Move {String(r[app.titleKey])}</span>
                          <select value={s} onChange={(e) => move(r, e.target.value)} className="h-8 w-full rounded-card border border-line bg-surface px-2 text-sm">
                            {statuses.map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </select>
                        </label>
                      </li>
                    ))}
                    {items.length === 0 ? <li className="rounded-card border border-dashed border-line px-3 py-6 text-center text-sm text-muted">Empty</li> : null}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
        <p className="text-center text-sm text-muted">Saved in this browser (localStorage). Connect a database to share it with your team.</p>
      </main>

      {editing ? <Editor row={editing === "new" ? null : editing} onSave={save} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
