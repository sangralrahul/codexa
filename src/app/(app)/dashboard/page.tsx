import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { roleAtLeast } from "@/lib/services/access";
import { listProjects } from "@/lib/services/projects";
import { getMilestones, getProjectStatuses, getRecentActivity } from "@/lib/services/dashboard";
import { serializeProject } from "@/app/api/v1/projects/_lib/serialize";
import type { ProjectCardItem } from "@/components/projects/project-card";
import { getWorkspaceEntitlements } from "@/lib/services/usage";
import { capabilities } from "@/lib/env";
import { PLANS } from "@/config/plans";
import { clampIdea } from "@/lib/client/pending-idea";
import { getTemplate, summarizeTemplate, TEMPLATES } from "@/templates";
import { DEFAULT_TEMPLATE_ID, listTemplateSummaries, templateCategory } from "@/components/projects/template-summaries";
import type { PromptPreset } from "@/components/projects/prompt-box";
import { CHECKLIST_COOKIE } from "@/components/projects/getting-started";
import { toStatusDto } from "@/components/projects/status";
import { DashboardCockpit } from "@/components/projects/dashboard-cockpit";
import type { DeploymentRow } from "@/components/projects/deployments-card";
import type { RiverItem } from "@/components/projects/activity-river";
import type { TemplateCardData } from "@/components/templates";

export const metadata = { title: "Dashboard", robots: { index: false } };

type SearchParams = Promise<{ prompt?: string; template?: string }>;

/** The starters the templates strip leads with (the gallery's featured lead), then featured order. */
const FIRST_RUN = ["vite-react-dashboard", "vite-react-storefront", "vite-react-saas"];
/** Rows in the recent projects table. */
const RECENT = 8;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/dashboard");
  const sp = await searchParams;
  const { current, all } = await getCurrentWorkspace(user);
  const workspaceIds = all.map((w) => w.workspace.id);
  const [milestones, entitlements, rows, activity] = await Promise.all([
    getMilestones(workspaceIds),
    current ? getWorkspaceEntitlements(current.workspace) : null,
    current ? listProjects(current.workspace.id) : Promise.resolve([]),
    getRecentActivity(workspaceIds, 8),
  ]);
  const projectCount = rows.length;
  // Every project's real state (running preview, live deployment, newest deployment): the table shows
  // the recent ones, the deployments card the newest deployments across the whole workspace.
  const statuses = await getProjectStatuses(rows.map((p) => p.id));
  const touched = (p: (typeof rows)[number]) => (p.lastOpenedAt ?? p.updatedAt).getTime();
  const recentRows = [...rows].sort((a, b) => touched(b) - touched(a)).slice(0, RECENT);
  const projectItems: ProjectCardItem[] = recentRows.map((p) => {
    const s = serializeProject(p);
    return {
      ...s,
      lastOpenedAt: s.lastOpenedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      workspaceName: current!.workspace.name,
      role: current!.role,
      category: templateCategory(s.templateId),
      status: toStatusDto(statuses.get(p.id)),
    };
  });
  const deployments: DeploymentRow[] = rows
    .flatMap((p) => {
      const s = statuses.get(p.id);
      if (!s?.lastDeploy) return [];
      const live = s.live && s.lastDeploy.status === "live" ? s.live : null;
      return [{ projectId: p.id, projectName: p.name, status: s.lastDeploy.status, at: s.lastDeploy.at.toISOString(), url: live?.url ?? null, host: live?.host ?? null, error: s.lastDeploy.error }];
    })
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 5);
  const river: RiverItem[] = activity.map((a) => ({
    id: a.id,
    projectId: a.projectId,
    projectName: a.projectName,
    kind: a.kind,
    message: a.message,
    actorId: a.actorId,
    actorName: a.actorName,
    actorSeed: a.actorSeed,
    actorAvatarUrl: a.actorAvatarUrl,
    createdAt: a.createdAt.toISOString(),
    count: a.count,
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

  const firstName = (user.name || user.email.split("@")[0]).split(/\s+/)[0];

  const m = milestones;
  // Shown until every step is done (or dismissed); a finished checklist is noise.
  const showChecklist = canCreate && !checklistDismissed && !(m.project && m.preview && m.deploy);
  const cards: TemplateCardData[] = TEMPLATES.map(summarizeTemplate);
  const cardById = new Map(cards.map((c) => [c.id, c]));
  // Templates strip: the first-run starters first, then the rest of the featured order.
  const order = [...FIRST_RUN, ...templates.map((t) => t.id)];
  const showcase = [...new Set(order)]
    .map((id) => cardById.get(id))
    .filter((c): c is TemplateCardData => Boolean(c))
    .slice(0, 4);

  return (
    <DashboardCockpit
      firstName={firstName}
      workspace={current ? { name: current.workspace.name, plan: PLANS[entitlements?.plan ?? current.workspace.plan].name, role: current.role } : null}
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
      projects={projectItems}
      projectCount={projectCount}
      deployments={deployments}
      activity={river}
      entitlements={
        entitlements
          ? { plan: entitlements.plan, periodStart: entitlements.periodStart, limits: entitlements.limits, used: entitlements.used }
          : null
      }
      milestones={m}
      showChecklist={showChecklist}
      canCreate={canCreate}
      emailVerified={!!user.emailVerifiedAt}
      emailConfigured={capabilities.email}
      createIn={createIn}
      templates={showcase}
      templateCount={TEMPLATES.length}
    />
  );
}
