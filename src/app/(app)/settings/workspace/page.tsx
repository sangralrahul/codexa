import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { latestSubscription } from "@/lib/billing/webhooks";
import { grantsEntitlements } from "@/lib/billing/state";
import { PageHeader } from "@/components/app/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/misc";
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
  const sub = await latestSubscription(ws.id);
  const canEdit = current.role === "owner" || current.role === "admin";
  return (
    <div className="space-y-6">
      <PageHeader title="Workspace" description={`General settings for ${ws.name}.`} />
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Name, URL slug and the currency used at checkout.</CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceGeneralForm
            workspaceId={ws.id}
            initial={{ name: ws.name, slug: ws.slug, billingCurrency: ws.billingCurrency }}
            canEdit={canEdit}
            hasSubscription={Boolean(sub && grantsEntitlements(sub.status) && sub.provider !== "manual")}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Leave workspace</CardTitle>
          <CardDescription>You will lose access to its projects. The last owner must transfer ownership first.</CardDescription>
        </CardHeader>
        <CardContent>
          {current.role === "owner" ? (
            <Alert variant="info" className="mb-3">
              You are an owner. Transfer ownership to another member on the{" "}
              <Link href="/settings/members" className="underline">
                Members
              </Link>{" "}
              page before leaving if you are the only owner.
            </Alert>
          ) : null}
          <LeaveWorkspaceButton workspaceId={ws.id} userId={user.id} workspaceName={ws.name} />
        </CardContent>
      </Card>
    </div>
  );
}
