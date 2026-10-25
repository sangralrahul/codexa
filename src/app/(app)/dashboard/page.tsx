import Link from "next/link";
import { ArrowRight, LayoutTemplate, Plus } from "lucide-react";
import { PageHeader } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { countProjects, listRecentProjectsForUser } from "@/lib/services/projects";
import { getWorkspaceEntitlements } from "@/lib/services/usage";
import { capabilities } from "@/lib/env";
import { serializeProject } from "@/app/api/v1/projects/_lib/serialize";
import { DEFAULT_TEMPLATE_ID, listTemplateSummaries } from "@/components/projects/template-summaries";
import { PromptBox } from "@/components/projects/prompt-box";
import { ProjectCard } from "@/components/projects/project-card";
import { UsageCard } from "@/components/projects/usage-card";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import type { ProjectListItem, WorkspaceRole } from "@/lib/client/workspace/types";

export const metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const { current, all } = await getCurrentWorkspace(user);
  const byId = new Map(all.map((w) => [w.workspace.id, w]));
  const [recent, entitlements, projectCount] = await Promise.all([
    listRecentProjectsForUser(
      all.map((w) => w.workspace.id),
      8,
    ),
    current ? getWorkspaceEntitlements(current.workspace) : null,
    current ? countProjects(current.workspace.id) : 0,
  ]);
  const items: ProjectListItem[] = recent.map((p) => {
    const ws = byId.get(p.workspaceId);
    const s = serializeProject(p);
    return {
      ...s,
      lastOpenedAt: s.lastOpenedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      workspaceName: ws?.workspace.name ?? "Workspace",
      role: (ws?.role ?? "viewer") as WorkspaceRole,
    };
  });
  const shortcuts = listTemplateSummaries().filter((t) => t.featured).slice(0, 4);
  const canCreate = current ? current.role !== "viewer" : false;

  return (
    <div className="container-x py-8">
      <PageHeader
        title={`Welcome back, ${user.name || user.email.split("@")[0]}`}
        description={current ? `Workspace: ${current.workspace.name}` : "You are not a member of any workspace yet."}
        actions={
          <Link href="/new-project" className={buttonClasses("primary", "md")}>
            <Plus className="size-4" /> New project
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <PromptBox workspaceId={canCreate && current ? current.workspace.id : null} templateId={DEFAULT_TEMPLATE_ID} aiConfigured={capabilities.ai} />

          <section aria-labelledby="shortcuts-title">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="shortcuts-title" className="text-base font-semibold">
                Start from a template
              </h2>
              <Link href="/dashboard/templates" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                All templates <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {shortcuts.map((t) => (
                <Link
                  key={t.id}
                  href={`/new-project?template=${encodeURIComponent(t.id)}`}
                  className="flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <LayoutTemplate className="mb-2 size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</span>
                  <Badge variant="outline" className="mt-3 w-fit text-[10px]">
                    {t.frameworkName}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="recent-title">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="recent-title" className="text-base font-semibold">
                Recent projects
              </h2>
              <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                All projects <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            {items.length === 0 ? (
              <EmptyState
                title="No projects yet"
                description="Describe your idea above or pick a template to create your first project."
                action={
                  <Link href="/new-project" className={buttonClasses("outline", "md")}>
                    Create a project
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((p) => (
                  <ProjectCard key={p.id} project={p} showWorkspace={all.length > 1} />
                ))}
              </div>
            )}
          </section>
        </div>
        <aside className="space-y-4">
          {current && entitlements ? <UsageCard workspaceName={current.workspace.name} entitlements={entitlements} projectCount={projectCount} /> : null}
        </aside>
      </div>
    </div>
  );
}
