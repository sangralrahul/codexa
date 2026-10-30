import Link from "next/link";
import { FolderKanban, UserPlus } from "lucide-react";
import { AppPage, PageHeader } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth/guards";
import { listUserWorkspaces } from "@/lib/services/workspaces";
import { listProjects } from "@/lib/services/projects";
import { serializeProject } from "@/app/api/v1/projects/_lib/serialize";
import { ProjectsBrowser } from "@/components/projects/projects-browser";
import { getProjectStatuses } from "@/lib/services/dashboard";
import { toStatusDto } from "@/components/projects/status";
import { templateCategory } from "@/components/projects/template-summaries";
import { buttonClasses } from "@/components/ui/button";
import type { ProjectCardItem } from "@/components/projects/project-card";

export const metadata = { title: "Shared projects", robots: { index: false } };

/** Projects in workspaces the user belongs to but does not own (invited as admin, editor or viewer). */
export default async function SharedProjectsPage() {
  const user = await requireUser("/dashboard/shared");
  const memberships = (await listUserWorkspaces(user.id)).filter((w) => w.role !== "owner");
  const lists = await Promise.all(memberships.map((m) => listProjects(m.workspace.id)));
  const statuses = await getProjectStatuses(lists.flat().map((p) => p.id));
  const items: ProjectCardItem[] = memberships.flatMap((m, i) =>
    lists[i].map((p) => {
      const s = serializeProject(p);
      return {
        ...s,
        lastOpenedAt: s.lastOpenedAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        workspaceName: m.workspace.name,
        role: m.role,
        category: templateCategory(s.templateId),
        status: toStatusDto(statuses.get(p.id)),
      };
    }),
  );
  return (
    <AppPage>
      <PageHeader
        title="Shared with me"
        description={
          memberships.length
            ? `Projects from ${memberships.length} workspace${memberships.length === 1 ? "" : "s"} you were invited to (${memberships.map((m) => m.workspace.name).join(", ")}).`
            : "Projects from workspaces other people invited you to. Your own workspaces are under Projects."
        }
      />
      <ProjectsBrowser
        projects={items}
        showWorkspace
        emptyTitle="Nothing shared with you yet"
        emptyDescription={
          memberships.length
            ? "The workspaces you were invited to have no projects yet. Projects their members create appear here."
            : "When a workspace owner invites you, their projects appear here. To work with your own team, invite them to your workspace instead."
        }
        emptyAction={
          <Link href="/settings/members" className={buttonClasses("primary", "md")}>
            <UserPlus className="size-4" aria-hidden="true" /> Invite your team
          </Link>
        }
        emptySecondaryAction={
          <Link href="/projects" className={buttonClasses("outline", "md")}>
            <FolderKanban className="size-4" aria-hidden="true" /> Your projects
          </Link>
        }
      />
    </AppPage>
  );
}
