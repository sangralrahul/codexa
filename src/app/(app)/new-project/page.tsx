import { PageHeader } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { roleAtLeast } from "@/lib/services/access";
import { getTemplate } from "@/templates";
import { DEFAULT_TEMPLATE_ID, listTemplateSummaries } from "@/components/projects/template-summaries";
import { NewProjectForm } from "@/components/projects/new-project-form";

export const metadata = { title: "New project", robots: { index: false } };

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ template?: string; workspace?: string }> }) {
  const user = await requireUser("/new-project");
  const sp = await searchParams;
  const { current, all } = await getCurrentWorkspace(user);
  const editable = all.filter((w) => roleAtLeast(w.role, "editor"));
  const requested = sp.template && getTemplate(sp.template) ? sp.template : DEFAULT_TEMPLATE_ID;
  const defaultWorkspace = (sp.workspace && editable.find((w) => w.workspace.id === sp.workspace)?.workspace.id) || (current && roleAtLeast(current.role, "editor") ? current.workspace.id : null);
  return (
    <div className="container-x py-8">
      <PageHeader title="New project" description="Pick a template and a workspace. You can change the name, visibility and settings later." />
      <NewProjectForm
        templates={listTemplateSummaries()}
        workspaces={editable.map((w) => ({ id: w.workspace.id, name: w.workspace.name, role: w.role, plan: w.workspace.plan }))}
        defaultWorkspaceId={defaultWorkspace}
        defaultTemplateId={requested}
      />
    </div>
  );
}
