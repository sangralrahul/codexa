import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { getEffectivePlan } from "@/lib/services/usage";
import { PLANS } from "@/config/plans";
import { PageHeader } from "@/components/app/app-shell";
import { SettingsCard, tableHead, tableRow } from "@/components/settings/section";
import { SwitchWorkspaceButton } from "@/components/settings/workspaces-list";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = pageMetadata({ title: "Workspaces", description: "Every workspace you belong to, your role and its plan.", path: "/settings/workspaces", noindex: true });

const ROLE_LABEL = { owner: "Owner", admin: "Admin", editor: "Editor", viewer: "Viewer" } as const;

export default async function WorkspacesSettingsPage() {
  const user = await requireUser("/settings/workspaces");
  const { current, all } = await getCurrentWorkspace(user);
  // Membership rows come from the signed-in user's own memberships only, so every row is accessible.
  const plans = await Promise.all(all.map((w) => getEffectivePlan(w.workspace)));
  const rows = all.map((w, i) => ({ ...w, plan: PLANS[plans[i]].name, current: w.workspace.id === current?.workspace.id }));
  const created = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const newButton = (
    <Link href="/settings/workspaces/new" className={buttonClasses("primary", "sm")}>
      <Plus className="size-3.5" aria-hidden="true" /> New workspace
    </Link>
  );

  return (
    <div className="settings-stack space-y-6">
      <PageHeader eyebrow="Account" title="Workspaces" description="Every workspace you belong to. Each has its own projects, members and plan." actions={rows.length ? newButton : undefined} />
      {rows.length ? (
        <SettingsCard
          id="workspaces"
          icon={<Building2 />}
          title={
            <>
              Your workspaces <span className="font-normal tabular-nums text-muted-foreground">{rows.length}</span>
            </>
          }
          description="Switching changes which workspace the app, the sidebar and these settings show."
          flush
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Workspaces you belong to</caption>
              <thead>
                <tr className="border-t border-border/80">
                  <th scope="col" className={cn(tableHead, "pl-5 sm:pl-6")}>
                    Workspace
                  </th>
                  <th scope="col" className={cn(tableHead, "hidden sm:table-cell")}>
                    Role
                  </th>
                  <th scope="col" className={cn(tableHead, "hidden md:table-cell")}>
                    Plan
                  </th>
                  <th scope="col" className={cn(tableHead, "hidden lg:table-cell")}>
                    Created
                  </th>
                  <th scope="col" className={cn(tableHead, "pr-5 text-right sm:pr-6")}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ workspace: ws, role, plan, current: isCurrent }) => (
                  <tr key={ws.id} className={tableRow}>
                    <td className="w-full max-w-0 py-3 pl-5 pr-3 sm:pl-6">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={ws.name} seed={ws.id} shape="square" size="md" />
                        <div className="min-w-0">
                          <p className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-medium">{ws.name}</span>
                            {isCurrent ? <Badge variant="success">Current</Badge> : null}
                          </p>
                          <p className="truncate font-mono text-xs text-muted-foreground">/{ws.slug}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                            {ROLE_LABEL[role]} · {plan} plan
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-3 text-muted-foreground sm:table-cell">{ROLE_LABEL[role]}</td>
                    <td className="hidden whitespace-nowrap px-3 py-3 md:table-cell">
                      <Badge variant="outline">{plan}</Badge>
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-3 text-muted-foreground lg:table-cell">{created(ws.createdAt)}</td>
                    <td className="whitespace-nowrap py-3 pl-3 pr-5 text-right sm:pr-6">
                      {isCurrent ? (
                        <Link href="/settings/workspace" className={buttonClasses("ghost", "sm")} aria-label={`Manage ${ws.name}`}>
                          Manage
                        </Link>
                      ) : (
                        <SwitchWorkspaceButton workspaceId={ws.id} workspaceName={ws.name} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SettingsCard>
      ) : (
        <EmptyState
          icon={<Building2 />}
          title="No workspaces yet"
          description="A workspace holds projects, members and a plan. Create one to get started; it starts on the Free plan."
          action={newButton}
        />
      )}
    </div>
  );
}
