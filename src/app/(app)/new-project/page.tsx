import { AppPage, PageHeader } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { roleAtLeast } from "@/lib/services/access";
import { capabilities } from "@/lib/env";
import { getTemplate } from "@/templates";
import { DEFAULT_TEMPLATE_ID, listTemplateSummaries } from "@/components/projects/template-summaries";
import { NewProjectForm } from "@/components/projects/new-project-form";
import type { PromptPreset } from "@/components/projects/prompt-box";

export const metadata = { title: "New project", robots: { index: false } };

type SearchParams = Promise<{ template?: string; workspace?: string; tab?: string }>;

export default async function NewProjectPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/new-project");
  const sp = await searchParams;
  const { current, all } = await getCurrentWorkspace(user);
  const editable = all.filter((w) => roleAtLeast(w.role, "editor"));
  const requested = sp.template && getTemplate(sp.template) ? sp.template : null;
  const defaultWorkspace = (sp.workspace && editable.find((w) => w.workspace.id === sp.workspace)?.workspace.id) || (current && roleAtLeast(current.role, "editor") ? current.workspace.id : null);
  const templates = listTemplateSummaries();
  const byCategory = (c: string) => templates.find((t) => t.category === c)?.id;
  const presets = [
    { label: "Landing page", prompt: "A landing page for a coffee subscription with pricing, FAQ and an email signup.", templateId: byCategory("landing-pages") },
    { label: "Dashboard", prompt: "A sales dashboard with revenue charts, a customers table and date filters.", templateId: byCategory("dashboards") },
    { label: "Online store", prompt: "An online store for handmade candles with a product grid, filters and a cart.", templateId: byCategory("ecommerce") },
    { label: "REST API", prompt: "A REST API for a library: books, members and loans with validation.", templateId: templates.find((t) => t.framework === "node-express")?.id },
  ].filter((p): p is PromptPreset => Boolean(p.templateId));
  // ?template= (or ?tab=template) opens the template tab with that starter selected.
  const initialTab = requested || sp.tab === "template" ? "template" : "describe";
  return (
    <AppPage>
      <PageHeader title="New project" description="Describe what you want, start from a runnable template, or bring a repository. You can rename it and change who can open it later." />
      <NewProjectForm
        templates={templates}
        workspaces={editable.map((w) => ({ id: w.workspace.id, name: w.workspace.name, role: w.role, plan: w.workspace.plan }))}
        defaultWorkspaceId={defaultWorkspace}
        defaultTemplateId={requested ?? DEFAULT_TEMPLATE_ID}
        initialTab={initialTab}
        presets={presets}
        aiConfigured={capabilities.ai}
      />
    </AppPage>
  );
}
