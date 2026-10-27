import Link from "next/link";
import { DoorOpen } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { getEffectivePlan } from "@/lib/services/usage";
import { latestSubscription } from "@/lib/billing/webhooks";
import { grantsEntitlements } from "@/lib/billing/state";
import { providerAvailability } from "@/lib/billing/service";
import { PLANS } from "@/config/plans";
import { PageHeader } from "@/components/app/app-shell";
import { SettingsCard } from "@/components/settings/section";
import { EmptyState } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { WorkspaceGeneralForm } from "@/components/settings/workspace-general-form";
import { LeaveWorkspaceButton } from "@/components/settings/members-panel";

export const metadata = pageMetadata({ title: "Workspace settings", description: "Workspace name, slug and billing currency.", path: "/settings/workspace", noindex: true });

export default async function WorkspaceSettingsPage() {
  const user = await requireUser("/settings/workspace");
  const { current } = await getCurrentWorkspace(user);
  if (!current) {
    return (
      <div>
        <PageHeader title="Workspace" />
        <EmptyState title="No workspace selected" description="Create a workspace to manage its settings." action={<Link href="/settings/workspaces/new" className={buttonClasses()}>Create workspace</Link>} />
      </div>
    );
  }
  const ws = current.workspace;
  const [sub, plan] = await Promise.all([latestSubscription(ws.id), getEffectivePlan(ws)]);
  const canEdit = current.role === "owner" || current.role === "admin";
  return (
    <div className="settings-stack space-y-6">
      <PageHeader eyebrow={`Workspace · ${ws.name}`} title="Workspace" description={`General settings for ${ws.name}.`} />
      <WorkspaceGeneralForm
        workspaceId={ws.id}
        initial={{ name: ws.name, slug: ws.slug, billingCurrency: ws.billingCurrency }}
        canEdit={canEdit}
        hasSubscription={Boolean(sub && grantsEntitlements(sub.status) && sub.provider !== "manual")}
        providers={providerAvailability()}
        meta={{ role: current.role, plan: PLANS[plan].name, createdAt: ws.createdAt.toISOString() }}
      />
      <SettingsCard
        id="leave"
        tone="danger"
        icon={<DoorOpen />}
        title="Leave workspace"
        description="You will lose access to its projects. The last owner must transfer ownership first."
        hint={
          current.role === "owner" ? (
            <>
              You are an owner. If you are the only one, transfer ownership on the{" "}
              <Link href="/settings/members" className="underline underline-offset-2 hover:text-foreground">
                Members
              </Link>{" "}
              page first.
            </>
          ) : (
            "You can be invited back later by an owner or admin."
          )
        }
        footer={<LeaveWorkspaceButton workspaceId={ws.id} userId={user.id} workspaceName={ws.name} />}
      />
    </div>
  );
}
