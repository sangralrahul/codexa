import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { roleAtLeast } from "@/lib/services/access";
import { countProjects } from "@/lib/services/projects";
import { getDashboardOverview } from "@/lib/services/dashboard";
import { getWorkspaceEntitlements } from "@/lib/services/usage";
import { capabilities } from "@/lib/env";
import { PLANS } from "@/config/plans";
import { clampIdea } from "@/lib/client/pending-idea";
import { getTemplate, summarizeTemplate, TEMPLATES } from "@/templates";
import { DEFAULT_TEMPLATE_ID, listTemplateSummaries, templateCategory } from "@/components/projects/template-summaries";
import type { PromptPreset } from "@/components/projects/prompt-box";
import { CHECKLIST_COOKIE } from "@/components/projects/getting-started";
import type { ResumeProject } from "@/components/projects/continue-building";
import { toStatusDto } from "@/components/projects/status";
import { DashboardCockpit } from "@/components/projects/dashboard-cockpit";
import type { TemplateCardData } from "@/components/templates";

export const metadata = { title: "Dashboard", robots: { index: false } };

type SearchParams = Promise<{ prompt?: string; template?: string }>;

/** Time-of-day greeting in the user's own time zone (set in their profile); "Welcome back" when it can't be resolved. */
function greeting(timeZone: string) {
  try {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hourCycle: "h23",
        timeZone,
      }).format(new Date()),
    );
    return hour < 5 ? "Welcome back" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  } catch {
    return "Welcome back";
  }
}

/** The starters the first-run row leads with (the gallery's featured lead), then featured order. */
const FIRST_RUN = ["vite-react-dashboard", "vite-react-storefront", "vite-react-saas"];

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/dashboard");
  const sp = await searchParams;
  const { current, all } = await getCurrentWorkspace(user);
  const workspaceIds = all.map((w) => w.workspace.id);
  const names = new Map(all.map((w) => [w.workspace.id, w.workspace.name]));
  const [overview, entitlements, projectCount] = await Promise.all([
    getDashboardOverview(workspaceIds, { recent: 4, activity: 10 }),
    current ? getWorkspaceEntitlements(current.workspace) : null,
    current ? countProjects(current.workspace.id) : 0,
  ]);
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

  const recent: ResumeProject[] = overview.projects.map(({ project: p, status, lastRun }) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    templateId: p.templateId,
    category: templateCategory(p.templateId) ?? "web-apps",
    framework: p.framework,
    workspaceName: names.get(p.workspaceId) ?? "Workspace",
    lastOpenedAt: p.lastOpenedAt?.toISOString() ?? null,
    updatedAt: p.updatedAt.toISOString(),
    status: toStatusDto(status),
    lastRun: lastRun
      ? {
          status: lastRun.status,
          summary: lastRun.summary,
          changedFiles: lastRun.changedFiles,
          finishedAt: lastRun.finishedAt?.toISOString() ?? null,
          createdAt: lastRun.createdAt.toISOString(),
        }
      : null,
  }));
  const firstRun = recent.length === 0;
  const hello = `${user.timezone && user.timezone !== "UTC" ? greeting(user.timezone) : firstRun ? "Welcome" : "Welcome back"}, ${firstName}`;
  const m = overview.milestones;
  const showChecklist = canCreate && !(checklistDismissed && m.project && m.preview && m.deploy);
  const cards: TemplateCardData[] = TEMPLATES.map(summarizeTemplate);
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const starters = FIRST_RUN.map((id) => cardById.get(id)).filter((c): c is TemplateCardData => Boolean(c));
  const quickStarts = templates
    .slice(0, 6)
    .map((t) => cardById.get(t.id))
    .filter((c): c is TemplateCardData => Boolean(c));

  return (
    <DashboardCockpit
      greeting={current ? hello : `Hi ${firstName}`}
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
      recent={recent}
      activity={overview.activity.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))}
      milestones={m}
      showChecklist={showChecklist}
      canCreate={canCreate}
      emailVerified={!!user.emailVerifiedAt}
      emailConfigured={capabilities.email}
      createIn={createIn}
      usage={current && entitlements ? { workspaceName: current.workspace.name, entitlements, projectCount } : null}
      starters={starters}
      quickStarts={quickStarts}
      templateCount={TEMPLATES.length}
    />
  );
}
