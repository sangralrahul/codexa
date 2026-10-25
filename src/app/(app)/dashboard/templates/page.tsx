import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/app/app-shell";
import { TemplateGallery, UseTemplateButton } from "@/components/templates";
import { Alert } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { parseTemplateSearch } from "@/templates";

export const metadata = { title: "Templates", robots: { index: false } };

type SearchParams = Promise<{ q?: string; category?: string; framework?: string; sort?: string }>;

/**
 * In-app templates gallery. "Use template" creates the project immediately in
 * the current workspace (POST /api/v1/projects) and opens the editor.
 */
export default async function DashboardTemplatesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/dashboard/templates");
  const [{ current }, sp] = await Promise.all([getCurrentWorkspace(user), searchParams]);
  const search = parseTemplateSearch(sp);
  const canCreate = current ? current.role !== "viewer" : false;

  return (
    <div className="container-x py-8">
      <PageHeader
        title="Templates"
        description={current ? `Start a new project in ${current.workspace.name} from a runnable starter.` : "Join or create a workspace to start projects from templates."}
        actions={
          <Link href="/templates" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            Public gallery
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        }
      />
      {!current ? (
        <Alert variant="warning" title="No workspace" className="mb-6">
          You are not a member of any workspace yet, so templates cannot be used. Accept a pending invitation or create a workspace from the dashboard.
        </Alert>
      ) : !canCreate ? (
        <Alert variant="info" title="Viewer role" className="mb-6">
          You have the viewer role in {current.workspace.name}. Ask a workspace admin for the editor role to create projects from templates.
        </Alert>
      ) : null}
      <TemplateGallery
        search={search}
        categoryMode="query"
        basePath="/dashboard/templates"
        renderAction={(t) => <UseTemplateButton templateId={t.id} templateName={t.name} workspaceId={current?.workspace.id ?? null} canCreate={canCreate} />}
      />
    </div>
  );
}
