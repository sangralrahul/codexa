import "@/components/app/app.css";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/guards";
import { isStaff } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { countProjects, listRecentProjectsForUser } from "@/lib/services/projects";
import { getRunningProjectIds } from "@/lib/services/dashboard";
import { getWorkspaceEntitlements } from "@/lib/services/usage";
import { PLANS } from "@/config/plans";
import { capabilities } from "@/lib/env";
import { getTemplate } from "@/templates";
import { AppShell } from "@/components/app/app-shell";
import { DEFAULT_TEMPLATE_ID, listTemplateSummaries } from "@/components/projects/template-summaries";

/** The next plan up and what it adds, for the sidebar's upgrade card (numbers come from the plan config). */
function upsellFor(plan: string) {
  if (plan !== "free") return null;
  const pro = PLANS.pro;
  const hours = Math.round(pro.limits.runtimeMinutesPerMonth / 60);
  return { plan: pro.name, points: [`${pro.limits.projects} projects`, `${pro.limits.aiRequestsPerMonth.toLocaleString("en-US")} AI requests a month`, `${hours} preview hours`] };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { current, all } = await getCurrentWorkspace(user);
  const names = new Map(all.map((w) => [w.workspace.id, w.workspace.name]));
  // Plan, project count and recent projects (with whether their preview is running) for the sidebar.
  const [entitlements, projects, recent] = await Promise.all([
    current ? getWorkspaceEntitlements(current.workspace) : null,
    current ? countProjects(current.workspace.id) : 0,
    listRecentProjectsForUser(
      all.map((w) => w.workspace.id),
      5,
    ),
  ]);
  const running = await getRunningProjectIds(recent.map((p) => p.id));
  const collapsed = (await cookies()).get("codexa_sidebar")?.value === "collapsed";
  const templates = listTemplateSummaries();
  const starter = getTemplate(DEFAULT_TEMPLATE_ID);
  return (
    <AppShell
      user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl }}
      workspaces={all.map((w) => ({ id: w.workspace.id, name: w.workspace.name, slug: w.workspace.slug, role: w.role, plan: w.workspace.plan }))}
      currentWorkspaceId={current?.workspace.id ?? null}
      isStaff={isStaff(user)}
      emailVerified={Boolean(user.emailVerifiedAt)}
      emailConfigured={capabilities.email}
      devMailbox={process.env.NODE_ENV !== "production"}
      usage={entitlements ? { plan: entitlements.plan, projects, projectLimit: entitlements.limits.projects } : null}
      recent={recent.map((p) => ({
        id: p.id,
        name: p.name,
        templateId: p.templateId,
        templateName: (p.templateId && getTemplate(p.templateId)?.name) || null,
        framework: p.framework,
        running: running.has(p.id),
        workspaceName: names.get(p.workspaceId) ?? "Workspace",
        updatedAt: (p.lastOpenedAt ?? p.updatedAt).toISOString(),
      }))}
      upsell={entitlements ? upsellFor(entitlements.plan) : null}
      initialCollapsed={collapsed}
      templates={templates.map((t) => ({ id: t.id, name: t.name, category: t.category, framework: t.framework, frameworkName: t.frameworkName }))}
      defaultTemplate={{ id: DEFAULT_TEMPLATE_ID, name: starter?.name ?? "React starter", fileCount: starter ? Object.keys(starter.files).length : undefined }}
    >
      {children}
    </AppShell>
  );
}
