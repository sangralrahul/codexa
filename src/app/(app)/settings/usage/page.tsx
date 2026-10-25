import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { getWorkspaceEntitlements } from "@/lib/services/usage";
import { countProjects } from "@/lib/services/projects";
import { listMembers } from "@/lib/services/workspaces";
import { PageHeader } from "@/components/app/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { UsageMeters } from "@/components/settings/usage-meters";

export const metadata = pageMetadata({ title: "Usage", description: "AI requests, runtime minutes, deployments and storage used this period.", path: "/settings/usage", noindex: true });

export default async function UsageSettingsPage() {
  const user = await requireUser("/settings/usage");
  const { current } = await getCurrentWorkspace(user);
  if (!current) {
    return (
      <div>
        <PageHeader title="Usage" />
        <EmptyState title="No workspace selected" action={<Link href="/settings/workspaces/new" className={buttonClasses()}>Create workspace</Link>} />
      </div>
    );
  }
  const ws = current.workspace;
  const [entitlements, projects, members] = await Promise.all([getWorkspaceEntitlements(ws), countProjects(ws.id), listMembers(ws.id)]);
  return (
    <div className="space-y-6">
      <PageHeader title="Usage" description={`What ${ws.name} has used this billing period. Limits are enforced server-side when you generate, run or deploy.`} />
      <Card>
        <CardHeader>
          <CardTitle>This period</CardTitle>
          <CardDescription>
            Usage is metered from real events (AI runs, preview sessions, deployments). Read how each metric is counted on the{" "}
            <Link href="/usage" className="underline">
              usage page
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsageMeters entitlements={entitlements} counts={{ projects, members: members.length }} />
        </CardContent>
      </Card>
    </div>
  );
}
