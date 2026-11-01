import Link from "next/link";
import { LayoutTemplate, Plus } from "lucide-react";
import { AppPage } from "@/components/app/app-shell";
import { SpaceBanner } from "@/components/app/space-hero/space-banner";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { listProjects } from "@/lib/services/projects";
import { buildProjectCards } from "@/components/projects/card-data";
import { ProjectsBrowser } from "@/components/projects/projects-browser";
import { buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";

export const metadata = { title: "Projects", robots: { index: false } };

export default async function ProjectsPage() {
  const user = await requireUser("/projects");
  const { current } = await getCurrentWorkspace(user);
  const rows = current ? await listProjects(current.workspace.id) : [];
  // Live state, file and checkpoint counts and the workspace members for every card.
  const { items } = current ? await buildProjectCards(rows, { id: current.workspace.id, name: current.workspace.name, role: current.role }) : { items: [] };
  const canCreate = current ? current.role !== "viewer" : false;
  return (
    <>
      <SpaceBanner
        scene="galaxy"
        eyebrow={current ? current.workspace.name : undefined}
        title={
          <span className="flex items-baseline gap-2.5">
            Projects
            {current ? <span className="font-sans text-[15px] font-medium tabular-nums tracking-normal text-muted-foreground">{items.length}</span> : null}
          </span>
        }
        subtitle={current ? "Every app in this workspace: its runtime, live domain and latest checkpoint." : undefined}
        actions={
          canCreate ? (
            <>
              <Link href="/dashboard/templates" className={buttonClasses("outline", "sm")}>
                <LayoutTemplate className="size-4" aria-hidden="true" /> Templates
              </Link>
              <Link href="/new-project" className={buttonClasses("primary", "sm")}>
                <Plus className="size-4" aria-hidden="true" /> New project
              </Link>
            </>
          ) : null
        }
      />
      <AppPage>
        {!current ? (
          <Alert variant="warning" title="No workspace">
            You are not a member of any workspace.{" "}
            <Link href="/settings/workspaces/new" className="underline">
              Create one
            </Link>{" "}
            to start building.
          </Alert>
        ) : (
          <ProjectsBrowser projects={items} canCreate={canCreate} facts toolbarNew={false} />
        )}
      </AppPage>
    </>
  );
}
