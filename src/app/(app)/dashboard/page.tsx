import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, ArrowUpRight, BookOpen, Database, FolderGit2, Globe2, MessageSquareText, Rocket } from "lucide-react";
import { AppPage } from "@/components/app/app-shell";
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
import { PromptBox, type PromptPreset } from "@/components/projects/prompt-box";
import { UsageCard } from "@/components/projects/usage-card";
import { CHECKLIST_COOKIE, GettingStarted } from "@/components/projects/getting-started";
import { ContinueBuilding, type ResumeProject } from "@/components/projects/continue-building";
import { ActivityRiver } from "@/components/projects/activity-river";
import { toStatusDto } from "@/components/projects/status";
import { TemplateShowcase } from "@/components/projects/template-showcase";
import { TemplateTile, UseTemplateButton, type TemplateCardData } from "@/components/templates";

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

const GUIDES = [
  {
    href: "/docs/quickstart",
    title: "Quickstart",
    body: "From a prompt to a running preview in a few minutes.",
    icon: Rocket,
  },
  {
    href: "/docs/prompting",
    title: "Writing good prompts",
    body: "Patterns that get maintainable code from the agent.",
    icon: MessageSquareText,
  },
  {
    href: "/docs/databases",
    title: "Connect a database",
    body: "PostgreSQL or Supabase, schema browser and SQL.",
    icon: Database,
  },
  {
    href: "/docs/custom-domains",
    title: "Deploy and custom domains",
    body: "Publish, roll back and point your own domain.",
    icon: Globe2,
  },
];

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

  const learn = (cols: 2 | 4) => (
    <section aria-labelledby="learn-title" className="pb-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="learn-title" className="text-[15px] font-semibold tracking-[-0.01em]">
          Learn
        </h2>
        <Link href="/docs" className="link-draw inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
          <BookOpen className="size-3.5" aria-hidden="true" /> All docs
        </Link>
      </div>
      <ul className={cols === 4 ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-4" : "grid gap-3 sm:grid-cols-2"}>
        {GUIDES.map((g) => (
          <li key={g.href}>
            <Link
              href={g.href}
              className="e1 group/learn flex h-full flex-col rounded-[16px] p-4 transition-[border-color,box-shadow,translate] duration-(--dur-3) hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-lg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring calm:hover:translate-y-0"
            >
              <span className="flex items-center gap-2 text-[14px] font-medium">
                <g.icon className="size-4 text-signal-ink" aria-hidden="true" />
                {g.title}
                <ArrowUpRight
                  className="ml-auto size-4 text-muted-foreground transition-transform duration-(--dur-3) group-hover/learn:-translate-y-0.5 group-hover/learn:translate-x-0.5 calm:transition-none"
                  aria-hidden="true"
                />
              </span>
              <span className="mt-1.5 block text-[13px] leading-relaxed text-muted-foreground">{g.body}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <>
      {/* (a) Compact hero: greeting, headline, the composer. The light behind it listens to the composer (CSS only). */}
      <div className="dash-hero">
        <div className="dash-glow" aria-hidden="true" />
        <AppPage className="pb-4 pt-8 lg:pb-6 lg:pt-12">
          <section aria-labelledby="dash-title" className="mx-auto max-w-4xl">
            <p className="text-center font-mono text-[11.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{current ? hello : `Hi ${firstName}`}</p>
            <h1 id="dash-title" className="text-app-display mt-3 text-balance text-center">
              What will you <span className="text-dim">build</span> today?
            </h1>
            <div className="mt-7">
              <PromptBox
                workspaceId={createIn}
                workspaces={editable.map((w) => ({
                  id: w.workspace.id,
                  name: w.workspace.name,
                  plan: w.workspace.plan,
                }))}
                templateId={DEFAULT_TEMPLATE_ID}
                templates={templates.map((t) => ({
                  id: t.id,
                  name: t.name,
                  category: t.category,
                  framework: t.framework,
                  frameworkName: t.frameworkName,
                  fileCount: t.fileCount,
                }))}
                presets={presets}
                aiConfigured={capabilities.ai}
                atLimit={
                  current && entitlements && createIn === current.workspace.id && entitlements.limits.projects > 0 && projectCount >= entitlements.limits.projects
                    ? { workspaceId: current.workspace.id, used: projectCount, limit: entitlements.limits.projects, plan: PLANS[entitlements.plan].name }
                    : null
                }
                initialPrompt={carriedPrompt}
                initialTemplateId={carriedTemplate}
              />
            </div>
          </section>
        </AppPage>
      </div>

      <AppPage className="space-y-10 pt-2 lg:space-y-12">
        {firstRun ? (
          <>
            {showChecklist ? <GettingStarted milestones={m} canCreate={canCreate} layout="row" /> : null}
            <section aria-labelledby="starters-title">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id="starters-title" className="text-[15px] font-semibold tracking-[-0.01em]">
                  Start with one of these
                </h2>
                <Link href="/dashboard/templates" className="link-draw inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
                  All {TEMPLATES.length} templates <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
              <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {starters.map((t, i) => (
                  <TemplateTile
                    key={t.id}
                    template={t}
                    href={`/dashboard/templates?preview=${t.id}`}
                    priority={i === 0}
                    action={<UseTemplateButton templateId={t.id} templateName={t.name} workspaceId={createIn} canCreate={canCreate} fileCount={t.fileCount} />}
                  />
                ))}
                <li className="min-w-0">
                  <Link
                    href="/import-project"
                    className="group/imp flex aspect-[16/10] flex-col justify-between rounded-[16px] border border-dashed border-border-strong bg-surface/40 p-5 transition-[border-color,background-color] duration-(--dur-3) hover:border-foreground/30 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
                      <FolderGit2 className="size-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.01em]">
                        Import from GitHub <ArrowRight className="size-4 transition-transform duration-(--dur-3) group-hover/imp:translate-x-0.5 calm:transition-none" aria-hidden="true" />
                      </span>
                      <span className="mt-1 block text-[13px] text-muted-foreground">Bring an existing repository and keep pushing to it.</span>
                    </span>
                  </Link>
                </li>
              </ul>
            </section>
          </>
        ) : (
          <ContinueBuilding projects={recent} canCreate={canCreate} />
        )}

        {/* (c) Activity river + This month (+ the checklist until it is done). */}
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {firstRun ? (
            learn(2)
          ) : (
            <ActivityRiver
              items={overview.activity.map((a) => ({
                ...a,
                createdAt: a.createdAt.toISOString(),
              }))}
            />
          )}
          <div className="space-y-5">
            {!firstRun && showChecklist ? <GettingStarted milestones={m} canCreate={canCreate} resumeHref={recent[0] ? `/projects/${recent[0].id}` : null} layout="stack" /> : null}
            {current && entitlements ? <UsageCard workspaceName={current.workspace.name} entitlements={entitlements} projectCount={projectCount} /> : null}
          </div>
        </div>

        {/* (d) Quick starts and Learn. */}
        {!firstRun ? (
          <section aria-labelledby="quick-title">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="quick-title" className="text-[15px] font-semibold tracking-[-0.01em]">
                Quick starts
              </h2>
              <Link href="/dashboard/templates" className="link-draw inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
                All {TEMPLATES.length} templates <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            <TemplateShowcase templates={quickStarts} />
          </section>
        ) : null}

        {firstRun ? null : learn(4)}
      </AppPage>
    </>
  );
}
