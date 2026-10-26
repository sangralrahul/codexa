import { requireUser } from "@/lib/auth/guards";
import { isStaff } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { countProjects } from "@/lib/services/projects";
import { getWorkspaceEntitlements } from "@/lib/services/usage";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { current, all } = await getCurrentWorkspace(user);
  // Plan and project count for the sidebar's plan card.
  const [entitlements, projects] = current ? await Promise.all([getWorkspaceEntitlements(current.workspace), countProjects(current.workspace.id)]) : [null, 0];
  return (
    <AppShell
      user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl }}
      workspaces={all.map((w) => ({ id: w.workspace.id, name: w.workspace.name, slug: w.workspace.slug, role: w.role, plan: w.workspace.plan }))}
      currentWorkspaceId={current?.workspace.id ?? null}
      isStaff={isStaff(user)}
      emailVerified={Boolean(user.emailVerifiedAt)}
      usage={entitlements ? { plan: entitlements.plan, projects, projectLimit: entitlements.limits.projects } : null}
    >
      {children}
    </AppShell>
  );
}
