import type { Template } from "../types";
import { USE_LOCAL_STORAGE, VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";

const files: Record<string, string> = {
  ...viteBase({
    name: "codexa-tasks",
    title: "Tasks",
    readme: `# Tasks: todo list, kanban board and notes

One dataset, three views. Tasks and notes are persisted in localStorage so the app is usable without a backend.

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

export default function App() {
  const [view, setView] = useState<View>("list");
  const [tasks, setTasks] = useLocalStorage<Task[]>("tasks", [
    { id: newId(), title: "Try the board view", column: "todo", createdAt: Date.now() },
    { id: newId(), title: "Ask Codexa to add due dates", column: "doing", createdAt: Date.now() },
  ]);
  const [notes, setNotes] = useLocalStorage<Note[]>("notes", []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <h1 className="font-semibold tracking-tight">Tasks</h1>
          <div className="flex rounded-md border border-slate-300 p-0.5 text-sm" role="tablist" aria-label="View">
            {VIEWS.map((v) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={"rounded px-3 py-1 capitalize " + (view === v ? "bg-slate-900 text-white" : "hover:bg-slate-100")}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6" role="tabpanel">
        {view === "list" ? <TodoList tasks={tasks} setTasks={setTasks} /> : view === "board" ? <Board tasks={tasks} setTasks={setTasks} /> : <Notes notes={notes} setNotes={setNotes} />}
      </main>
    </div>
  );
}
`,
  "src/views/TodoList.tsx": `import { useState, type FormEvent } from "react";
import { newId, type Task } from "../types";

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
      <form onSubmit={add} className="flex gap-2">
        <label className="sr-only" htmlFor="new-task">
          New task
        </label>
        <input id="new-task" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task and press Enter" className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          Add
        </button>
      </form>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          {remaining} remaining
        </span>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Show completed
        </label>
      </div>
      <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {visible.map((t) => (
          <li key={t.id} className="flex items-center gap-3 p-3">
            <input type="checkbox" checked={t.column === "done"} onChange={() => toggle(t.id)} aria-label={"Mark " + t.title + (t.column === "done" ? " as not done" : " as done")} />
            <span className={"flex-1 text-sm " + (t.column === "done" ? "text-slate-400 line-through" : "")}>{t.title}</span>
            <button type="button" onClick={() => remove(t.id)} className="text-xs text-slate-400 hover:text-red-600" aria-label={"Delete " + t.title}>
              Delete
            </button>
          </li>
        ))}
        {visible.length === 0 ? <li className="p-6 text-center text-sm text-slate-500">Nothing here yet.</li> : null}
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
          className="flex min-h-48 flex-col rounded-xl border border-slate-200 bg-white p-3"
        >
          <div className="flex items-center justify-between">
            <h2 id={"col-" + col} className="text-sm font-medium">
              {COLUMN_LABEL[col]} <span className="text-slate-400">{tasks.filter((t) => t.column === col).length}</span>
            </h2>
            <button type="button" onClick={() => addTo(col)} className="text-xs text-blue-600 hover:underline">
              + Add
            </button>
          </div>
          <ul className="mt-3 flex-1 space-y-2">
            {tasks
              .filter((t) => t.column === col)
              .map((t) => {
                const i = COLUMNS.indexOf(col);
                return (
                  <li key={t.id} draggable onDragStart={() => setDragging(t.id)} onDragEnd={() => setDragging(null)} className="cursor-grab rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm active:cursor-grabbing">
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
      <aside className="rounded-xl border border-slate-200 bg-white p-2">
        <button type="button" onClick={create} className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white">
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
      <section className="rounded-xl border border-slate-200 bg-white p-4">
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
