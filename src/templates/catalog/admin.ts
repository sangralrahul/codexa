import type { Template } from "../types";
import { USE_LOCAL_STORAGE, VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";

const files: Record<string, string> = {
  ...viteBase({
    name: "codexa-admin",
    title: "Admin panel",
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
import { useMembers, type Member } from "./api";
import { MemberForm } from "./MemberForm";

type SortKey = "name" | "email" | "role" | "createdAt";
const PAGE_SIZE = 4;

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

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b border-slate-200 bg-white p-4 md:border-b-0 md:border-r">
        <p className="text-sm font-semibold tracking-wide">ADMIN</p>
        <nav className="mt-4 space-y-1 text-sm" aria-label="Sections">
          <span aria-current="page" className="block rounded-md bg-slate-100 px-3 py-2 font-medium">
            Members
          </span>
          <span className="block px-3 py-2 text-slate-400">Settings (add a page)</span>
        </nav>
      </aside>
      <main className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Members</h1>
          <button type="button" onClick={() => setEditing("new")} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
            Add member
          </button>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-3">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email"
              aria-label="Search members"
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm sm:w-72"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  {(["name", "email", "role", "createdAt"] as SortKey[]).map((k) => (
                    <th key={k} className="p-3">
                      <button type="button" onClick={() => toggleSort(k)} className="font-medium hover:text-slate-900" aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                        {k === "createdAt" ? "Created" : k[0].toUpperCase() + k.slice(1)}
                        {sort.key === k ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
                      </button>
                    </th>
                  ))}
                  <th className="p-3">Status</th>
                  <th className="p-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="p-3 font-medium">{m.name}</td>
                    <td className="p-3 text-slate-600">{m.email}</td>
                    <td className="p-3 capitalize">{m.role}</td>
                    <td className="p-3 text-slate-600">{m.createdAt}</td>
                    <td className="p-3">
                      <button type="button" onClick={() => api.update(m.id, { active: !m.active })} className={"rounded-full px-2 py-0.5 text-xs " + (m.active ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700")} aria-label={(m.active ? "Deactivate " : "Activate ") + m.name}>
                        {m.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <button type="button" onClick={() => setEditing(m)} className="text-blue-600 hover:underline">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Delete " + m.name + "?")) api.remove(m.id);
                        }}
                        className="ml-3 text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No members match.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <nav className="flex items-center justify-between border-t border-slate-200 p-3 text-sm" aria-label="Pagination">
            <span className="text-slate-500">
              {rows.length} member{rows.length === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40">
                Previous
              </button>
              <span>
                Page {current} of {pages}
              </span>
              <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40">
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
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-xl bg-white p-5 shadow-xl" noValidate>
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
