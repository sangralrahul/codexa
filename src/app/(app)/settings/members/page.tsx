import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { getEffectivePlan } from "@/lib/services/usage";
import { getTeam } from "@/lib/billing/team-service";
import { capabilities } from "@/lib/env";
import { PLANS } from "@/config/plans";
import { PageHeader } from "@/components/app/app-shell";
import { EmptyState } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { MembersPanel } from "@/components/settings/members-panel";

export const metadata = pageMetadata({ title: "Members", description: "Invite teammates, change roles and manage invitations.", path: "/settings/members", noindex: true });

export default async function MembersSettingsPage() {
  const user = await requireUser("/settings/members");
  const { current } = await getCurrentWorkspace(user);
  if (!current) {
    return (
      <div>
        <PageHeader title="Members" />
        <EmptyState title="No workspace selected" action={<Link href="/settings/workspaces/new" className={buttonClasses()}>Create workspace</Link>} />
      </div>
    );
  }
  const ws = current.workspace;
  const [team, plan] = await Promise.all([getTeam(ws.id), getEffectivePlan(ws)]);
  const canManage = current.role === "owner" || current.role === "admin";
  return (
    <div>
      <PageHeader title="Members" description={`People with access to ${ws.name}. ${PLANS[plan].name} plan: ${PLANS[plan].limits.members < 0 ? "unlimited seats" : `${PLANS[plan].limits.members} seat${PLANS[plan].limits.members === 1 ? "" : "s"}`}.`} />
      <MembersPanel
        workspaceId={ws.id}
        currentUserId={user.id}
        role={current.role}
        members={team.members}
        invites={canManage ? team.invites : []}
        seats={{ used: team.members.length, limit: PLANS[plan].limits.members }}
        emailConfigured={capabilities.email}
      />
    </div>
  );
}
