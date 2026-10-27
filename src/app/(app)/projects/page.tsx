import Link from "next/link";
import { AppPage } from "@/components/app/app-shell";
import { templateCategory } from "@/components/projects/template-summaries";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { listProjects } from "@/lib/services/projects";
import { getProjectStatuses } from "@/lib/services/dashboard";
import { serializeProject } from "@/app/api/v1/projects/_lib/serialize";
import { ProjectsBrowser } from "@/components/projects/projects-browser";
import type { ProjectCardItem } from "@/components/projects/project-card";
import { toStatusDto } from "@/components/projects/status";
import { Alert } from "@/components/ui/misc";

export const metadata = { title: "Projects", robots: { index: false } };

export default async function ProjectsPage() {
  const user = await requireUser("/projects");
  const { current } = await getCurrentWorkspace(user);
  const rows = current ? await listProjects(current.workspace.id) : [];
  const statuses = await getProjectStatuses(rows.map((p) => p.id));
  const items: ProjectCardItem[] = rows.map((p) => {
    const s = serializeProject(p);
    return {
      ...s,
      lastOpenedAt: s.lastOpenedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      workspaceName: current!.workspace.name,
      role: current!.role,
      category: templateCategory(s.templateId),
      status: toStatusDto(statuses.get(p.id)),
    };
  });
  return (
    <AppPage>
      {!current ? (
        <>
          <h1 className="text-app-title mb-6">Projects</h1>
          <Alert variant="warning" title="No workspace">
            You are not a member of any workspace.{" "}
            <Link href="/settings/workspaces/new" className="underline">
              Create one
            </Link>{" "}
            to start building.
          </Alert>
        </>
      ) : (
        <ProjectsBrowser title="Projects" projects={items} canCreate={current.role !== "viewer"} />
      )}
    </AppPage>
  );
}
