import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Compass, FolderGit2, LayoutTemplate, Plus, UserPlus, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppPage } from "@/components/app/app-shell";
import { PlanPill } from "@/components/app/workspace-switcher";
import { buttonClasses } from "@/components/ui/button";
import { Kbd } from "@/components/ui/misc";
import { TemplateTile, type TemplateCardData } from "@/components/templates";
import { PromptBox } from "./prompt-box";
import type { ProjectCardItem } from "./project-card";
import { RecentProjects } from "./recent-projects";
import { GettingStarted, type ChecklistMilestones } from "./getting-started";
import { ActivityRiver, type RiverItem } from "./activity-river";
import { DeploymentsCard, type DeploymentRow } from "./deployments-card";
import { KpiRow, type KpiEntitlements, type KpiSeries } from "./kpi-row";
import { SystemStatusCard, SystemStatusSkeleton } from "./system-status-card";
import { PanelCard } from "./panel-card";

const quietLink = "link-draw inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground";

/** One-click entries to the places people otherwise hunt for (all real routes). */
function QuickActions({ canCreate, templateCount }: { canCreate: boolean; templateCount: number }) {
  const items: { href: string; icon: LucideIcon; title: string; detail: string; keys?: string[] }[] = [
    ...(canCreate ? [{ href: "/new-project", icon: Plus, title: "New project", detail: "From a prompt, a template or GitHub", keys: ["N"] }] : []),
    { href: "/dashboard/templates", icon: LayoutTemplate, title: "Browse templates", detail: `${templateCount} working starters`, keys: ["G", "T"] },
    ...(canCreate ? [{ href: "/import-project", icon: FolderGit2, title: "Import from GitHub", detail: "Bring an existing repository" }] : []),
    { href: "/showcase", icon: Compass, title: "Community", detail: "Remix public apps" },
    { href: "/settings/members", icon: UserPlus, title: "Invite your team", detail: "Members and roles" },
  ];
  return (
    <PanelCard title="Quick actions" icon={Zap}>
      <ul className="p-2">
        {items.map(({ href, icon: Icon, title, detail, keys }) => (
          <li key={href}>
            <Link
              href={href}
              className="group/qa flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <span className="icon-tile size-9 rounded-[10px] transition-transform duration-(--dur-3) ease-snap group-hover/qa:scale-105 calm:transition-none" aria-hidden="true">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-foreground">{title}</span>
                <span className="block truncate text-[12px] text-muted-foreground">{detail}</span>
              </span>
              {keys ? (
                <span className="hidden shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-(--dur-2) group-hover/qa:opacity-100 group-focus-visible/qa:opacity-100 md:flex [@media(hover:none)]:hidden" aria-hidden="true">
                  {keys.map((k) => (
                    <Kbd key={k} className="h-[18px] min-w-[18px] border border-border bg-muted px-1 text-[10.5px]">
                      {k}
                    </Kbd>
                  ))}
                </span>
              ) : null}
              <ChevronRight className="size-4 shrink-0 text-foreground-dim transition-transform duration-(--dur-2) group-hover/qa:translate-x-0.5 calm:transition-none" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </PanelCard>
  );
}

/**
 * The dashboard: a header band on a faint gradient mesh (greeting, workspace, plan chip, actions)
 * with the composer as a hero card, a KPI row of real usage, then recent projects as large cards
 * beside a right rail of deployments, activity and quick actions. Presentation only; every value
 * comes from the page's database reads and the plan/template config.
 */
export function DashboardCockpit({
  firstName,
  workspace,
  composer,
  projects,
  projectCount,
  deployments,
  activity,
  entitlements,
  series,
  milestones,
  showChecklist,
  canCreate,
  emailVerified,
  emailConfigured,
  templates,
  templateCount,
}: {
  firstName: string;
  workspace: { name: string; plan: string; role: string } | null;
  composer: React.ComponentProps<typeof PromptBox>;
  /** Most recently opened first. */
  projects: ProjectCardItem[];
  projectCount: number;
  deployments: DeploymentRow[];
  activity: RiverItem[];
  entitlements: KpiEntitlements | null;
  /** Fourteen days of real activity for the KPI sparklines (null without a workspace). */
  series: KpiSeries | null;
  milestones: ChecklistMilestones;
  showChecklist: boolean;
  canCreate: boolean;
  /** Deploys need a verified email; the checklist locks its deploy step until then. */
  emailVerified: boolean;
  /** capabilities.email: whether verification links can be delivered at all. */
  emailConfigured: boolean;
  createIn: string | null;
  templates: TemplateCardData[];
  templateCount: number;
}) {
  const firstRun = projects.length === 0;
  const role = workspace ? workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1) : "";

  return (
    <AppPage width="wide" className="space-y-8 py-6 lg:py-7">
      {/* Header band: greeting, workspace and plan on a faint gradient mesh, with the composer as the hero card. */}
      {/* Header band: a plain card surface with a hairline border (no mesh, no gradient). */}
      <section aria-label="Overview" className="card-premium relative overflow-hidden rounded-[20px] px-5 pb-5 pt-6 sm:px-7 sm:pb-7 sm:pt-8">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="text-eyebrow">Dashboard</p>
            {/* text-pretty (not balance) and a no-break space keep "back, <name>" together: the name never sits on its own line. */}
            <h1 className="mt-1.5 text-pretty text-[28px] font-bold leading-[1.1] tracking-[-0.025em] sm:text-[32px]">
              Welcome back,&nbsp;<span className="whitespace-nowrap">{firstName}</span>
            </h1>
            {workspace ? (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-muted-foreground">
                <span className="font-medium text-foreground">{workspace.name}</span>
                <PlanPill plan={workspace.plan.toLowerCase()} className="h-5 px-2 text-[10px]" />
                <span aria-hidden="true">·</span>
                <span>{role}</span>
                {projectCount > 0 ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {projectCount} project{projectCount === 1 ? "" : "s"}
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
          {canCreate ? (
            <div className="ml-auto flex items-center gap-2">
              <Link href="/import-project" className={buttonClasses("outline", "sm", "h-9 px-3.5")}>
                <FolderGit2 className="size-4" aria-hidden="true" /> Import
              </Link>
              <Link href="/new-project" className={buttonClasses("primary", "sm", "h-9 pl-3.5 pr-2")}>
                <Plus className="size-4" aria-hidden="true" /> New project
                <Kbd className="ml-1 border-0 bg-primary-foreground/15 text-primary-foreground [@media(hover:none)]:hidden" aria-hidden="true">
                  N
                </Kbd>
              </Link>
            </div>
          ) : null}
        </div>

        <div className="mt-6">
          <PromptBox {...composer} align="start" compact />
        </div>
      </section>

      {showChecklist ? (
        <GettingStarted milestones={milestones} canCreate={canCreate} emailVerified={emailVerified} emailConfigured={emailConfigured} resumeHref={projects[0] ? `/projects/${projects[0].id}` : undefined} layout="strip" />
      ) : null}

      {entitlements ? <KpiRow entitlements={entitlements} projectCount={projectCount} series={series} /> : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          <RecentProjects projects={projects} projectCount={projectCount} canCreate={canCreate} />

          <section aria-labelledby="templates-title">
            <div className="mb-3.5 flex items-center gap-3">
              <span className="icon-tile size-8 rounded-[10px]" aria-hidden="true">
                <LayoutTemplate className="size-4" />
              </span>
              <h2 id="templates-title" className="text-section-title">
                Start from a template
              </h2>
              <Link href="/dashboard/templates" className={`${quietLink} ml-auto`}>
                All {templateCount} templates <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {templates.map((t, i) => (
                <TemplateTile key={t.id} template={t} variant="compact" href={`/dashboard/templates?preview=${t.id}`} priority={firstRun && i === 0} sizes="(min-width: 1024px) 240px, 50vw" />
              ))}
            </ul>
          </section>
        </div>

        <div className="min-w-0 space-y-5">
          <DeploymentsCard rows={deployments} />
          <ActivityRiver items={activity} />
          <Suspense fallback={<SystemStatusSkeleton />}>
            <SystemStatusCard />
          </Suspense>
          <QuickActions canCreate={canCreate} templateCount={templateCount} />
        </div>
      </div>
    </AppPage>
  );
}
