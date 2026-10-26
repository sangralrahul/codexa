import Link from "next/link";
import { Clock, FolderKanban, Globe, Lock, Plus } from "lucide-react";
import { relativeTime } from "@/components/projects/format";
import { AppPage, PageHeader } from "@/components/app/app-shell";
import { templateCategory } from "@/components/projects/template-summaries";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { listProjects } from "@/lib/services/projects";
import { serializeProject } from "@/app/api/v1/projects/_lib/serialize";
import { ProjectsBrowser } from "@/components/projects/projects-browser";
import { buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import type { ProjectListItem } from "@/lib/client/workspace/types";

export const metadata = { title: "Projects", robots: { index: false } };

export default async function ProjectsPage() {
  const user = await requireUser("/projects");
  const { current } = await getCurrentWorkspace(user);
  const rows = current ? await listProjects(current.workspace.id) : [];
  const items: ProjectListItem[] = rows.map((p) => {
    const s = serializeProject(p);
    return {
      ...s,
      lastOpenedAt: s.lastOpenedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      workspaceName: current!.workspace.name,
      role: current!.role,
      category: templateCategory(s.templateId),
    };
  });
  return (
    <AppPage>
      <PageHeader
        title="Projects"
        description={current ? `${items.length} project${items.length === 1 ? "" : "s"} in ${current.workspace.name}` : undefined}
        actions={
          current && current.role !== "viewer" ? (
            <Link href="/new-project" className={buttonClasses("primary", "sm", "rounded-md")}>
              <Plus className="size-4" /> New project
            </Link>
          ) : null
        }
      />
      {!current ? (
        <Alert variant="warning" title="No workspace">
          You are not a member of any workspace.{" "}
          <Link href="/settings/workspaces/new" className="underline">
            Create one
          </Link>{" "}
          to start building.
        </Alert>
      ) : (
        <>
          {items.length ? (
            <div className="mb-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
              {[
                { label: "Projects", value: String(items.length), icon: FolderKanban },
                { label: "Private", value: String(items.filter((p) => p.visibility === "private").length), icon: Lock },
                { label: "Shared by link or public", value: String(items.filter((p) => p.visibility !== "private").length), icon: Globe },
                { label: "Last activity", value: relativeTime(items.map((p) => p.lastOpenedAt ?? p.updatedAt).sort().at(-1) ?? null), icon: Clock },
              ].map((s, i) => (
                <div key={s.label} className="pop-in flex items-center gap-3 bg-card p-4" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-signal/20 to-signal/5 ring-1 ring-signal/20">
                    <s.icon className="size-4 text-signal" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-muted-foreground">{s.label}</span>
                    <span className="block truncate text-lg font-semibold tracking-tight first-letter:uppercase">{s.value}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <ProjectsBrowser projects={items} />
        </>
      )}
    </AppPage>
  );
}
