import Link from "next/link";
import { ArrowRight, FolderGit2, Plus } from "lucide-react";
import { AppPage } from "@/components/app/app-shell";
import { TemplateTile, UseTemplateButton, type TemplateCardData } from "@/components/templates";
import { PromptBox } from "./prompt-box";
import { ProjectCard, type ProjectCardItem } from "./project-card";
import { GettingStarted, type ChecklistMilestones } from "./getting-started";
import { DashboardTabs } from "./dashboard-tabs";

const tileGrid = "grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3 min-[85rem]:grid-cols-4";
const quietLink = "link-draw inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground";

/**
 * The dashboard, built around how an AI app builder is used (presentation only; the page loads
 * every value from the database and the plan/template config):
 * (a) one centred question and the composer: describe an app, press Build, and the new project
 *     opens on chat + live preview while the agent works;
 * (b) the first-run checklist (only until it is done and dismissed);
 * (c) "Recent projects" and "Templates" as tabs: cards with screenshots, a "new project" tile,
 *     and starters that create a project in one click.
 */
export function DashboardCockpit({
  firstName,
  composer,
  projects,
  projectCount,
  milestones,
  showChecklist,
  canCreate,
  emailVerified,
  emailConfigured,
  createIn,
  templates,
  templateCount,
}: {
  firstName: string;
  composer: React.ComponentProps<typeof PromptBox>;
  /** Most recently opened first. */
  projects: ProjectCardItem[];
  projectCount: number;
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

  const newTile = canCreate ? (
    <li className="min-w-0">
      <Link
        href="/new-project"
        className="group/new flex h-full min-h-40 w-full flex-col items-center justify-center gap-3 rounded-[16px] border border-dashed border-border-strong text-center transition-[border-color,background-color] duration-(--dur-3) hover:border-foreground/30 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="flex size-10 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-transform duration-(--dur-3) group-hover/new:scale-105 calm:transition-none">
          <Plus className="size-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-[14px] font-medium">New project</span>
          <span className="mt-0.5 block text-[12.5px] text-muted-foreground">From a sentence, a template or GitHub</span>
        </span>
      </Link>
    </li>
  ) : null;

  const templatesPanel = (
    <ul className={tileGrid}>
      {templates.map((t, i) => (
        <TemplateTile
          key={t.id}
          template={t}
          href={`/dashboard/templates?preview=${t.id}`}
          priority={firstRun && i === 0}
          action={<UseTemplateButton templateId={t.id} templateName={t.name} workspaceId={createIn} canCreate={canCreate} fileCount={t.fileCount} />}
        />
      ))}
    </ul>
  );

  const projectsPanel = firstRun ? (
    <div className="rounded-[18px] border border-dashed border-border-strong px-6 py-12 text-center">
      <p className="text-[15px] font-medium">No projects yet</p>
      <p className="mx-auto mt-1 max-w-md text-[13.5px] text-muted-foreground">Describe your first app above, or open the Templates tab and start from a working starter.</p>
      {canCreate ? (
        <Link href="/import-project" className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-foreground underline-offset-4 hover:underline">
          <FolderGit2 className="size-4" aria-hidden="true" /> Or import a GitHub repository
        </Link>
      ) : null}
    </div>
  ) : (
    <ul className={tileGrid}>
      {projects.map((p, i) => (
        <li key={p.id} className="min-w-0">
          <ProjectCard project={p} layout="grid" priority={i === 0} />
        </li>
      ))}
      {newTile}
    </ul>
  );

  return (
    <>
      {/* (a) The question and the composer. */}
      <div className="dash-home">
        <AppPage className="pb-4 pt-[min(8vh,4.5rem)]">
          <section aria-labelledby="dash-title" className="mx-auto max-w-3xl">
            <h1 id="dash-title" className="text-center text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-balance sm:text-[34px]">
              What should we build, {firstName}?
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-center text-[15px] text-muted-foreground">Describe it in a sentence. Codexa builds it and runs a live preview.</p>
            <div className="mt-6">
              <PromptBox {...composer} />
            </div>
          </section>
        </AppPage>
      </div>

      <AppPage className="space-y-6 pb-16 pt-0">
        {/* (b) First-run checklist. */}
        {showChecklist ? (
          <GettingStarted milestones={milestones} canCreate={canCreate} emailVerified={emailVerified} emailConfigured={emailConfigured} resumeHref={projects[0] ? `/projects/${projects[0].id}` : undefined} layout={firstRun ? "row" : "strip"} />
        ) : null}

        {/* (c) Projects and templates. */}
        <section aria-label="Your projects and templates">
          <DashboardTabs
            projects={projectsPanel}
            templates={templatesPanel}
            projectCount={projectCount}
            aside={
              <div className="flex items-center gap-4">
                {projectCount > projects.length ? (
                  <Link href="/projects" className={quietLink}>
                    All {projectCount} projects <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                ) : null}
                <Link href="/dashboard/templates" className={quietLink}>
                  All {templateCount} templates <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            }
          />
        </section>
      </AppPage>
    </>
  );
}
