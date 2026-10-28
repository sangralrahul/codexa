import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Database, FolderGit2, Globe2, MessageSquareText, Plus, Rocket } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { AppPage } from "@/components/app/app-shell";
import { TemplateTile, UseTemplateButton, type TemplateCardData } from "@/components/templates";
import { PromptBox } from "./prompt-box";
import type { UsageCard } from "./usage-card";
import { GettingStarted, type ChecklistMilestones } from "./getting-started";
import { ContinueBuilding, type ResumeProject } from "./continue-building";
import { ActivityRiver, type RiverItem } from "./activity-river";
import { TemplateShowcase } from "./template-showcase";
import { cn } from "@/lib/utils";

const GUIDES = [
  { href: "/docs/quickstart", title: "Quickstart", body: "From a prompt to a running preview in a few minutes.", icon: Rocket },
  { href: "/docs/prompting", title: "Writing good prompts", body: "Patterns that get maintainable code from the agent.", icon: MessageSquareText },
  { href: "/docs/databases", title: "Connect a database", body: "PostgreSQL or Supabase, schema browser and SQL.", icon: Database },
  { href: "/docs/custom-domains", title: "Deploy and custom domains", body: "Publish, roll back and point your own domain.", icon: Globe2 },
];

const sectionTitle = "text-[15px] font-semibold tracking-[-0.01em]";
const sectionLink = "link-draw inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground";

function Learn({ cols }: { cols: 2 | 4 }) {
  return (
    <section aria-labelledby="learn-title" className="min-w-0 pb-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="learn-title" className={sectionTitle}>
          Learn
        </h2>
        <Link href="/docs" className={sectionLink}>
          <BookOpen className="size-3.5" aria-hidden="true" /> All docs
        </Link>
      </div>
      <ul className={cols === 4 ? "grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-4" : "grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2"}>
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
}

type Usage = React.ComponentProps<typeof UsageCard>;

const fmt = (v: number) => v.toLocaleString("en-US");

/** One headline number for the overview strip: value, limit and a thin bar (no bar when unlimited). */
function Stat({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit < 0;
  const pct = unlimited || limit === 0 ? 0 : Math.min(1, used / limit);
  const tone = pct >= 0.9 ? "bg-danger" : pct >= 0.7 ? "bg-warning" : "bg-foreground/70";
  return (
    <div className="min-w-0 px-5 py-4">
      <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 flex items-baseline gap-1.5">
        <span className="font-display text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums">{fmt(used)}</span>
        <span className="text-[13px] text-muted-foreground tabular-nums">{unlimited ? "/ unlimited" : `/ ${fmt(limit)}`}</span>
      </dd>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.max(pct * 100, used > 0 ? 3 : 0)}%` }} />
      </div>
    </div>
  );
}

/** The overview strip: this workspace's usage this month, from getWorkspaceEntitlements. */
function Overview({ usage }: { usage: Usage }) {
  const e = usage.entitlements;
  return (
    <section aria-labelledby="overview-title">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="overview-title" className={sectionTitle}>
          This month
        </h2>
        <Link href="/settings/usage" className={sectionLink}>
          Usage details <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      <dl className="e1 grid grid-cols-2 divide-border overflow-hidden rounded-[16px] lg:grid-cols-4 lg:divide-x [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-border lg:[&>*:nth-child(-n+2)]:border-b-0 [&>*:nth-child(odd)]:border-r [&>*:nth-child(odd)]:border-border lg:[&>*:nth-child(odd)]:border-r-0">
        <Stat label="Projects" used={usage.projectCount} limit={e.limits.projects} />
        <Stat label="AI requests" used={e.used.ai_request} limit={e.limits.aiRequestsPerMonth} />
        <Stat label="Preview minutes" used={e.used.runtime_minutes} limit={e.limits.runtimeMinutesPerMonth} />
        <Stat label="Deployments" used={e.used.deployment} limit={e.limits.deploymentsPerMonth} />
      </dl>
    </section>
  );
}

/**
 * The dashboard (presentation only; the page loads every value from the database and the
 * plan/template config):
 * (a) a page header: greeting, workspace and plan, Import and New project;
 * (b) "This month": the workspace's usage as four headline numbers, then the composer;
 * (c) Continue building (returning users) or "Start with one of these" (first run), with the
 *     first-run checklist as one row until it is done and dismissed;
 * (d) the Activity river (first run: Learn), then Quick starts and Learn.
 */
export function DashboardCockpit({
  greeting,
  composer,
  recent,
  activity,
  milestones,
  showChecklist,
  canCreate,
  emailVerified,
  emailConfigured,
  createIn,
  usage,
  starters,
  quickStarts,
  templateCount,
}: {
  greeting: string;
  composer: React.ComponentProps<typeof PromptBox>;
  recent: ResumeProject[];
  activity: RiverItem[];
  milestones: ChecklistMilestones;
  showChecklist: boolean;
  canCreate: boolean;
  /** Deploys need a verified email; the checklist locks its deploy step until then. */
  emailVerified: boolean;
  /** capabilities.email: whether verification links can be delivered at all. */
  emailConfigured: boolean;
  createIn: string | null;
  usage: Usage | null;
  starters: TemplateCardData[];
  quickStarts: TemplateCardData[];
  templateCount: number;
}) {
  const firstRun = recent.length === 0;
  const allTemplates = (
    <Link href="/dashboard/templates" className={sectionLink}>
      All {templateCount} templates <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );

  return (
    <>
      {/* (a) Page header: greeting, workspace and plan, and the two ways to start. */}
      <AppPage className="pb-2 pt-8 lg:pt-10">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <h1 id="dash-title" className="text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[30px]">
              {greeting}
            </h1>
            {usage ? (
              <p className="mt-1 truncate text-[14px] text-muted-foreground">
                {usage.workspaceName} · <span className="capitalize">{usage.entitlements.plan}</span> plan
              </p>
            ) : null}
          </div>
          {canCreate ? (
            <div className="flex shrink-0 items-center gap-2">
              <Link href="/import-project" className={buttonClasses("outline", "md", "gap-1.5")}>
                <FolderGit2 className="size-4" aria-hidden="true" /> Import
              </Link>
              <Link href="/new-project" className={buttonClasses("primary", "md", "gap-1.5")}>
                <Plus className="size-4" aria-hidden="true" /> New project
              </Link>
            </div>
          ) : null}
        </header>
      </AppPage>

      <AppPage className="space-y-10 pt-6 lg:space-y-12">
        {usage ? <Overview usage={usage} /> : null}

        {/* (b) The composer, as a working surface rather than a hero. */}
        <section aria-labelledby="compose-title">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="compose-title" className={sectionTitle}>
              Start a new project
            </h2>
            <span className="text-[13px] text-muted-foreground">Describe it in a sentence, or pick a starter</span>
          </div>
          <PromptBox {...composer} />
        </section>

        {firstRun ? (
          <>
            {showChecklist ? <GettingStarted milestones={milestones} canCreate={canCreate} emailVerified={emailVerified} emailConfigured={emailConfigured} layout="row" /> : null}
            <section aria-labelledby="starters-title">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id="starters-title" className={sectionTitle}>
                  Start with one of these
                </h2>
                {allTemplates}
              </div>
              <ul className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 xl:grid-cols-4">
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
          <>
            <ContinueBuilding projects={recent} canCreate={canCreate} aiConfigured={composer.aiConfigured} />
            {/* The checklist stays one horizontal row until every step is done (and dismissed). */}
            {showChecklist ? <GettingStarted milestones={milestones} canCreate={canCreate} emailVerified={emailVerified} emailConfigured={emailConfigured} resumeHref={`/projects/${recent[0].id}`} layout="row" /> : null}
          </>
        )}

        {/* (c) Activity river + This month (first run: Learn + This month). The single phone column is
            minmax(0,1fr) so nowrap/truncating text inside can never widen the track past the viewport.
            Both cards keep their own height (no stretched emptiness under a short river). */}
        {firstRun ? <Learn cols={4} /> : <ActivityRiver items={activity} />}

        {/* (d) Quick starts and Learn. */}
        {!firstRun ? (
          <>
            <section aria-labelledby="quick-title">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id="quick-title" className={sectionTitle}>
                  Quick starts
                </h2>
                {allTemplates}
              </div>
              <TemplateShowcase templates={quickStarts} />
            </section>
            <Learn cols={4} />
          </>
        ) : null}
      </AppPage>
    </>
  );
}
