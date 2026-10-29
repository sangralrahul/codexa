import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { PageHeader } from "@/components/app/app-shell";
import { NoWorkspace } from "@/components/settings/no-workspace";
import { buttonClasses } from "@/components/ui/button";
import { IntegrationsPanel } from "@/components/settings/integrations-panel";

export const metadata = pageMetadata({ title: "Workspace integrations", description: "Connect databases, AI providers, payments, email and hosting to this workspace.", path: "/settings/integrations", noindex: true });

export default async function IntegrationsSettingsPage() {
  const user = await requireUser("/settings/integrations");
  const { current } = await getCurrentWorkspace(user);
  if (!current) {
    return <NoWorkspace title="Integrations" what="its connected services" />;
  }
  const role = current.role;
  return (
    <div className="settings-stack space-y-6">
      <PageHeader
        eyebrow={`Workspace · ${current.workspace.name}`}
        title="Integrations"
        description={`Workspace-level connections for ${current.workspace.name}. Secrets are encrypted before storage and never returned to the browser.`}
        actions={
          <Link href="/integrations" className={buttonClasses("outline", "sm")}>
            Integration directory <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        }
      />
      <IntegrationsPanel workspaceId={current.workspace.id} canManage={role === "owner" || role === "admin"} canTest={role !== "viewer"} />
    </div>
  );
}
