import Link from "next/link";
import { ArrowRight, FolderPlus } from "lucide-react";
import { AppPage } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { countProjects, listRecentProjectsForUser } from "@/lib/services/projects";
import { getWorkspaceEntitlements } from "@/lib/services/usage";
import { capabilities } from "@/lib/env";
import { serializeProject } from "@/app/api/v1/projects/_lib/serialize";
import { DEFAULT_TEMPLATE_ID, listTemplateSummaries, templateCategory } from "@/components/projects/template-summaries";
import { PromptBox } from "@/components/projects/prompt-box";
import { ProjectCard } from "@/components/projects/project-card";
import { UsageCard } from "@/components/projects/usage-card";
import { TemplateThumb } from "@/components/templates/template-thumb";
import { buttonClasses } from "@/components/ui/button";
import type { ProjectListItem, WorkspaceRole } from "@/lib/client/workspace/types";

export const metadata = { title: "Dashboard", robots: { index: false } };

function SectionHead({ id, title, href, linkLabel }: { id: string; title: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 id={id} className="text-[15px] font-semibold tracking-tight">
        {title}
      </h2>
      <Link href={href} className="group inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
        {linkLabel} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

/** Time-of-day greeting in the user's own time zone (set in their profile); plain "Welcome back" if it can't be resolved. */
function greeting(timeZone: string) {
  try {
    const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));
    return hour < 5 ? "Welcome back" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  } catch {
    return "Welcome back";
  }
}

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const { current, all } = await getCurrentWorkspace(user);
  const byId = new Map(all.map((w) => [w.workspace.id, w]));
  const [recent, entitlements, projectCount] = await Promise.all([
    listRecentProjectsForUser(
      all.map((w) => w.workspace.id),
      6,
    ),
    current ? getWorkspaceEntitlements(current.workspace) : null,
    current ? countProjects(current.workspace.id) : 0,
  ]);
  const items: ProjectListItem[] = recent.map((p) => {
    const ws = byId.get(p.workspaceId);
    const s = serializeProject(p);
    return {
      ...s,
      lastOpenedAt: s.lastOpenedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      workspaceName: ws?.workspace.name ?? "Workspace",
      role: (ws?.role ?? "viewer") as WorkspaceRole,
      category: templateCategory(s.templateId),
    };
  });
  const shortcuts = listTemplateSummaries().filter((t) => t.featured).slice(0, 4);
  const canCreate = current ? current.role !== "viewer" : false;
  const firstName = (user.name || user.email.split("@")[0]).split(/\s+/)[0];
  const hello = `${user.timezone && user.timezone !== "UTC" ? greeting(user.timezone) : "Welcome back"}, ${firstName}`;

  return (
    <AppPage>
      <section aria-labelledby="dash-title" className="mx-auto max-w-3xl pb-4 pt-6 text-center sm:pt-10">
        <p className="text-[13px] text-muted-foreground">{current ? hello : `Hi ${firstName}`}</p>
        <h1 id="dash-title" className="mt-2 text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
          What do you want to build?
        </h1>
        <div className="mt-8 text-left">
          <PromptBox workspaceId={canCreate && current ? current.workspace.id : null} templateId={DEFAULT_TEMPLATE_ID} aiConfigured={capabilities.ai} />
        </div>
      </section>

      <section aria-labelledby="recent-title" className="mt-14">
        <SectionHead id="recent-title" title="Recent projects" href="/projects" linkLabel="All projects" />
        {items.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border-strong px-6 py-12 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface">
              <FolderPlus className="size-5 text-muted-foreground" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm font-medium">No projects yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Describe your idea above, or start from one of the templates below.</p>
            {canCreate ? (
              <Link href="/new-project" className={buttonClasses("outline", "sm", "mt-5 rounded-md")}>
                Create a project
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((p) => (
              <ProjectCard key={p.id} project={p} showWorkspace={all.length > 1} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="shortcuts-title" className="mt-14">
        <SectionHead id="shortcuts-title" title="Start from a template" href="/dashboard/templates" linkLabel="Browse templates" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map((t) => (
            <Link
              key={t.id}
              href={`/new-project?template=${encodeURIComponent(t.id)}`}
              className="glow-card group flex flex-col rounded-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="border-b border-border bg-surface p-3">
                <TemplateThumb category={t.category} className="transition-transform duration-500 ease-out group-hover:scale-[1.02]" />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <span className="text-sm font-medium">{t.name}</span>
                <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{t.description}</span>
                <span className="mt-3 text-[11px] text-muted-foreground">{t.frameworkName}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {current && entitlements ? (
        <section aria-labelledby="usage-title" className="mt-14">
          <SectionHead id="usage-title" title="Usage this month" href="/settings/usage" linkLabel="View usage" />
          <UsageCard workspaceName={current.workspace.name} entitlements={entitlements} projectCount={projectCount} />
        </section>
      ) : null}
    </AppPage>
  );
}
