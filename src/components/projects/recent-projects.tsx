"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, FolderGit2, FolderKanban, LayoutGrid, LayoutTemplate, List, Plus } from "lucide-react";
import { readLocal, writeLocal } from "@/lib/client/workspace/storage";
import { withViewTransition } from "@/lib/client/view-transition";
import { Segmented } from "@/components/ui/segmented";
import { ListHeader, ProjectCard, type ProjectCardItem } from "./project-card";

type Layout = "grid" | "list";
const LAYOUT_KEY = "codexa:dashboard:layout";

/**
 * Recent projects on the dashboard: large cards with the starting template's screenshot in a
 * browser frame (default), or the compact table. The choice is remembered per browser.
 */
export function RecentProjects({ projects, projectCount, canCreate }: { projects: ProjectCardItem[]; projectCount: number; canCreate: boolean }) {
  const [layout, setLayout] = useState<Layout>("grid");
  useEffect(() => {
    const saved = readLocal<Layout>(LAYOUT_KEY, "grid");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage after mount (SSR-safe)
    if (saved === "list") setLayout("list");
  }, []);
  const changeLayout = (l: Layout) => {
    withViewTransition(() => setLayout(l));
    writeLocal(LAYOUT_KEY, l);
  };

  return (
    <section aria-labelledby="recent-title">
      <header className="mb-3.5 flex items-center gap-3">
        <span className="icon-tile size-8 rounded-[10px]" aria-hidden="true">
          <FolderKanban className="size-4" />
        </span>
        <h2 id="recent-title" className="text-section-title">
          Recent projects
        </h2>
        {projectCount > 0 ? <span className="text-meta text-foreground-dim">{projectCount}</span> : null}
        <div className="ml-auto flex items-center gap-2">
          {projects.length ? (
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
          ) : null}
          <Link href="/projects" className="link-draw inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground">
            All projects <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="card-premium px-6 py-10 text-center">
          <span className="icon-tile mx-auto size-12" aria-hidden="true">
            <FolderKanban className="size-5" />
          </span>
          <p className="mt-3 text-[15px] font-semibold">No projects yet</p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">Describe your first app above, or start from a template below.</p>
          {canCreate ? (
            <Link href="/import-project" className="link-draw mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary">
              <FolderGit2 className="size-3.5" aria-hidden="true" /> Or import a GitHub repository
            </Link>
          ) : null}
        </div>
      ) : layout === "grid" ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {projects.slice(0, 4).map((p, i) => (
            <li key={p.id}>
              <ProjectCard project={p} layout="grid" priority={i === 0} />
            </li>
          ))}
          {/* An odd number of cards leaves a hole in the two-column grid: fill it with the real entry points. */}
          {canCreate && projects.length < 4 && projects.length % 2 === 1 ? (
            <li className="hidden sm:block">
              <div className="flex h-full min-h-[240px] flex-col gap-4 rounded-2xl border border-dashed border-border-strong p-5">
                <div>
                  <p className="text-[15px] font-semibold">Start the next one</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">Describe it in the composer above, or pick a starting point.</p>
                </div>
                <ul className="my-auto space-y-1">
                  {[
                    { href: "/new-project", icon: Plus, label: "New project", detail: "Blank or from a template" },
                    { href: "/import-project", icon: FolderGit2, label: "Import from GitHub", detail: "Bring an existing repository" },
                    { href: "/dashboard/templates", icon: LayoutTemplate, label: "Browse templates", detail: "Working starters by category" },
                    { href: "/showcase", icon: Compass, label: "Community", detail: "Remix a public app" },
                  ].map(({ href, icon: Icon, label, detail }) => (
                    <li key={href}>
                      <Link href={href} className="group/next flex items-center gap-3 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
                        <span className="icon-tile size-8 rounded-[9px]" aria-hidden="true">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-medium">{label}</span>
                          <span className="block truncate text-[11.5px] text-muted-foreground">{detail}</span>
                        </span>
                        <ArrowRight className="size-3.5 text-foreground-dim transition-transform group-hover/next:translate-x-0.5" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ) : null}
        </ul>
      ) : (
        <div role="table" aria-label="Recent projects" aria-rowcount={projects.length + 1} className="card-premium overflow-hidden">
          <ListHeader />
          <div role="rowgroup">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} layout="list" />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
