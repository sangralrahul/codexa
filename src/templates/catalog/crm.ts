import type { Template } from "../types";
import { USE_LOCAL_STORAGE, VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";

const files: Record<string, string> = {
  ...viteBase({
    name: "codexa-crm",
    title: "Pipeline CRM",
    readme: `# CRM starter

Contacts table and a deal pipeline board. Data lives in localStorage so the UI is fully interactive without a backend.
Replace \`src/store.ts\` with calls to your API when you add one.

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  }),
  "src/useLocalStorage.ts": USE_LOCAL_STORAGE,
  "src/store.ts": `import { useLocalStorage } from "./useLocalStorage";

export const STAGES = ["Lead", "Qualified", "Proposal", "Won", "Lost"] as const;
export type Stage = (typeof STAGES)[number];

export type Contact = { id: string; name: string; company: string; email: string; stage: Stage; value: number; note: string };

const seed: Contact[] = [
  { id: "c1", name: "Meera Iyer", company: "Harbor Labs", email: "meera@harborlabs.example", stage: "Lead", value: 4000, note: "Met at the Bengaluru meetup." },
  { id: "c2", name: "Daniel Okafor", company: "Lumen Retail", email: "daniel@lumen.example", stage: "Qualified", value: 12000, note: "Needs SSO before Q3." },
  { id: "c3", name: "Sofia Rossi", company: "Quartz Studio", email: "sofia@quartz.example", stage: "Proposal", value: 7500, note: "Proposal sent 12 May." },
  { id: "c4", name: "Arjun Mehta", company: "Nimbus", email: "arjun@nimbus.example", stage: "Won", value: 9800, note: "Annual plan." },
  { id: "c5", name: "Hana Sato", company: "Kite Logistics", email: "hana@kite.example", stage: "Lead", value: 6200, note: "Inbound from the pricing page." },
  { id: "c6", name: "Lucas Martin", company: "Brightside", email: "lucas@brightside.example", stage: "Qualified", value: 18500, note: "Evaluating two vendors." },
  { id: "c7", name: "Zara Khan", company: "Pine & Co", email: "zara@pine.example", stage: "Proposal", value: 5400, note: "Wants a pilot first." },
  { id: "c8", name: "Omar Haddad", company: "Atlas Health", email: "omar@atlas.example", stage: "Won", value: 22000, note: "Two-year contract." },
  { id: "c9", name: "Elena Petrova", company: "Northbeam", email: "elena@northbeam.example", stage: "Lost", value: 3000, note: "Chose an in-house tool." },
];

/** Colour per stage, used by the board and the table. */
export const STAGE_TONE: Record<Stage, { dot: string; badge: string }> = {
  Lead: { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-700" },
  Qualified: { dot: "bg-sky-500", badge: "bg-sky-50 text-sky-700" },
  Proposal: { dot: "bg-sky-500", badge: "bg-sky-50 text-sky-700" },
  Won: { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
  Lost: { dot: "bg-rose-400", badge: "bg-rose-50 text-rose-700" },
};

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function useContacts() {
  const [contacts, setContacts] = useLocalStorage<Contact[]>("crm-contacts", seed);
  const add = (c: Omit<Contact, "id">) => setContacts((prev) => [...prev, { ...c, id: "c" + Date.now().toString(36) }]);
  const update = (id: string, patch: Partial<Contact>) => setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (id: string) => setContacts((prev) => prev.filter((c) => c.id !== id));
  const reset = () => setContacts(seed);
  return { contacts, add, update, remove, reset };
}
`,
  "src/App.tsx": `import { useState } from "react";
import { useContacts } from "./store";
import { ContactsTable } from "./ContactsTable";
import { Pipeline } from "./Pipeline";
import { ContactForm } from "./ContactForm";

const money = (n: number) => "$" + n.toLocaleString();

const nav = [
  { label: "Pipeline", d: "M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v6h-4z" },
  { label: "Contacts", d: "M16 19v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M10 10a3 3 0 100-6 3 3 0 000 6zM20 19v-1a3 3 0 00-2-2.8" },
  { label: "Reports", d: "M4 19h16M7 15v-4M12 15V7M17 15v-6" },
];

export default function App() {
  const store = useContacts();
  const [tab, setTab] = useState<"contacts" | "pipeline">("pipeline");
  const [adding, setAdding] = useState(false);
  const open = store.contacts.filter((c) => c.stage !== "Won" && c.stage !== "Lost");
  const pipelineValue = open.reduce((s, c) => s + c.value, 0);
  const won = store.contacts.filter((c) => c.stage === "Won").reduce((s, c) => s + c.value, 0);
  const closed = store.contacts.filter((c) => c.stage === "Won" || c.stage === "Lost").length;
  const winRate = closed ? Math.round((store.contacts.filter((c) => c.stage === "Won").length / closed) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white px-3 py-5 lg:block">
        <div className="flex items-center gap-2.5 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 text-sm font-bold text-white">P</span>
          <span className="font-semibold tracking-tight">Pipeline CRM</span>
        </div>
        <nav className="mt-8 space-y-0.5 text-sm" aria-label="Sections">
          {nav.map((n) => {
            const current = n.label.toLowerCase() === tab;
            return (
              <button
                key={n.label}
                type="button"
                onClick={() => (n.label === "Reports" ? undefined : setTab(n.label.toLowerCase() as "contacts" | "pipeline"))}
                className={"flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left " + (current ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50")}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={n.d} />
                </svg>
                {n.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="border-b border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
            <div>
              <p className="text-xs text-slate-500">Sales · Q2</p>
              <h1 className="text-xl font-semibold tracking-tight">Deals</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-sm" role="tablist" aria-label="View">
                {(["pipeline", "contacts"] as const).map((t) => (
                  <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={"rounded-md px-3 py-1.5 capitalize transition " + (tab === t ? "bg-white font-medium shadow-sm" : "text-slate-500 hover:text-slate-900")}>
                    {t}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setAdding(true)} className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700">
                + New contact
              </button>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Contacts" value={String(store.contacts.length)} hint="All stages" />
            <Stat label="Open deals" value={String(open.length)} hint="Lead to proposal" />
            <Stat label="Pipeline value" value={money(pipelineValue)} hint="Open deals only" />
            <Stat label="Won" value={money(won)} hint={winRate + "% win rate"} />
          </div>
          <div className="mt-6">{tab === "pipeline" ? <Pipeline store={store} /> : <ContactsTable store={store} />}</div>
          {adding ? (
            <ContactForm
              onCancel={() => setAdding(false)}
              onSave={(c) => {
                store.add(c);
                setAdding(false);
              }}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}
`,
  "src/Pipeline.tsx": `import { STAGES, STAGE_TONE, initials, type Stage, type useContacts } from "./store";

const money = (n: number) => "$" + n.toLocaleString();

export function Pipeline({ store }: { store: ReturnType<typeof useContacts> }) {
  const move = (id: string, dir: -1 | 1, current: Stage) => {
    const i = STAGES.indexOf(current);
    const next = STAGES[i + dir];
    if (next) store.update(id, { stage: next });
  };
  return (
    <div className="grid gap-3 md:grid-cols-5">
      {STAGES.map((stage) => {
        const items = store.contacts.filter((c) => c.stage === stage);
        const total = items.reduce((s, c) => s + c.value, 0);
        return (
          <section key={stage} aria-labelledby={"stage-" + stage} className="rounded-2xl border border-slate-200 bg-slate-100/60 p-2.5">
            <h2 id={"stage-" + stage} className="flex items-center justify-between px-1.5 pb-1 pt-1 text-sm font-medium">
              <span className="flex items-center gap-2">
                <span className={"h-2 w-2 rounded-full " + STAGE_TONE[stage].dot} />
                {stage}
                <span className="rounded-full bg-white px-1.5 text-xs text-slate-500 shadow-sm">{items.length}</span>
              </span>
              <span className="text-xs font-normal text-slate-500">{money(total)}</span>
            </h2>
            <ul className="mt-2 space-y-2">
              {items.map((c) => (
                <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-snug">{c.company}</p>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-100 to-sky-100 text-[10px] font-semibold text-slate-700">{initials(c.name)}</span>
                  </div>
                  <p className="text-xs text-slate-500">{c.name}</p>
                  {c.note ? <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{c.note}</p> : null}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium tabular-nums text-slate-700">{money(c.value)}</span>
                    <span className="flex gap-1">
                      <button type="button" onClick={() => move(c.id, -1, c.stage)} disabled={stage === STAGES[0]} className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 text-xs hover:bg-slate-50 disabled:opacity-30" aria-label={"Move " + c.company + " back"}>
                        ←
                      </button>
                      <button type="button" onClick={() => move(c.id, 1, c.stage)} disabled={stage === STAGES[STAGES.length - 1]} className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 text-xs hover:bg-slate-50 disabled:opacity-30" aria-label={"Move " + c.company + " forward"}>
                        →
                      </button>
                    </span>
                  </div>
                </li>
              ))}
              {items.length === 0 ? <li className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">No deals here yet</li> : null}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
`,
  "src/ContactsTable.tsx": `import { useState } from "react";
import { STAGES, STAGE_TONE, initials, type Stage, type useContacts } from "./store";

export function ContactsTable({ store }: { store: ReturnType<typeof useContacts> }) {
  const [q, setQ] = useState("");
  const rows = store.contacts.filter((c) => [c.name, c.company, c.email].some((s) => s.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts" aria-label="Search contacts" className="w-64 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-sky-400 focus:bg-white" />
        <button type="button" onClick={store.reset} className="text-xs text-slate-500 hover:text-slate-900">
          Reset sample data
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 text-right font-medium">Value</th>
              <th className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3 font-medium">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sky-100 to-sky-100 text-xs font-semibold text-slate-700">{initials(c.name)}</span>
                    {c.name}
                  </span>
                </td>
                <td className="px-4 py-3">{c.company}</td>
                <td className="px-4 py-3 text-slate-500">{c.email}</td>
                <td className="px-4 py-3">
                  <select value={c.stage} onChange={(e) => store.update(c.id, { stage: e.target.value as Stage })} aria-label={"Stage for " + c.name} className={"rounded-md border-0 px-2 py-1 text-xs font-medium " + STAGE_TONE[c.stage].badge}>
                    {STAGES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{"$" + c.value.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => store.remove(c.id)} className="text-xs text-rose-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-slate-500">
                  No contacts match “{q}”.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`,
  "src/ContactForm.tsx": `import { useState, type FormEvent } from "react";
import { STAGES, type Contact, type Stage } from "./store";

export function ContactForm({ onSave, onCancel }: { onSave: (c: Omit<Contact, "id">) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Omit<Contact, "id">>({ name: "", company: "", email: "", stage: "Lead", value: 0, note: "" });
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.company.trim()) return setError("Name and company are required.");
    if (!form.email.includes("@")) return setError("Enter a valid email.");
    onSave({ ...form, name: form.name.trim(), company: form.company.trim() });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="contact-form-title">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="contact-form-title" className="text-lg font-semibold">
          New contact
        </h2>
        <label className="block text-sm">
          <span>Name</span>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" autoFocus />
        </label>
        <label className="block text-sm">
          <span>Company</span>
          <input value={form.company} onChange={(e) => set("company", e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span>Email</span>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span>Stage</span>
            <select value={form.stage} onChange={(e) => set("stage", e.target.value as Stage)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span>Value ($)</span>
            <input type="number" min={0} value={form.value} onChange={(e) => set("value", Number(e.target.value))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </label>
        </div>
        <label className="block text-sm">
          <span>Note</span>
          <textarea value={form.note} onChange={(e) => set("note", e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Save contact
          </button>
        </div>
      </form>
    </div>
  );
}
`,
};

export const crmTemplate: Template = {
  id: "vite-react-crm",
  name: "CRM pipeline",
  description: "Contacts table plus a five-stage deal pipeline board with inline stage changes, all persisted locally.",
  longDescription:
    "A small CRM with two views over the same data: a searchable contacts table with stage selects and delete, and a kanban-style pipeline (Lead → Qualified → Proposal → Won/Lost) where deals move between columns with keyboard-accessible buttons. State lives in localStorage via a typed hook so the app works offline; swap src/store.ts for API calls when you add a backend.",
  category: "crm",
  tags: ["react", "crm", "pipeline", "kanban", "tailwind"],
  framework: "vite-react",
  dependencies: VITE_DEPS,
  settings: VITE_SETTINGS,
  prebuilt: true,
  difficulty: "intermediate",
  previewPath: "/",
  files,
};
