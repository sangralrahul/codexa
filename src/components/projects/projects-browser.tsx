"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FolderKanban, LayoutGrid, List, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectListItem } from "@/lib/client/workspace/types";
import { readLocal, writeLocal } from "@/lib/client/workspace/storage";
import { buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { ProjectCard } from "./project-card";

type Sort = "recent" | "name" | "created";
const LAYOUT_KEY = "codexa:projects:layout";

export function ProjectsBrowser({ projects, showWorkspace, emptyTitle, emptyDescription }: { projects: ProjectListItem[]; showWorkspace?: boolean; emptyTitle?: string; emptyDescription?: string }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const saved = readLocal<"grid" | "list">(LAYOUT_KEY, "grid");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage after mount (SSR-safe)
    if (saved === "list") setLayout("list");
  }, []);
  const changeLayout = (l: "grid" | "list") => {
    setLayout(l);
    writeLocal(LAYOUT_KEY, l);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = projects;
    if (q) list = list.filter((p) => [p.name, p.description, p.framework, p.workspaceName].some((s) => s.toLowerCase().includes(q)));
    list = list.slice();
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "created") list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    else list.sort((a, b) => Date.parse(b.lastOpenedAt ?? b.updatedAt) - Date.parse(a.lastOpenedAt ?? a.updatedAt));
    return list;
  }, [projects, query, sort]);

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<FolderKanban className="size-8" />}
        title={emptyTitle ?? "No projects yet"}
        description={emptyDescription ?? "Create your first project from a template or describe what you want to build."}
        action={
          emptyTitle ? null : (
            <Link href="/new-project" className={buttonClasses("primary", "md")}>
              <Plus className="size-4" /> New project
            </Link>
          )
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="projects-search" className="sr-only">
            Search projects
          </label>
          <Input id="projects-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects…" className="pl-9" />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <label htmlFor="projects-sort" className="sr-only">
            Sort by
          </label>
          <Select id="projects-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-40">
            <option value="recent">Recently opened</option>
            <option value="name">Name</option>
            <option value="created">Newest</option>
          </Select>
          <div className="segmented inline-flex h-9 items-center rounded-lg border border-border bg-surface p-0.5" role="radiogroup" aria-label="Layout">
            <span aria-hidden="true" className="segmented__pill w-8" style={{ transform: `translateX(${layout === "grid" ? 2 : 34}px)` }} />
            <button
              type="button"
              role="radio"
              aria-checked={layout === "grid"}
              aria-label="Grid view"
              onClick={() => changeLayout("grid")}
              className={cn("flex size-8 items-center justify-center rounded-md transition-colors", layout === "grid" ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={layout === "list"}
              aria-label="List view"
              onClick={() => changeLayout("list")}
              className={cn("flex size-8 items-center justify-center rounded-md transition-colors", layout === "list" ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
        {filtered.length} of {projects.length} project{projects.length === 1 ? "" : "s"}
      </p>
      {filtered.length === 0 ? (
        <p className="pop-in rounded-xl border border-dashed border-border-strong p-10 text-center text-sm text-muted-foreground">No projects match “{query.trim()}”.</p>
      ) : (
        <div className={cn(layout === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-2")}>
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} layout={layout} showWorkspace={showWorkspace} />
          ))}
        </div>
      )}
    </div>
  );
}
