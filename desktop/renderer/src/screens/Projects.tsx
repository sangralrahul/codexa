import { useMemo, useState } from "react";
import { FolderKanban, LayoutGrid, List, Plus, Search } from "lucide-react";
import { useApp } from "../app/state";
import { frameworkLabel, relativeTime, cn } from "../lib/util";
import { Button, EmptyState, Input, Spinner } from "../ui";
import { ProjectCard, ProjectMenu } from "../components/ProjectCard";
import { ProjectThumb } from "../components/ProjectThumb";

export function ProjectsScreen() {
  const { projects, go, workspace } = useApp();
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "list">(() => (localStorage.getItem("codexa:projects-view") as "grid" | "list") ?? "grid");
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (projects ?? []).filter((p) => !n || p.name.toLowerCase().includes(n) || p.description.toLowerCase().includes(n));
  }, [projects, q]);
  const setMode = (v: "grid" | "list") => {
    setView(v);
    localStorage.setItem("codexa:projects-view", v);
  };

  return (
    <div className="scroll h-full">
      <div className="mx-auto max-w-[1180px] px-10 py-10">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-[26px] font-semibold tracking-[-0.02em]">Projects</h1>
            <p className="mt-1 text-[13.5px] text-muted">
              {projects ? `${projects.length} in ${workspace?.name ?? "this workspace"}` : "Loading…"}
            </p>
          </div>
          <Button variant="primary" onClick={() => (go({ name: "home" }), setTimeout(() => document.getElementById("composer")?.focus(), 50))}>
            <Plus /> New project
          </Button>
        </header>

        <div className="mt-6 flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects" aria-label="Search projects" className="h-9 pl-9" />
          </div>
          <div className="ml-auto flex rounded-lg border border-border bg-card p-0.5 shadow-sm" role="group" aria-label="View">
            {(
              [
                ["grid", LayoutGrid],
                ["list", List],
              ] as const
            ).map(([v, Icon]) => (
              <button key={v} type="button" aria-pressed={view === v} aria-label={v === "grid" ? "Grid view" : "List view"} onClick={() => setMode(v)} className={cn("flex size-7 items-center justify-center rounded-md", view === v ? "bg-surface text-fg" : "text-dim hover:text-fg")}>
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
            <EmptyState icon={<FolderKanban />} title={q ? "No matching projects" : "No projects yet"} body={q ? "Try a different search." : "Create one from Home or start from a template."} />
          ) : view === "grid" ? (
            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-4">
              {shown.map((p) => (
                <li key={p.id}>
                  <ProjectCard project={p} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_160px_120px_44px] gap-4 border-b border-border px-4 py-2.5 text-[12px] font-medium text-dim">
                <span>Name</span>
                <span>Framework</span>
                <span>Edited</span>
                <span />
              </div>
              {shown.map((p) => (
                <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_160px_120px_44px] items-center gap-4 border-b border-border px-4 py-2.5 last:border-b-0 hover:bg-surface/60">
                  <button type="button" onClick={() => go({ name: "project", id: p.id })} className="flex min-w-0 items-center gap-3 text-left">
                    <ProjectThumb templateId={p.templateId} name={p.name} className="h-7 w-11 rounded-md border border-border" />
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
