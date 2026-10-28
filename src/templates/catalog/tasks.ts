import type { Template } from "../types";
import { USE_LOCAL_STORAGE, VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";

const files: Record<string, string> = {
  ...viteBase({
    name: "codexa-tasks",
    title: "Tasks",
    readme: `# Tasks: todo list, kanban board and notes

One dataset, three views: a todo list, a drag-and-drop kanban board and a notes editor.
Tasks and notes are persisted in localStorage so the app is usable without a backend; the sample tasks are seeded on first load.

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  }),
  "src/useLocalStorage.ts": USE_LOCAL_STORAGE,
  "src/types.ts": `export const COLUMNS = ["todo", "doing", "done"] as const;
export type Column = (typeof COLUMNS)[number];
export type Task = { id: string; title: string; column: Column; createdAt: number };
export type Note = { id: string; title: string; body: string; updatedAt: number };

export const COLUMN_LABEL: Record<Column, string> = { todo: "To do", doing: "In progress", done: "Done" };
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
`,
  "src/App.tsx": `import { useState } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { TodoList } from "./views/TodoList";
import { Board } from "./views/Board";
import { Notes } from "./views/Notes";
import { newId, type Note, type Task } from "./types";

const VIEWS = ["list", "board", "notes"] as const;
type View = (typeof VIEWS)[number];

const now = Date.now();
const seedTasks: Task[] = [
  { id: newId(), title: "Try the board view", column: "todo", createdAt: now },
  { id: newId(), title: "Ask Codexa to add due dates", column: "doing", createdAt: now },
  { id: newId(), title: "Write the onboarding email", column: "todo", createdAt: now },
  { id: newId(), title: "Review the pricing page copy", column: "doing", createdAt: now },
  { id: newId(), title: "Book the team retro", column: "done", createdAt: now },
  { id: newId(), title: "Set up the project", column: "done", createdAt: now },
];
const seedNotes: Note[] = [{ id: newId(), title: "Welcome", body: "Notes are saved in your browser as you type. Ask Codexa to add tags, search or a real database.", updatedAt: now }];

export default function App() {
  const [view, setView] = useState<View>("list");
  const [tasks, setTasks] = useLocalStorage<Task[]>("tasks", seedTasks);
  const [notes, setNotes] = useLocalStorage<Note[]>("notes", seedNotes);
  const done = tasks.filter((t) => t.column === "done").length;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef2ff_0%,#f8fafc_320px)] text-slate-900">
      <header className="border-b border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <h1 className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-600 text-white shadow-sm shadow-teal-600/30">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </span>
            Tasks
          </h1>
          <div className="flex rounded-xl bg-slate-100 p-1 text-sm" role="tablist" aria-label="View">
            {VIEWS.map((v) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={"rounded-lg px-3.5 py-1.5 capitalize transition " + (view === v ? "bg-white font-medium shadow-sm" : "text-slate-500 hover:text-slate-900")}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6" role="tabpanel">
        {view !== "notes" ? (
          <div className="mx-auto mb-6 flex max-w-xl items-end justify-between gap-4 data-[wide=true]:max-w-none" data-wide={view === "board"}>
            <div>
              <p className="text-sm text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight">Today</h2>
            </div>
            <div className="w-40 text-right">
              <p className="text-xs text-slate-500">
                {done} of {tasks.length} done
              </p>
              <div className="mt-1.5 h-1.5 rounded-full bg-slate-200">
                <div className="h-1.5 rounded-full bg-teal-600 transition-all" style={{ width: (tasks.length ? (done / tasks.length) * 100 : 0) + "%" }} />
              </div>
            </div>
          </div>
        ) : null}
        {view === "list" ? <TodoList tasks={tasks} setTasks={setTasks} /> : view === "board" ? <Board tasks={tasks} setTasks={setTasks} /> : <Notes notes={notes} setNotes={setNotes} />}
      </main>
    </div>
  );
}
`,
  "src/views/TodoList.tsx": `import { useState, type FormEvent } from "react";
import { COLUMN_LABEL, newId, type Task } from "../types";

type Props = { tasks: Task[]; setTasks: (next: Task[] | ((prev: Task[]) => Task[])) => void };

export function TodoList({ tasks, setTasks }: Props) {
  const [title, setTitle] = useState("");
  const [showDone, setShowDone] = useState(true);

  function add(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setTasks((prev) => [{ id: newId(), title: t, column: "todo", createdAt: Date.now() }, ...prev]);
    setTitle("");
  }
  const toggle = (id: string) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, column: t.column === "done" ? "todo" : "done" } : t)));
  const remove = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));
  const visible = tasks.filter((t) => showDone || t.column !== "done");
  const remaining = tasks.filter((t) => t.column !== "done").length;

  return (
    <div className="mx-auto max-w-xl">
      <form onSubmit={add} className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-teal-300">
        <label className="sr-only" htmlFor="new-task">
          New task
        </label>
        <input id="new-task" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task and press Enter" className="flex-1 bg-transparent px-2 text-sm outline-none" />
        <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
          Add
        </button>
      </form>
      <div className="mt-5 flex items-center justify-between px-1 text-sm text-slate-500">
        <span>{remaining} remaining</span>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="accent-teal-600" /> Show completed
        </label>
      </div>
      <ul className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {visible.map((t) => (
          <li key={t.id} className="group flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
            <input
              type="checkbox"
              checked={t.column === "done"}
              onChange={() => toggle(t.id)}
              aria-label={"Mark " + t.title + (t.column === "done" ? " as not done" : " as done")}
              className="h-5 w-5 rounded-full accent-teal-600"
            />
            <span className={"flex-1 text-sm " + (t.column === "done" ? "text-slate-400 line-through" : "")}>{t.title}</span>
            <span className={"rounded-full px-2 py-0.5 text-[11px] " + (t.column === "doing" ? "bg-amber-50 text-amber-700" : t.column === "done" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>{COLUMN_LABEL[t.column]}</span>
            <button type="button" onClick={() => remove(t.id)} className="text-xs text-slate-300 opacity-0 transition hover:text-red-600 focus:opacity-100 group-hover:opacity-100" aria-label={"Delete " + t.title}>
              Delete
            </button>
          </li>
        ))}
        {visible.length === 0 ? (
          <li className="p-10 text-center">
            <p className="text-sm font-medium">All clear</p>
            <p className="mt-1 text-sm text-slate-500">Add a task above to get started.</p>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
`,
  "src/views/Board.tsx": `import { useState } from "react";
import { COLUMNS, COLUMN_LABEL, newId, type Column, type Task } from "../types";

type Props = { tasks: Task[]; setTasks: (next: Task[] | ((prev: Task[]) => Task[])) => void };

export function Board({ tasks, setTasks }: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  const move = (id: string, column: Column) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, column } : t)));
  const addTo = (column: Column) => {
    const title = window.prompt("Task title");
    if (title?.trim()) setTasks((prev) => [...prev, { id: newId(), title: title.trim(), column, createdAt: Date.now() }]);
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => (
        <section
          key={col}
          aria-labelledby={"col-" + col}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragging) move(dragging, col);
            setDragging(null);
          }}
          className="flex min-h-48 flex-col rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 id={"col-" + col} className="text-sm font-medium">
              {COLUMN_LABEL[col]} <span className="text-slate-400">{tasks.filter((t) => t.column === col).length}</span>
            </h2>
            <button type="button" onClick={() => addTo(col)} className="rounded-md px-2 py-1 text-xs text-teal-600 hover:bg-teal-50">
              + Add
            </button>
          </div>
          <ul className="mt-3 flex-1 space-y-2">
            {tasks
              .filter((t) => t.column === col)
              .map((t) => {
                const i = COLUMNS.indexOf(col);
                return (
                  <li key={t.id} draggable onDragStart={() => setDragging(t.id)} onDragEnd={() => setDragging(null)} className="cursor-grab rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm active:cursor-grabbing">
                    <p>{t.title}</p>
                    <div className="mt-2 flex justify-between">
                      <button type="button" disabled={i === 0} onClick={() => move(t.id, COLUMNS[i - 1] ?? col)} className="text-xs text-slate-500 disabled:opacity-30" aria-label={"Move " + t.title + " to " + (COLUMN_LABEL[COLUMNS[i - 1] ?? col])}>
                        ← Back
                      </button>
                      <button type="button" disabled={i === COLUMNS.length - 1} onClick={() => move(t.id, COLUMNS[i + 1] ?? col)} className="text-xs text-slate-500 disabled:opacity-30" aria-label={"Move " + t.title + " to " + (COLUMN_LABEL[COLUMNS[i + 1] ?? col])}>
                        Forward →
                      </button>
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
`,
  "src/views/Notes.tsx": `import { useState } from "react";
import { newId, type Note } from "../types";

type Props = { notes: Note[]; setNotes: (next: Note[] | ((prev: Note[]) => Note[])) => void };

export function Notes({ notes, setNotes }: Props) {
  const [selected, setSelected] = useState<string | null>(notes[0]?.id ?? null);
  const current = notes.find((n) => n.id === selected) ?? null;

  const create = () => {
    const n: Note = { id: newId(), title: "Untitled", body: "", updatedAt: Date.now() };
    setNotes((prev) => [n, ...prev]);
    setSelected(n.id);
  };
  const update = (patch: Partial<Note>) => {
    if (!current) return;
    setNotes((prev) => prev.map((n) => (n.id === current.id ? { ...n, ...patch, updatedAt: Date.now() } : n)));
  };
  const remove = () => {
    if (!current) return;
    setNotes((prev) => prev.filter((n) => n.id !== current.id));
    setSelected(null);
  };

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <button type="button" onClick={create} className="w-full rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">
          New note
        </button>
        <ul className="mt-2 space-y-1">
          {notes.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => setSelected(n.id)} aria-current={n.id === selected ? "true" : undefined} className={"w-full truncate rounded-md px-2 py-1.5 text-left text-sm " + (n.id === selected ? "bg-slate-100 font-medium" : "hover:bg-slate-50")}>
                {n.title || "Untitled"}
              </button>
            </li>
          ))}
          {notes.length === 0 ? <li className="p-3 text-center text-xs text-slate-500">No notes yet</li> : null}
        </ul>
      </aside>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {current ? (
          <>
            <label className="sr-only" htmlFor="note-title">
              Title
            </label>
            <input id="note-title" value={current.title} onChange={(e) => update({ title: e.target.value })} className="w-full border-0 text-lg font-semibold outline-none" />
            <label className="sr-only" htmlFor="note-body">
              Body
            </label>
            <textarea id="note-body" value={current.body} onChange={(e) => update({ body: e.target.value })} rows={14} placeholder="Write something…" className="mt-2 w-full resize-y rounded-md border border-slate-200 p-3 text-sm" />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>Saved {new Date(current.updatedAt).toLocaleTimeString()}</span>
              <button type="button" onClick={remove} className="text-red-600 hover:underline">
                Delete note
              </button>
            </div>
          </>
        ) : (
          <p className="p-6 text-center text-sm text-slate-500">Select a note or create a new one.</p>
        )}
      </section>
    </div>
  );
}
`,
};

export const tasksTemplate: Template = {
  id: "vite-react-tasks",
  name: "Todo, kanban and notes",
  description: "A productivity app with a todo list, a drag-and-drop kanban board, and a notes editor sharing one local dataset.",
  longDescription:
    "Three views over persisted local state: a classic todo list with completion and filtering, a three-column board with HTML5 drag-and-drop plus keyboard-friendly move buttons, and a two-pane notes editor. Everything is typed and saved to localStorage through a tiny hook, which makes it a good base for learning state management before adding a database.",
  category: "web-apps",
  tags: ["react", "todo", "kanban", "notes", "productivity", "tailwind"],
  framework: "vite-react",
  dependencies: VITE_DEPS,
  settings: VITE_SETTINGS,
  prebuilt: true,
  difficulty: "beginner",
  previewPath: "/",
  files,
};
