"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FolderKanban, LayoutGrid, LayoutTemplate, List, Plus, Search, Sparkles, X } from "lucide-react";
import { readLocal, writeLocal } from "@/lib/client/workspace/storage";
import { withViewTransition } from "@/lib/client/view-transition";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, Kbd } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { SelectMenu } from "@/components/ui/select-menu";
import { ProjectCard, type ProjectCardItem } from "./project-card";

type Sort = "recent" | "name" | "created";
type Vis = "all" | "private" | "unlisted" | "public";
type Layout = "grid" | "list";
const LAYOUT_KEY = "codexa:projects:layout";

const SORTS: { value: Sort; label: string }[] = [
  { value: "recent", label: "Recently opened" },
  { value: "name", label: "Name" },
  { value: "created", label: "Newest" },
];

/**
 * Projects list: one toolbar (optional page title with the count, search with a "/" hint,
 * visibility filter with counts, sort, grid/list toggle, New project), then a card grid with a
 * ghost "New project" tile, or a real table (sticky header, row hover, ↑/↓ moves between rows,
 * Enter opens). Filter, sort and layout changes morph through View Transitions.
 */
export function ProjectsBrowser({
  projects,
  showWorkspace,
  emptyTitle,
  emptyDescription,
  title,
  canCreate = false,
}: {
  projects: ProjectCardItem[];
  showWorkspace?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Renders the page <h1> in the toolbar ("Projects 4"). */
  title?: string;
  /** Show New project and the ghost tile (editors and up). */
  canCreate?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [layout, setLayout] = useState<Layout>("grid");
  const [vis, setVis] = useState<Vis>("all");
  const rowsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = readLocal<Layout>(LAYOUT_KEY, "grid");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage after mount (SSR-safe)
    if (saved === "list") setLayout("list");
  }, []);
  const changeLayout = (l: Layout) => {
    withViewTransition(() => setLayout(l));
    writeLocal(LAYOUT_KEY, l);
  };

  const counts = useMemo(() => {
    const c = { all: projects.length, private: 0, unlisted: 0, public: 0 };
    for (const p of projects) c[p.visibility] += 1;
    return c;
  }, [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = vis === "all" ? projects : projects.filter((p) => p.visibility === vis);
    if (q) list = list.filter((p) => [p.name, p.description, p.framework, p.workspaceName].some((s) => s.toLowerCase().includes(q)));
    list = list.slice();
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "created") list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    else list.sort((a, b) => Date.parse(b.lastOpenedAt ?? b.updatedAt) - Date.parse(a.lastOpenedAt ?? a.updatedAt));
    return list;
  }, [projects, query, sort, vis]);

  const heading = title ? (
    <h1 className="text-app-title flex items-baseline gap-2.5">
      {title}
      <span className="text-dim font-sans text-xl font-medium tabular-nums tracking-normal">{projects.length}</span>
    </h1>
  ) : null;

  const newProject = canCreate ? (
    <Link href="/new-project" className={buttonClasses("primary", "sm", "shrink-0")}>
      <Plus className="size-4" aria-hidden="true" /> New project
    </Link>
  ) : null;

  if (projects.length === 0) {
    return (
      <div>
        {heading ? <div className="mb-8 flex items-center justify-between gap-4">{heading}{newProject}</div> : null}
        <EmptyState
          variant="illustrated"
          icon={<FolderKanban />}
          title={emptyTitle ?? "No projects yet"}
          description={emptyDescription ?? "Describe what you want to build, or start from one of the templates. Every project is real code you can read, edit and export."}
          action={
            emptyTitle || !canCreate ? null : (
              <Link href="/dashboard" className={buttonClasses("primary", "md")}>
                <Sparkles className="size-4" aria-hidden="true" /> Describe an app
              </Link>
            )
          }
          secondaryAction={
            emptyTitle ? null : (
              <Link href="/dashboard/templates" className={buttonClasses("outline", "md")}>
                <LayoutTemplate className="size-4" aria-hidden="true" /> Browse templates
              </Link>
            )
          }
        />
      </div>
    );
  }

  const onRowsKey = (e: React.KeyboardEvent) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const links = Array.from(rowsRef.current?.querySelectorAll<HTMLAnchorElement>("[data-row-link]") ?? []);
    if (!links.length) return;
    const i = links.indexOf(document.activeElement as HTMLAnchorElement);
    const next = e.key === "Home" ? 0 : e.key === "End" ? links.length - 1 : e.key === "ArrowDown" ? Math.min(links.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1);
    e.preventDefault();
    links[next]?.focus();
  };

  const filtering = Boolean(query.trim()) || vis !== "all";

  const clearFilters = () =>
    withViewTransition(() => {
      setQuery("");
      setVis("all");
    });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center">
        {heading ? <div className="flex items-center justify-between gap-3 xl:mr-2">{heading}<span className="hidden lg:inline-flex xl:hidden">{newProject}</span></div> : null}
        <Segmented<Vis>
          aria-label="Visibility"
          value={vis}
          onValueChange={(v) => withViewTransition(() => setVis(v))}
          className="max-w-full shrink-0 self-start overflow-x-auto scrollbar-thin xl:self-auto"
          options={(["all", "private", "unlisted", "public"] as const).map((v) => ({ value: v, label: v === "all" ? "All" : v.charAt(0).toUpperCase() + v.slice(1), count: counts[v] }))}
        />
        <div className="flex flex-wrap items-center gap-2 xl:ml-auto xl:flex-nowrap">
          <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <label htmlFor="projects-search" className="sr-only">
              Search projects
            </label>
            <input
              id="projects-search"
              data-hotkey-search
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) {
                  e.preventDefault();
                  setQuery("");
                }
              }}
              placeholder="Search projects"
              autoComplete="off"
              className="h-8 w-full rounded-[10px] border border-border bg-input pl-9 pr-8 text-[13px] shadow-[inset_0_1px_0_var(--hairline)] transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 hover:border-border-strong focus-visible:border-ring/70 focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--signal)_16%,transparent)] focus-visible:outline-none"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="size-3.5" aria-hidden="true" />
              </button>
            ) : (
              <Kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 border border-border bg-muted">/</Kbd>
            )}
          </div>
          <label htmlFor="projects-sort" className="sr-only">
            Sort by
          </label>
          <SelectMenu id="projects-sort" size="sm" value={sort} onValueChange={(v) => withViewTransition(() => setSort(v as Sort))} options={SORTS} className="h-8 w-[156px] rounded-[10px]" />
          <Segmented<Layout>
            aria-label="Layout"
            size="sm"
            value={layout}
            onValueChange={changeLayout}
            options={[
              { value: "grid", icon: <LayoutGrid />, label: <span className="sr-only">Grid view</span>, title: "Grid view" },
              { value: "list", icon: <List />, label: <span className="sr-only">List view</span>, title: "List view" },
            ]}
          />
          {newProject ? <span className={heading ? "hidden xl:inline-flex" : "inline-flex"}>{newProject}</span> : null}
        </div>
      </div>

      {/* The count is already in the title and the sidebar: "x of y" only while a filter or search narrows the list.
          The live region stays mounted so screen readers hear the new count when one is applied. */}
      <p className={filtering ? "text-meta mb-3 text-muted-foreground" : "sr-only"} aria-live="polite">
        {filtering ? `${filtered.length} of ${projects.length} project${projects.length === 1 ? "" : "s"}` : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="pop-in flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">{query.trim() ? `No projects match “${query.trim()}”.` : `No ${vis} projects.`}</p>
          <button type="button" onClick={clearFilters} className={buttonClasses("outline", "sm")}>
            Clear filters
          </button>
        </div>
      ) : layout === "grid" ? (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p, i) => (
            <li key={p.id}>
              <ProjectCard project={p} layout="grid" showWorkspace={showWorkspace} priority={i === 0} />
            </li>
          ))}
          {canCreate && !query.trim() && vis === "all" ? (
            // Phones: a compact 64px dashed row; from 640px a full card-height ghost tile.
            <li>
              <Link
                href="/new-project"
                style={{ viewTransitionName: "proj-new" }}
                className="group/ghost flex min-h-16 items-center gap-3 rounded-[16px] border border-dashed border-border-strong px-4 py-3 text-left transition-[border-color,background-color] duration-(--dur-3) hover:border-foreground/30 hover:bg-foreground/[0.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:h-full sm:min-h-[280px] sm:flex-col sm:justify-center sm:p-6 sm:text-center"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-transform duration-(--dur-3) ease-snap group-hover/ghost:rotate-90 group-hover/ghost:scale-105 calm:transition-none sm:size-11">
                  <Plus className="size-4 sm:size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">New project</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Describe it, start from a template or import from GitHub</span>
                </span>
              </Link>
            </li>
          ) : null}
        </ul>
      ) : (
        <div role="table" aria-label="Projects" aria-rowcount={filtered.length + 1} className="overflow-clip rounded-[16px] border border-border bg-card shadow-[inset_0_1px_0_var(--hairline),var(--shadow-sm)]">
          <div role="rowgroup" className="glass sticky top-[52px] z-10 hidden border-b border-border md:block">
            <div role="row" className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)_40px] items-center gap-3 px-4 py-2 text-xs font-medium text-muted-foreground">
              <span role="columnheader">Name</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Framework</span>
              <span role="columnheader">Visibility</span>
              <span role="columnheader">Last activity</span>
              <span role="columnheader">
                <span className="sr-only">Actions</span>
              </span>
            </div>
          </div>
          <div role="rowgroup" ref={rowsRef} onKeyDown={onRowsKey}>
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} layout="list" showWorkspace={showWorkspace} />
            ))}
          </div>
        </div>
      )}
      {layout === "list" && filtered.length > 0 ? (
        <p className="mt-3 hidden text-xs text-foreground-dim md:block">
          <Kbd className="border border-border bg-muted">↑</Kbd> <Kbd className="border border-border bg-muted">↓</Kbd> to move between rows · <Kbd className="border border-border bg-muted">↵</Kbd> to open
        </p>
      ) : null}
    </div>
  );
}
