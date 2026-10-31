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
      <div className="relative mx-auto max-w-[1240px] px-8 py-7">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <i className="block size-1.5 bg-fg" /> {workspace?.name ?? "Workspace"}
            </p>
            <h1 className="mt-1.5 text-[26px] font-semibold tracking-[-0.04em]">Projects</h1>
            <p className="mt-0.5 text-[13px] text-muted">{projects ? `${projects.length} project${projects.length === 1 ? "" : "s"} in ${workspace?.name ?? "this workspace"}` : "Loading…"}</p>
          </div>
          <Button variant="primary" onClick={newProject}>
            <Plus /> New project
          </Button>
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-y border-border py-2.5">
          <div className="relative w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects" aria-label="Search projects" className="h-8 pl-9 text-[13px]" />
          </div>
          {frameworks.length > 1 ? (
            <div className="flex flex-wrap gap-1" role="group" aria-label="Framework">
              {[["all", `All ${projects?.length ?? 0}`], ...frameworks.map(([f, n]) => [f, `${frameworkLabel(f)} ${n}`] as const)].map(([f, label]) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={framework === f}
                  onClick={() => setFramework(f)}
                  className={cn("mono h-[26px] rounded-md border px-2.5 text-[11.5px] transition-colors", framework === f ? "border-fg bg-fg text-bg" : "border-border-strong text-muted hover:bg-surface hover:text-fg")}
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
              <button type="button" onClick={toggle} aria-expanded={open} className="inline-flex h-[26px] items-center gap-1.5 rounded-md border border-border-strong px-2 text-[12px] text-muted hover:bg-surface hover:text-fg">
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
          <div className="flex rounded-md border border-border-strong p-0.5" role="group" aria-label="View">
            {(
              [
                ["grid", LayoutGrid],
                ["list", List],
              ] as const
            ).map(([v, Icon]) => (
              <button key={v} type="button" aria-pressed={view === v} aria-label={v === "grid" ? "Grid view" : "List view"} onClick={() => setMode(v)} className={cn("flex size-6 items-center justify-center rounded-[4px] transition-colors", view === v ? "bg-surface text-fg" : "text-dim hover:text-fg")}>
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
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
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="mono grid grid-cols-[minmax(0,1fr)_160px_120px_44px] gap-4 border-b border-border bg-card px-4 py-2.5 text-[11px] uppercase tracking-[0.05em] text-dim">
                <span>Name</span>
                <span>Framework</span>
                <span>Edited</span>
                <span />
              </div>
              {shown.map((p) => (
                <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_160px_120px_44px] items-center gap-4 border-b border-border px-4 py-2.5 last:border-b-0 hover:bg-card">
                  <button type="button" onClick={() => go({ name: "project", id: p.id })} className="flex min-w-0 items-center gap-3 text-left">
                    <ProjectThumb templateId={p.templateId} name={p.name} className="h-10 w-16 rounded-[4px] border border-border-strong" />
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
