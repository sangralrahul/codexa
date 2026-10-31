import Link from "next/link";
import { AppPage } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { listProjects } from "@/lib/services/projects";
import { buildProjectCards } from "@/components/projects/card-data";
import { ProjectsBrowser } from "@/components/projects/projects-browser";
import { Alert } from "@/components/ui/misc";

export const metadata = { title: "Projects", robots: { index: false } };

export default async function ProjectsPage() {
  const user = await requireUser("/projects");
  const { current } = await getCurrentWorkspace(user);
  const rows = current ? await listProjects(current.workspace.id) : [];
  // Live state, file and checkpoint counts and the workspace members for every card.
  const { items } = current ? await buildProjectCards(rows, { id: current.workspace.id, name: current.workspace.name, role: current.role }) : { items: [] };
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
