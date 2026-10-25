import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { PageHeader } from "@/components/app/app-shell";
import { EmptyState } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { IntegrationsPanel } from "@/components/settings/integrations-panel";

export const metadata = pageMetadata({ title: "Workspace integrations", description: "Connect databases, AI providers, payments, email and hosting to this workspace.", path: "/settings/integrations", noindex: true });

export default async function IntegrationsSettingsPage() {
  const user = await requireUser("/settings/integrations");
  const { current } = await getCurrentWorkspace(user);
  if (!current) {
    return (
      <div>
        <PageHeader title="Integrations" />
        <EmptyState title="No workspace selected" action={<Link href="/settings/workspaces/new" className={buttonClasses()}>Create workspace</Link>} />
      </div>
    );
  }
  return (
    <div>
      <PageHeader
        title="Integrations"
        description={`Workspace-level connections for ${current.workspace.name}. Secrets are encrypted before storage and never returned to the browser.`}
        actions={
          <Link href="/integrations" className={buttonClasses("outline", "sm")}>
            Integration directory
          </Link>
        }
      />
      <IntegrationsPanel workspaceId={current.workspace.id} canManage={current.role === "owner" || current.role === "admin"} />
    </div>
  );
}
