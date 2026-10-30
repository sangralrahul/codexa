import { useMemo, useState } from "react";
import { ArrowDownAZ, ChevronDown, Clock, FolderKanban, LayoutGrid, List, Plus, Search } from "lucide-react";
import { useApp } from "../app/state";
import { frameworkLabel, relativeTime, cn } from "../lib/util";
import { Button, EmptyState, Input, Menu, MenuItem, Spinner } from "../ui";
import { ProjectCard, ProjectMenu } from "../components/ProjectCard";
import { ProjectThumb } from "../components/ProjectThumb";

type Sort = "recent" | "name";
const SORTS: { id: Sort; label: string; icon: typeof Clock }[] = [
  { id: "recent", label: "Recently edited", icon: Clock },
  { id: "name", label: "Name A–Z", icon: ArrowDownAZ },
];

export function ProjectsScreen() {
  const { projects, go, workspace } = useApp();
  const [q, setQ] = useState("");
  const [framework, setFramework] = useState("all");
  const [sort, setSort] = useState<Sort>(() => (localStorage.getItem("codexa:projects-sort") as Sort) ?? "recent");
  const [view, setView] = useState<"grid" | "list">(() => (localStorage.getItem("codexa:projects-view") as "grid" | "list") ?? "grid");

  const frameworks = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of projects ?? []) counts.set(p.framework, (counts.get(p.framework) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [projects]);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    const list = (projects ?? []).filter((p) => (framework === "all" || p.framework === framework) && (!n || p.name.toLowerCase().includes(n) || p.description.toLowerCase().includes(n)));
    return sort === "name" ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list;
  }, [projects, q, framework, sort]);

  const setMode = (v: "grid" | "list") => {
    setView(v);
    localStorage.setItem("codexa:projects-view", v);
  };
  const pickSort = (s: Sort) => {
    setSort(s);
    localStorage.setItem("codexa:projects-sort", s);
  };
  const current = SORTS.find((s) => s.id === sort)!;
  const newProject = () => {
    go({ name: "home" });
    setTimeout(() => document.getElementById("composer")?.focus(), 50);
  };

  return (
    <div className="scroll relative h-full">
      <div aria-hidden="true" className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[260px] opacity-70" />
      <div className="relative mx-auto max-w-[1180px] px-10 py-10">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-[-0.025em]">Projects</h1>
            <p className="mt-1 text-[13.5px] text-muted">{projects ? `${projects.length} project${projects.length === 1 ? "" : "s"} in ${workspace?.name ?? "this workspace"}` : "Loading…"}</p>
          </div>
          <Button variant="accent" onClick={newProject}>
            <Plus /> New project
          </Button>
        </header>

        <div className="card-edge mt-7 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2">
          <div className="relative w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects" aria-label="Search projects" className="h-9 border-0 bg-surface pl-9 shadow-none" />
          </div>
          {frameworks.length > 1 ? (
            <div className="flex flex-wrap gap-1" role="group" aria-label="Framework">
              {[["all", `All ${projects?.length ?? 0}`], ...frameworks.map(([f, n]) => [f, `${frameworkLabel(f)} ${n}`] as const)].map(([f, label]) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={framework === f}
                  onClick={() => setFramework(f)}
                  className={cn("h-8 rounded-lg px-3 text-[12.5px] font-medium transition-colors", framework === f ? "bg-surface text-fg ring-1 ring-border" : "text-muted hover:bg-surface hover:text-fg")}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          <span className="ml-auto" />
          <Menu
            width={200}
            trigger={(open, toggle) => (
              <button type="button" onClick={toggle} aria-expanded={open} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium text-muted hover:bg-surface hover:text-fg">
                <current.icon className="size-3.5" /> {current.label} <ChevronDown className="size-3.5 text-dim" />
              </button>
            )}
          >
            {(close) =>
              SORTS.map((s) => (
                <MenuItem key={s.id} icon={<s.icon />} checked={sort === s.id} onSelect={() => (pickSort(s.id), close())}>
                  {s.label}
                </MenuItem>
              ))
            }
          </Menu>
          <div className="flex rounded-lg bg-surface p-0.5" role="group" aria-label="View">
            {(
              [
                ["grid", LayoutGrid],
                ["list", List],
              ] as const
            ).map(([v, Icon]) => (
              <button key={v} type="button" aria-pressed={view === v} aria-label={v === "grid" ? "Grid view" : "List view"} onClick={() => setMode(v)} className={cn("flex size-7 items-center justify-center rounded-md transition-colors", view === v ? "bg-card text-fg shadow-sm" : "text-dim hover:text-fg")}>
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {projects === null ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner />
            </div>
          ) : shown.length === 0 ? (
            <EmptyState
              icon={<FolderKanban />}
              title={q || framework !== "all" ? "No matching projects" : "No projects yet"}
              body={q || framework !== "all" ? "Try a different search or filter." : "Describe an app on Home, or start from one of 111 working templates."}
              action={q || framework !== "all" ? undefined : <Button variant="primary" onClick={newProject}>New project</Button>}
            />
          ) : view === "grid" ? (
            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-4">
              {shown.map((p) => (
                <li key={p.id}>
                  <ProjectCard project={p} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="card-edge overflow-hidden rounded-2xl border border-border bg-card">
              <div className="grid grid-cols-[minmax(0,1fr)_160px_120px_44px] gap-4 border-b border-border bg-surface/50 px-4 py-2.5 text-[12px] font-medium text-dim">
                <span>Name</span>
                <span>Framework</span>
                <span>Edited</span>
                <span />
              </div>
              {shown.map((p) => (
                <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_160px_120px_44px] items-center gap-4 border-b border-border px-4 py-2.5 last:border-b-0 hover:bg-surface/60">
                  <button type="button" onClick={() => go({ name: "project", id: p.id })} className="flex min-w-0 items-center gap-3 text-left">
                    <ProjectThumb templateId={p.templateId} name={p.name} className="h-8 w-[52px] rounded-md border border-border" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-medium">{p.name}</span>
                      {p.description ? <span className="block truncate text-[12px] text-muted">{p.description}</span> : null}
                    </span>
                  </button>
                  <span className="truncate text-[13px] text-muted">{frameworkLabel(p.framework)}</span>
                  <span className="text-[13px] text-muted">{relativeTime(p.updatedAt)}</span>
                  <ProjectMenu project={p} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
