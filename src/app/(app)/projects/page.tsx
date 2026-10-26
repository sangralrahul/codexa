import Link from "next/link";
import { Plus } from "lucide-react";
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
        <ProjectsBrowser projects={items} />
      )}
    </AppPage>
  );
}
