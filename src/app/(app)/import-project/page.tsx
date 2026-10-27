import Link from "next/link";
import { AppPage, PageHeader } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { roleAtLeast } from "@/lib/services/access";
import { capabilities } from "@/lib/env";
import { getGithubAccountDto } from "@/lib/github/accounts";
import { GithubAccountCard } from "@/components/integrations/github-account";
import { ImportProjectForm } from "@/components/integrations/import-project-form";
import { buttonClasses } from "@/components/ui/button";
import { CreateTabs } from "@/components/projects/create-tabs";

export const metadata = { title: "Import from GitHub", robots: { index: false } };

export default async function ImportProjectPage({ searchParams }: { searchParams: Promise<{ repo?: string; workspace?: string }> }) {
  const user = await requireUser("/import-project");
  const sp = await searchParams;
  const [{ current, all }, account] = await Promise.all([getCurrentWorkspace(user), getGithubAccountDto(user.id)]);
  const editable = all.filter((w) => roleAtLeast(w.role, "editor"));
  const defaultWorkspace = (sp.workspace && editable.find((w) => w.workspace.id === sp.workspace)?.workspace.id) || (current && roleAtLeast(current.role, "editor") ? current.workspace.id : null);
  const ready = capabilities.github && account.linked;
  return (
    <AppPage>
      <PageHeader
        title="Import from GitHub"
        description="Create a Codexa project from a repository branch. The project stays linked so you can commit and push from the workspace."
        actions={
          <Link href="/dashboard/github" className={buttonClasses("outline", "sm")}>
            Your repositories
          </Link>
        }
      />
      <CreateTabs current="import" />
      {ready ? (
        <ImportProjectForm workspaces={editable.map((w) => ({ id: w.workspace.id, name: w.workspace.name, role: w.role }))} defaultWorkspaceId={defaultWorkspace} initialRepo={sp.repo ?? null} />
      ) : (
        <div className="max-w-2xl">
          <GithubAccountCard configured={capabilities.github} account={account} next="/import-project" />
        </div>
      )}
    </AppPage>
  );
}
