import Link from "next/link";
import { DoorOpen } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { getEffectivePlan } from "@/lib/services/usage";
import { latestSubscription } from "@/lib/billing/webhooks";
import { grantsEntitlements } from "@/lib/billing/state";
import { providerAvailability } from "@/lib/billing/service";
import { listMembers } from "@/lib/services/workspaces";
import { PLANS } from "@/config/plans";
import { PageHeader } from "@/components/app/app-shell";
import { NoWorkspace } from "@/components/settings/no-workspace";
import { SettingsCard } from "@/components/settings/section";
import { WorkspaceGeneralForm } from "@/components/settings/workspace-general-form";
import { LeaveWorkspaceButton } from "@/components/settings/members-panel";

export const metadata = pageMetadata({ title: "Workspace settings", description: "Workspace name, slug and billing currency.", path: "/settings/workspace", noindex: true });

export default async function WorkspaceSettingsPage() {
  const user = await requireUser("/settings/workspace");
  const { current } = await getCurrentWorkspace(user);
  if (!current) {
    return <NoWorkspace title="Workspace" what="its name, URL and currency" />;
  }
  const ws = current.workspace;
  const [sub, plan, members] = await Promise.all([latestSubscription(ws.id), getEffectivePlan(ws), listMembers(ws.id)]);
  const canEdit = current.role === "owner" || current.role === "admin";
  // Mirrors the server rule (src/lib/billing/teams.ts): the last owner cannot leave until ownership is shared.
  const lastOwner = current.role === "owner" && members.filter((m) => m.role === "owner").length <= 1;
  return (
    <div className="settings-stack space-y-6">
      <PageHeader eyebrow={`Workspace · ${ws.name}`} title="Workspace" description={`Name, URL slug, billing currency and membership for ${ws.name}.`} />
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
          lastOwner ? (
            <>
              You are the only owner. Make someone else an owner on the{" "}
              <Link href="/settings/members" className="underline underline-offset-2 hover:text-foreground">
                Members
              </Link>{" "}
              page before you leave.
            </>
          ) : current.role === "owner" ? (
            "Another owner keeps the workspace running after you leave."
          ) : (
            "You can be invited back later by an owner or admin."
          )
        }
        footer={
          <LeaveWorkspaceButton
            workspaceId={ws.id}
            userId={user.id}
            workspaceName={ws.name}
            blockedReason={lastOwner ? "You're the only owner. Make someone else an owner first." : null}
          />
        }
      />
    </div>
  );
}
