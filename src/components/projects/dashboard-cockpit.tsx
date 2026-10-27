import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Database, FolderGit2, Globe2, MessageSquareText, Rocket } from "lucide-react";
import { AppPage } from "@/components/app/app-shell";
import { TemplateTile, UseTemplateButton, type TemplateCardData } from "@/components/templates";
import { PromptBox } from "./prompt-box";
import { UsageCard } from "./usage-card";
import { GettingStarted, type ChecklistMilestones } from "./getting-started";
import { ContinueBuilding, type ResumeProject } from "./continue-building";
import { ActivityRiver, type RiverItem } from "./activity-river";
import { TemplateShowcase } from "./template-showcase";

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
    <section aria-labelledby="learn-title" className="pb-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="learn-title" className={sectionTitle}>
          Learn
        </h2>
        <Link href="/docs" className={sectionLink}>
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
}

type Usage = React.ComponentProps<typeof UsageCard>;

/**
 * The dashboard cockpit (presentation only; the page loads every value from the database and
 * the plan/template config):
 * (a) a compact hero (mono greeting, headline, the composer) under a static glow that brightens
 *     while the composer is focused or holds text;
 * (b) Continue building (returning users) or "Start with one of these" (first run), then the
 *     first-run checklist as one horizontal row until it is done and dismissed;
 * (c) the Activity river beside "This month" (first run: Learn beside "This month");
 * (d) Quick starts and Learn.
 */
export function DashboardCockpit({
  greeting,
  composer,
  recent,
  activity,
  milestones,
  showChecklist,
  canCreate,
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
      {/* (a) Compact hero: greeting, headline, the composer. The light behind it listens to the composer (CSS only). */}
      <div className="dash-hero">
        <div className="dash-glow" aria-hidden="true" />
        <AppPage className="pb-4 pt-8 lg:pb-6 lg:pt-12">
          <section aria-labelledby="dash-title" className="mx-auto max-w-4xl">
            <p className="text-center font-mono text-[11.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{greeting}</p>
            <h1 id="dash-title" className="text-app-display mt-3 text-balance text-center">
              What will you <span className="text-dim">build</span> today?
            </h1>
            <div className="mt-7">
              <PromptBox {...composer} />
            </div>
          </section>
        </AppPage>
      </div>

      <AppPage className="space-y-10 pt-2 lg:space-y-12">
        {firstRun ? (
          <>
            {showChecklist ? <GettingStarted milestones={milestones} canCreate={canCreate} layout="row" /> : null}
            <section aria-labelledby="starters-title">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id="starters-title" className={sectionTitle}>
                  Start with one of these
                </h2>
                {allTemplates}
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
          <>
            <ContinueBuilding projects={recent} canCreate={canCreate} />
            {/* The checklist stays one horizontal row until every step is done (and dismissed). */}
            {showChecklist ? <GettingStarted milestones={milestones} canCreate={canCreate} resumeHref={`/projects/${recent[0].id}`} layout="row" /> : null}
          </>
        )}

        {/* (c) Activity river + This month (first run: Learn + This month). Both columns share one height. */}
        <div className={usage ? "grid items-stretch gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : "grid gap-5"}>
          {firstRun ? <Learn cols={2} /> : <ActivityRiver className="h-full" items={activity} />}
          {usage ? <UsageCard {...usage} className="h-full" /> : null}
        </div>

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
