import type { Template } from "../types";
import { USE_LOCAL_STORAGE, VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";

const files: Record<string, string> = {
  ...viteBase({
    name: "codexa-admin",
    title: "Admin · Members",
    readme: `# Admin panel starter

A CRUD table with create / edit / delete forms, validation, sorting and pagination. Records are kept in localStorage;
replace \`src/api.ts\` with real HTTP calls.

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  }),
  "src/useLocalStorage.ts": USE_LOCAL_STORAGE,
  "src/api.ts": `import { useLocalStorage } from "./useLocalStorage";

export type Role = "admin" | "editor" | "viewer";
export type Member = { id: string; name: string; email: string; role: Role; active: boolean; createdAt: string };

const seed: Member[] = [
  { id: "m1", name: "Ananya Rao", email: "ananya@example.com", role: "admin", active: true, createdAt: "2026-01-12" },
  { id: "m2", name: "Ben Carter", email: "ben@example.com", role: "editor", active: true, createdAt: "2026-02-03" },
  { id: "m3", name: "Chloé Martin", email: "chloe@example.com", role: "viewer", active: false, createdAt: "2026-02-20" },
  { id: "m4", name: "Dev Patel", email: "dev@example.com", role: "editor", active: true, createdAt: "2026-03-08" },
  { id: "m5", name: "Elif Yilmaz", email: "elif@example.com", role: "viewer", active: true, createdAt: "2026-03-15" },
  { id: "m6", name: "Farid Haddad", email: "farid@example.com", role: "editor", active: true, createdAt: "2026-04-01" },
  { id: "m7", name: "Grace Kim", email: "grace@example.com", role: "admin", active: true, createdAt: "2026-04-09" },
  { id: "m8", name: "Hiro Tanaka", email: "hiro@example.com", role: "viewer", active: false, createdAt: "2026-04-17" },
  { id: "m9", name: "Isabel Costa", email: "isabel@example.com", role: "editor", active: true, createdAt: "2026-04-22" },
];

/** Local "API". Each function mirrors the HTTP call you would make: GET/POST/PATCH/DELETE /members. */
export function useMembers() {
  const [members, setMembers] = useLocalStorage<Member[]>("admin-members", seed);
  return {
    members,
    create: (m: Omit<Member, "id" | "createdAt">) => setMembers((p) => [...p, { ...m, id: "m" + Date.now().toString(36), createdAt: new Date().toISOString().slice(0, 10) }]),
    update: (id: string, patch: Partial<Member>) => setMembers((p) => p.map((m) => (m.id === id ? { ...m, ...patch } : m))),
    remove: (id: string) => setMembers((p) => p.filter((m) => m.id !== id)),
  };
}

export function validateMember(input: { name: string; email: string }) {
  const errors: Partial<Record<"name" | "email", string>> = {};
  if (input.name.trim().length < 2) errors.name = "Name must be at least 2 characters.";
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(input.email)) errors.email = "Enter a valid email address.";
  return errors;
}
`,
  "src/App.tsx": `import { useMemo, useState } from "react";
import { useMembers, type Member, type Role } from "./api";
import { MemberForm } from "./MemberForm";

type SortKey = "name" | "email" | "role" | "createdAt";
const PAGE_SIZE = 6;

const roleTone: Record<Role, string> = { admin: "bg-blue-50 text-blue-700 ring-blue-200", editor: "bg-sky-50 text-sky-700 ring-sky-200", viewer: "bg-slate-50 text-slate-600 ring-slate-200" };
const avatarTone = ["from-rose-400 to-orange-300", "from-sky-400 to-blue-400", "from-emerald-400 to-teal-300", "from-blue-400 to-blue-300", "from-amber-400 to-yellow-300"];

const nav = [
  { label: "Members", d: "M16 19v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M10 10a3 3 0 100-6 3 3 0 000 6zM20 19v-1a3 3 0 00-2-2.8M16 4.2a3 3 0 010 5.6", current: true },
  { label: "Roles", d: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" },
  { label: "Audit log", d: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" },
  { label: "Settings", d: "M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M10 16v4" },
];

export default function App() {
  const api = useMembers();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Member | "new" | null>(null);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    const filtered = api.members.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
    return filtered.sort((a, b) => a[sort.key].localeCompare(b[sort.key]) * sort.dir);
  }, [api.members, query, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const stats = [
    ["Members", api.members.length],
    ["Active", api.members.filter((m) => m.active).length],
    ["Admins", api.members.filter((m) => m.role === "admin").length],
    ["Editors", api.members.filter((m) => m.role === "editor").length],
  ] as const;

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 md:grid md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col bg-slate-950 p-4 text-slate-300">
        <div className="flex items-center gap-2.5 px-2 py-1">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-sm font-bold text-slate-950">A</span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Admin</p>
            <p className="text-xs text-slate-500">acme-workspace</p>
          </div>
        </div>
        <nav className="mt-8 space-y-0.5 text-sm" aria-label="Sections">
          {nav.map((n) => (
            <span key={n.label} aria-current={n.current ? "page" : undefined} className={"flex items-center gap-3 rounded-lg px-3 py-2 " + (n.current ? "bg-white/10 font-medium text-white" : "text-slate-400")}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={n.d} />
              </svg>
              {n.label}
            </span>
          ))}
        </nav>
        <p className="mt-auto hidden rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-slate-400 md:block">Roles, Audit log and Settings are placeholders. Ask Codexa to add the pages you need.</p>
      </aside>
      <main className="min-w-0 p-4 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Workspace / Members</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Members</h1>
          </div>
          <button type="button" onClick={() => setEditing("new")} className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700">
            + Add member
          </button>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div className="relative">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name or email"
                aria-label="Search members"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:bg-white sm:w-80"
              />
            </div>
            <span className="text-xs text-slate-500">Click a status to toggle it</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50/70 text-left text-xs text-slate-500">
                <tr>
                  {(["name", "email", "role", "createdAt"] as SortKey[]).map((k) => (
                    <th key={k} className="px-4 py-3">
                      <button type="button" onClick={() => toggleSort(k)} className="font-medium hover:text-slate-900" aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                        {k === "createdAt" ? "Created" : k[0].toUpperCase() + k.slice(1)}
                        {sort.key === k ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((m, i) => (
                  <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3 font-medium">
                        <span className={"grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br text-xs font-semibold text-white " + avatarTone[i % avatarTone.length]}>{m.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</span>
                        {m.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{m.email}</td>
                    <td className="px-4 py-3">
                      <span className={"rounded-md px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset " + roleTone[m.role]}>{m.role}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-500">{m.createdAt}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => api.update(m.id, { active: !m.active })} className={"inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium " + (m.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")} aria-label={(m.active ? "Deactivate " : "Activate ") + m.name}>
                        <span className={"h-1.5 w-1.5 rounded-full " + (m.active ? "bg-emerald-500" : "bg-slate-400")} />
                        {m.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => setEditing(m)} className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Delete " + m.name + "?")) api.remove(m.id);
                        }}
                        className="ml-1 rounded-md px-2 py-1 text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-500">
                      No members match “{query}”.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <nav className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm" aria-label="Pagination">
            <span className="text-slate-500">
              {rows.length} member{rows.length === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40">
                Previous
              </button>
              <span className="tabular-nums text-slate-600">
                Page {current} of {pages}
              </span>
              <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40">
                Next
              </button>
            </div>
          </nav>
        </div>
        {editing ? (
          <MemberForm
            initial={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSave={(values) => {
              if (editing === "new") api.create(values);
              else api.update(editing.id, values);
              setEditing(null);
            }}
          />
        ) : null}
      </main>
    </div>
  );
}
`,
  "src/MemberForm.tsx": `import { useState, type FormEvent } from "react";
import { validateMember, type Member, type Role } from "./api";

type Values = Omit<Member, "id" | "createdAt">;

export function MemberForm({ initial, onSave, onCancel }: { initial: Member | null; onSave: (v: Values) => void; onCancel: () => void }) {
  const [values, setValues] = useState<Values>(initial ?? { name: "", email: "", role: "viewer", active: true });
  const [errors, setErrors] = useState<Partial<Record<"name" | "email", string>>>({});

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs = validateMember(values);
    setErrors(errs);
    if (Object.keys(errs).length === 0) onSave({ ...values, name: values.name.trim() });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="member-form-title">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 shadow-2xl" noValidate>
        <h2 id="member-form-title" className="text-lg font-semibold">
          {initial ? "Edit member" : "Add member"}
        </h2>
        <label className="block text-sm">
          <span>Name</span>
          <input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" autoFocus />
          {errors.name ? (
            <span id="name-error" className="text-xs text-red-600">
              {errors.name}
            </span>
          ) : null}
        </label>
        <label className="block text-sm">
          <span>Email</span>
          <input type="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          {errors.email ? (
            <span id="email-error" className="text-xs text-red-600">
              {errors.email}
            </span>
          ) : null}
        </label>
        <label className="block text-sm">
          <span>Role</span>
          <select value={values.role} onChange={(e) => setValues({ ...values, role: e.target.value as Role })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={values.active} onChange={(e) => setValues({ ...values, active: e.target.checked })} />
          Active
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
`,
};

export const adminTemplate: Template = {
  id: "vite-react-admin",
  name: "Admin panel",
  description: "A CRUD members table with search, sortable columns, pagination, and validated create/edit forms.",
  longDescription:
    "An admin layout with a sidebar and a members resource: searchable, sortable, paginated table; create and edit dialogs with field-level validation and ARIA error wiring; activate/deactivate toggles and delete with confirmation. The data layer in src/api.ts mirrors the HTTP calls you would make (list, create, update, delete) so moving to a real API is a drop-in change.",
  category: "admin-panels",
  tags: ["react", "admin", "crud", "table", "forms", "tailwind"],
  framework: "vite-react",
  dependencies: VITE_DEPS,
  settings: VITE_SETTINGS,
  prebuilt: true,
  difficulty: "intermediate",
  previewPath: "/",
  files,
};
