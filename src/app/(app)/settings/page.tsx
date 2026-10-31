import Link from "next/link";
import { Plus } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentSessionId } from "@/lib/auth/session";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { getSettingsOverview } from "@/lib/services/settings-overview";
import { getUsageHistory } from "@/lib/services/usage-history";
import { PageHeader } from "@/components/app/app-shell";
import { EmptyState } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { IdentityRow, OverviewBento, SetupChecklist } from "@/components/settings/overview";

export const metadata = pageMetadata({ title: "Settings", description: "Manage your account and workspace settings.", path: "/settings", noindex: true });

export default async function SettingsIndexPage() {
  const user = await requireUser("/settings");
  const { current } = await getCurrentWorkspace(user);
  const workspaceId = current?.workspace.id ?? null;
  // The usage tile's sparkline reads the same daily usage_events the Usage page shows.
  const [data, history] = await Promise.all([getSettingsOverview(user, workspaceId, await getCurrentSessionId()), workspaceId ? getUsageHistory(user, workspaceId) : null]);
  return (
    <div className="settings-stack space-y-5">
      <PageHeader eyebrow="Account and workspace" title="Settings" description="Your account, security and workspace at a glance. Every number here is live." />
      <IdentityRow account={data.account} workspace={data.workspace} />
      <SetupChecklist items={data.checklist} emailConfigured={data.account.emailConfigured} />
      <section aria-label="Settings overview" className="settings-plain">
        <OverviewBento data={data} usageDays={history?.days} />
        {!data.workspace ? (
          <EmptyState
            className="mt-3"
            icon={<Plus />}
            title="No workspace selected"
            description="Create a workspace to manage members, billing, usage and integrations."
            action={
              <Link href="/settings/workspaces/new" className={buttonClasses("primary", "sm")}>
                Create workspace
              </Link>
            }
          />
        ) : null}
      </section>
    </div>
  );
}
