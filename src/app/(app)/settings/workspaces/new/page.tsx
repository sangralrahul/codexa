import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/app/app-shell";
import { NewWorkspaceForm } from "@/components/settings/new-workspace-form";

export const metadata = pageMetadata({ title: "New workspace", description: "Create a workspace for a team or a client.", path: "/settings/workspaces/new", noindex: true });

export default async function NewWorkspacePage() {
  await requireUser("/settings/workspaces/new");
  return (
    <div className="settings-stack space-y-6">
      <PageHeader eyebrow="Workspaces" title="New workspace" description="Workspaces group projects, members and billing. Each one has its own plan." />
      <NewWorkspaceForm />
    </div>
  );
}
