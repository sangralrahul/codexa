import Link from "next/link";
import { ArrowRight, ChevronRight, Compass, FolderGit2, FolderKanban, LayoutTemplate, Plus, UserPlus, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppPage } from "@/components/app/app-shell";
import { buttonClasses } from "@/components/ui/button";
import { TemplateTile, type TemplateCardData } from "@/components/templates";
import { PromptBox } from "./prompt-box";
import { ProjectCard, type ProjectCardItem } from "./project-card";
import { GettingStarted, type ChecklistMilestones } from "./getting-started";
import { ActivityRiver, type RiverItem } from "./activity-river";
import { DeploymentsCard, type DeploymentRow } from "./deployments-card";
import { UsageCard } from "./usage-card";
import { PanelCard } from "./panel-card";

const quietLink = "link-draw inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground";

/** One-click entries to the places people otherwise hunt for (all real routes). */
function QuickActions({ canCreate, templateCount }: { canCreate: boolean; templateCount: number }) {
  const items: { href: string; icon: LucideIcon; title: string; detail: string }[] = [
    ...(canCreate ? [{ href: "/new-project", icon: Plus, title: "New project", detail: "From a prompt, a template or GitHub" }] : []),
    { href: "/dashboard/templates", icon: LayoutTemplate, title: "Browse templates", detail: `${templateCount} working starters` },
    ...(canCreate ? [{ href: "/import-project", icon: FolderGit2, title: "Import from GitHub", detail: "Bring an existing repository" }] : []),
    { href: "/showcase", icon: Compass, title: "Community", detail: "Remix public apps" },
    { href: "/settings/members", icon: UserPlus, title: "Invite your team", detail: "Members and roles" },
  ];
  return (
    <PanelCard title="Quick actions" icon={Zap}>
      <ul>
        {items.map(({ href, icon: Icon, title, detail }) => (
          <li key={href} className="border-b border-border last:border-b-0">
            <Link
              href={href}
              className="group/qa flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-foreground">{title}</span>
                <span className="block truncate text-[11.5px] text-muted-foreground">{detail}</span>
              </span>
              <ChevronRight className="size-3.5 shrink-0 text-foreground-dim transition-transform duration-(--dur-2) group-hover/qa:translate-x-0.5 calm:transition-none" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </PanelCard>
  );
}

const COLUMNS = "md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)_40px]";

/** Recent projects as a compact table (the same rows as the projects list). Server component. */
function RecentProjects({ projects, projectCount, canCreate }: { projects: ProjectCardItem[]; projectCount: number; canCreate: boolean }) {
  return (
    <section aria-labelledby="recent-title" className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex h-9 items-center gap-2 border-b border-border px-3">
        <FolderKanban className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <h2 id="recent-title" className="text-[12.5px] font-semibold tracking-[-0.005em]">
          Recent projects
        </h2>
        {projectCount > 0 ? <span className="text-meta text-foreground-dim">{projectCount}</span> : null}
        <div className="ml-auto flex items-center gap-3">
          <Link href="/projects" className={quietLink}>
            All projects <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>
      </header>
      {projects.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-[13px] font-medium">No projects yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">Describe your first app above, or start from a template below.</p>
          {canCreate ? (
            <Link href="/import-project" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-foreground underline-offset-4 hover:underline">
              <FolderGit2 className="size-3.5" aria-hidden="true" /> Or import a GitHub repository
            </Link>
          ) : null}
        </div>
      ) : (
        <div role="table" aria-label="Recent projects" aria-rowcount={projects.length + 1}>
          <div role="rowgroup" className="hidden border-b border-border bg-surface md:block">
            <div role="row" className={`grid items-center gap-3 px-4 py-1.5 text-[11.5px] font-medium text-muted-foreground ${COLUMNS}`}>
              <span role="columnheader">Name</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Framework</span>
              <span role="columnheader">Visibility</span>
              <span role="columnheader">Last edited</span>
              <span role="columnheader">
                <span className="sr-only">Actions</span>
              </span>
            </div>
          </div>
          <div role="rowgroup">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} layout="list" />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * The dashboard: a compact greeting line, the composer, then a dense two-column body. Left: the
 * recent projects table and a templates strip; right: usage meters, deployments, activity and
 * quick actions. Presentation only; every value comes from the page's database reads and the
 * plan/template config.
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
  entitlements: React.ComponentProps<typeof UsageCard>["entitlements"] | null;
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
    <AppPage width="wide" className="space-y-4 py-5 lg:py-5">
      {/* Greeting line: who, where, and the two primary actions. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.02em]">Welcome back, {firstName}</h1>
          {workspace ? (
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              <span className="text-foreground">{workspace.name}</span> · {workspace.plan} plan · {role}
              {projectCount > 0 ? <> · {projectCount} project{projectCount === 1 ? "" : "s"}</> : null}
            </p>
          ) : null}
        </div>
        {canCreate ? (
          <div className="ml-auto flex items-center gap-2">
            <Link href="/import-project" className={buttonClasses("outline", "sm", "h-8 px-3")}>
              <FolderGit2 className="size-3.5" aria-hidden="true" /> Import
            </Link>
            <Link href="/new-project" className={buttonClasses("primary", "sm", "h-8 px-3")}>
              <Plus className="size-3.5" aria-hidden="true" /> New project
            </Link>
          </div>
        ) : null}
      </div>

      <PromptBox {...composer} align="start" compact />

      {showChecklist ? (
        <GettingStarted milestones={milestones} canCreate={canCreate} emailVerified={emailVerified} emailConfigured={emailConfigured} resumeHref={projects[0] ? `/projects/${projects[0].id}` : undefined} layout="strip" />
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_316px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <RecentProjects projects={projects} projectCount={projectCount} canCreate={canCreate} />

          <section aria-labelledby="templates-title">
            <div className="mb-2 flex items-center gap-2">
              <LayoutTemplate className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <h2 id="templates-title" className="text-[12.5px] font-semibold tracking-[-0.005em]">
                Start from a template
              </h2>
              <Link href="/dashboard/templates" className={`${quietLink} ml-auto`}>
                All {templateCount} templates <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {templates.map((t, i) => (
                <TemplateTile key={t.id} template={t} variant="compact" href={`/dashboard/templates?preview=${t.id}`} priority={firstRun && i === 0} sizes="(min-width: 1024px) 240px, 50vw" />
              ))}
            </ul>
          </section>
        </div>

        <div className="min-w-0 space-y-4">
          {entitlements ? <UsageCard entitlements={entitlements} projectCount={projectCount} /> : null}
          <DeploymentsCard rows={deployments} />
          <ActivityRiver items={activity} />
          <QuickActions canCreate={canCreate} templateCount={templateCount} />
        </div>
      </div>
    </AppPage>
  );
}
