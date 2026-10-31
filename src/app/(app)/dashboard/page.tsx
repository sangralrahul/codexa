import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { roleAtLeast } from "@/lib/services/access";
import { listProjects } from "@/lib/services/projects";
import { getMilestones } from "@/lib/services/dashboard";
import { getRecentDeployments } from "@/lib/services/dashboard-insights";
import { listMembers } from "@/lib/services/workspaces";
import { getWorkspaceEntitlements } from "@/lib/services/usage";
import { capabilities } from "@/lib/env";
import { PLANS } from "@/config/plans";
import { clampIdea } from "@/lib/client/pending-idea";
import { getTemplate } from "@/templates";
import { DEFAULT_TEMPLATE_ID, listTemplateSummaries } from "@/components/projects/template-summaries";
import type { PromptPreset } from "@/components/projects/prompt-box";
import { CHECKLIST_COOKIE } from "@/components/projects/getting-started";
import { buildProjectCards } from "@/components/projects/card-data";
import { Overview } from "@/components/app/overview";
import type { DeploymentRow } from "@/components/projects/deployments-card";

export const metadata = { title: "Overview", robots: { index: false } };

type SearchParams = Promise<{ prompt?: string; template?: string }>;

/** Rows in the recent projects table. */
const RECENT = 8;

function hostOf(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/dashboard");
  const sp = await searchParams;
  const { current, all } = await getCurrentWorkspace(user);
  const workspaceIds = all.map((w) => w.workspace.id);
  const [milestones, entitlements, rows, memberRows] = await Promise.all([
    getMilestones(workspaceIds),
    current ? getWorkspaceEntitlements(current.workspace) : null,
    current ? listProjects(current.workspace.id) : Promise.resolve([]),
    current ? listMembers(current.workspace.id) : Promise.resolve([]),
  ]);
  const projectCount = rows.length;
  // Every project's real state, file/checkpoint counts and the workspace members; the newest five
  // deployments across the whole workspace for the aside.
  const touched = (p: (typeof rows)[number]) => (p.lastOpenedAt ?? p.updatedAt).getTime();
  const recentRows = [...rows].sort((a, b) => touched(b) - touched(a)).slice(0, RECENT);
  const [{ items: projectItems }, recentDeploys] = await Promise.all([
    current ? buildProjectCards(recentRows, { id: current.workspace.id, name: current.workspace.name, role: current.role }) : Promise.resolve({ items: [], statuses: new Map(), members: [] }),
    getRecentDeployments(
      rows.map((p) => p.id),
      5,
    ),
  ]);
  const canRollback = Boolean(current && roleAtLeast(current.role, "admin"));
  const deployments: DeploymentRow[] = recentDeploys.map((d) => ({
    id: d.id,
    projectId: d.projectId,
    projectName: d.projectName,
    provider: d.provider,
    status: d.status,
    at: (d.finishedAt ?? d.createdAt).toISOString(),
    url: d.url,
    host: d.status === "live" || d.status === "rolled_back" ? hostOf(d.url) : null,
    error: d.error,
    canRollback,
  }));
  const checklistDismissed = (await cookies()).get(CHECKLIST_COOKIE)?.value === "done";

  // Idea passport: ?prompt= (clamped) and ?template= (only a real template id).
  const carriedPrompt = clampIdea(Array.isArray(sp.prompt) ? sp.prompt[0] : sp.prompt) || undefined;
  const rawTemplate = Array.isArray(sp.template) ? sp.template[0] : sp.template;
  const carriedTemplate = rawTemplate && getTemplate(rawTemplate) ? rawTemplate : undefined;

  const editable = all.filter((w) => roleAtLeast(w.role, "editor"));
  const createIn = current && roleAtLeast(current.role, "editor") ? current.workspace.id : (editable[0]?.workspace.id ?? null);
  const canCreate = Boolean(createIn);

  const templates = listTemplateSummaries();
  const byCategory = (c: string) => templates.find((t) => t.category === c)?.id;
  const presetDefs: (Omit<PromptPreset, "templateId"> & {
    templateId?: string;
  })[] = [
    {
      label: "Landing page",
      prompt: "A landing page for a coffee subscription with pricing, FAQ and an email signup.",
      templateId: byCategory("landing-pages"),
    },
    {
      label: "Dashboard",
      prompt: "A sales dashboard with revenue charts, a customers table and date filters.",
      templateId: byCategory("dashboards"),
    },
    {
      label: "AI chat app",
      prompt: "A support chatbot with a conversation sidebar and saved chats.",
      templateId: byCategory("ai-tools"),
    },
    {
      label: "Online store",
      prompt: "An online store for handmade candles with a product grid, filters and a cart.",
      templateId: byCategory("ecommerce"),
    },
    {
      label: "Portfolio",
      prompt: "A personal portfolio with a projects grid, about section and contact form.",
      templateId: byCategory("portfolios"),
    },
    {
      label: "REST API",
      prompt: "A REST API for a library: books, members and loans with validation.",
      templateId: templates.find((t) => t.framework === "node-express")?.id,
    },
  ];
  const presets = presetDefs.filter((p): p is PromptPreset => Boolean(p.templateId));

  const m = milestones;
  // Shown until every step is done (or dismissed); a finished checklist is noise.
  const showChecklist = canCreate && !checklistDismissed && !(m.project && m.preview && m.deploy);

  return (
    <Overview
      composer={{
        workspaceId: createIn,
        workspaces: editable.map((w) => ({ id: w.workspace.id, name: w.workspace.name, plan: w.workspace.plan })),
        templateId: DEFAULT_TEMPLATE_ID,
        templates: templates.map((t) => ({ id: t.id, name: t.name, category: t.category, framework: t.framework, frameworkName: t.frameworkName, fileCount: t.fileCount })),
        presets,
        aiConfigured: capabilities.ai,
        atLimit:
          current && entitlements && createIn === current.workspace.id && entitlements.limits.projects > 0 && projectCount >= entitlements.limits.projects
            ? { workspaceId: current.workspace.id, used: projectCount, limit: entitlements.limits.projects, plan: PLANS[entitlements.plan].name }
            : null,
        initialPrompt: carriedPrompt,
        initialTemplateId: carriedTemplate,
      }}
      showPresets={projectCount === 0}
      projects={projectItems}
      projectCount={projectCount}
      deployments={deployments}
      entitlements={entitlements ? { plan: entitlements.plan, periodStart: entitlements.periodStart, limits: entitlements.limits, used: entitlements.used } : null}
      members={memberRows.map((mr) => ({ id: mr.userId, name: mr.name?.trim() || mr.email, avatarUrl: mr.avatarUrl ?? null, role: mr.role }))}
      memberLimit={entitlements ? entitlements.limits.members : null}
      canCreate={canCreate}
      checklist={showChecklist ? { milestones: m, emailVerified: Boolean(user.emailVerifiedAt), emailConfigured: capabilities.email } : null}
    />
  );
}
