import type { Template } from "../types";
import { USE_LOCAL_STORAGE, VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";

const files: Record<string, string> = {
  ...viteBase({
    name: "codexa-crm",
    title: "CRM",
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
];

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

export default function App() {
  const store = useContacts();
  const [tab, setTab] = useState<"contacts" | "pipeline">("pipeline");
  const [adding, setAdding] = useState(false);
  const open = store.contacts.filter((c) => c.stage !== "Won" && c.stage !== "Lost");
  const pipelineValue = open.reduce((s, c) => s + c.value, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <h1 className="font-semibold tracking-tight">Pipeline CRM</h1>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-slate-300 p-0.5 text-sm" role="tablist" aria-label="View">
              {(["pipeline", "contacts"] as const).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={"rounded px-3 py-1 capitalize " + (tab === t ? "bg-slate-900 text-white" : "hover:bg-slate-100")}>
                  {t}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setAdding(true)} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
              New contact
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Contacts" value={String(store.contacts.length)} />
          <Stat label="Open deals" value={String(open.length)} />
          <Stat label="Pipeline value" value={"$" + pipelineValue.toLocaleString()} />
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
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
`,
  "src/Pipeline.tsx": `import { STAGES, type Stage, type useContacts } from "./store";

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
        return (
          <section key={stage} aria-labelledby={"stage-" + stage} className="rounded-xl border border-slate-200 bg-white p-3">
            <h2 id={"stage-" + stage} className="flex items-center justify-between text-sm font-medium">
              {stage}
              <span className="rounded-full bg-slate-100 px-2 text-xs text-slate-600">{items.length}</span>
            </h2>
            <ul className="mt-3 space-y-2">
              {items.map((c) => (
                <li key={c.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium">{c.company}</p>
                  <p className="text-slate-600">{c.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{"$" + c.value.toLocaleString()}</p>
                  <div className="mt-2 flex justify-between">
                    <button type="button" onClick={() => move(c.id, -1, c.stage)} disabled={stage === STAGES[0]} className="rounded border border-slate-300 px-2 py-0.5 text-xs disabled:opacity-40" aria-label={"Move " + c.company + " back"}>
                      ←
                    </button>
                    <button type="button" onClick={() => move(c.id, 1, c.stage)} disabled={stage === STAGES[STAGES.length - 1]} className="rounded border border-slate-300 px-2 py-0.5 text-xs disabled:opacity-40" aria-label={"Move " + c.company + " forward"}>
                      →
                    </button>
                  </div>
                </li>
              ))}
              {items.length === 0 ? <li className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">Empty</li> : null}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
`,
  "src/ContactsTable.tsx": `import { useState } from "react";
import { STAGES, type Stage, type useContacts } from "./store";

export function ContactsTable({ store }: { store: ReturnType<typeof useContacts> }) {
  const [q, setQ] = useState("");
  const rows = store.contacts.filter((c) => [c.name, c.company, c.email].some((s) => s.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts" aria-label="Search contacts" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
        <button type="button" onClick={store.reset} className="text-xs text-slate-500 hover:text-slate-900">
          Reset sample data
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Company</th>
              <th className="p-3">Email</th>
              <th className="p-3">Stage</th>
              <th className="p-3">Value</th>
              <th className="p-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">{c.company}</td>
                <td className="p-3 text-slate-600">{c.email}</td>
                <td className="p-3">
                  <select value={c.stage} onChange={(e) => store.update(c.id, { stage: e.target.value as Stage })} aria-label={"Stage for " + c.name} className="rounded border border-slate-300 px-2 py-1">
                    {STAGES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="p-3">{"$" + c.value.toLocaleString()}</td>
                <td className="p-3 text-right">
                  <button type="button" onClick={() => store.remove(c.id)} className="text-xs text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  No contacts found.
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
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-xl bg-white p-5 shadow-xl">
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
          <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">
            Save
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
