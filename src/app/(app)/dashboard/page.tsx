import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Database, Globe2, MessageSquareText, Plus, Rocket } from "lucide-react";
import { AppPage } from "@/components/app/app-shell";
import { Backdrop, Eyebrow } from "@/components/marketing/backdrop";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { countProjects, listRecentProjectsForUser } from "@/lib/services/projects";
import { getWorkspaceEntitlements } from "@/lib/services/usage";
import { capabilities } from "@/lib/env";
import { serializeProject } from "@/app/api/v1/projects/_lib/serialize";
import { DEFAULT_TEMPLATE_ID, listTemplateSummaries, templateCategory } from "@/components/projects/template-summaries";
import { PromptBox, type PromptPreset } from "@/components/projects/prompt-box";
import { ProjectCard } from "@/components/projects/project-card";
import { UsageCard } from "@/components/projects/usage-card";
import { TemplateShowcase } from "@/components/projects/template-showcase";
import type { ProjectListItem, WorkspaceRole } from "@/lib/client/workspace/types";

export const metadata = { title: "Dashboard", robots: { index: false } };

function SectionHead({ id, title, description, href, linkLabel }: { id: string; title: string; description?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="group inline-flex shrink-0 items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
          {linkLabel} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      ) : null}
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

const GUIDES = [
  { href: "/docs/quickstart", title: "Quickstart", body: "From a prompt to a running preview in a few minutes.", icon: Rocket },
  { href: "/docs/prompting", title: "Writing good prompts", body: "Patterns that get maintainable code from the agent.", icon: MessageSquareText },
  { href: "/docs/databases", title: "Connect a database", body: "PostgreSQL or Supabase, schema browser and SQL.", icon: Database },
  { href: "/docs/custom-domains", title: "Deploy and custom domains", body: "Publish, roll back and point your own domain.", icon: Globe2 },
];

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const { current, all } = await getCurrentWorkspace(user);
  const byId = new Map(all.map((w) => [w.workspace.id, w]));
  const [recent, entitlements, projectCount] = await Promise.all([
    listRecentProjectsForUser(
      all.map((w) => w.workspace.id),
      5,
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
  const templates = listTemplateSummaries();
  const byCategory = (c: string) => templates.find((t) => t.category === c)?.id;
  const presetDefs: (Omit<PromptPreset, "templateId"> & { templateId?: string })[] = [
    { label: "Landing page", icon: "globe", prompt: "A landing page for a coffee subscription with pricing, FAQ and an email signup.", templateId: byCategory("landing-pages") },
    { label: "Dashboard", icon: "dashboard", prompt: "A sales dashboard with revenue charts, a customers table and date filters.", templateId: byCategory("dashboards") },
    { label: "AI chat app", icon: "bot", prompt: "A support chatbot with a conversation sidebar and saved chats.", templateId: byCategory("ai-tools") },
    { label: "Online store", icon: "shop", prompt: "An online store for handmade candles with a product grid, filters and a cart.", templateId: byCategory("ecommerce") },
    { label: "Portfolio", icon: "user", prompt: "A personal portfolio with a projects grid, about section and contact form.", templateId: byCategory("portfolios") },
    { label: "REST API", icon: "server", prompt: "A REST API for a library: books, members and loans with validation.", templateId: templates.find((t) => t.framework === "node-express")?.id },
  ];
  const presets = presetDefs.filter((p): p is PromptPreset => Boolean(p.templateId));
  const canCreate = current ? current.role !== "viewer" : false;
  const firstName = (user.name || user.email.split("@")[0]).split(/\s+/)[0];
  const hello = `${user.timezone && user.timezone !== "UTC" ? greeting(user.timezone) : "Welcome back"}, ${firstName}`;

  return (
    <>
      {/* Hero: the live silk gradient behind the composer, fading into the page. */}
      <div className="relative isolate overflow-hidden">
        <Backdrop className="-z-10 [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]" />
        <AppPage className="pb-14 pt-12 sm:pt-20">
          <section aria-labelledby="dash-title" className="mx-auto max-w-3xl text-center">
            <div data-reveal>
              <Eyebrow>{current ? hello : `Hi ${firstName}`}</Eyebrow>
            </div>
            <h1 id="dash-title" data-reveal style={{ "--reveal-delay": "80ms" } as React.CSSProperties} className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl">
              What will you <span className="serif-accent">build</span> today?
            </h1>
            <p data-reveal style={{ "--reveal-delay": "140ms" } as React.CSSProperties} className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
              Describe it in plain words. Codexa sets up a real project, writes the code and runs it for you.
            </p>
            <div data-reveal style={{ "--reveal-delay": "200ms" } as React.CSSProperties} className="mt-9 text-left">
              <PromptBox
                workspaceId={canCreate && current ? current.workspace.id : null}
                templateId={DEFAULT_TEMPLATE_ID}
                templates={templates.map((t) => ({ id: t.id, name: t.name, category: t.category, frameworkName: t.frameworkName }))}
                presets={presets}
                aiConfigured={capabilities.ai}
              />
            </div>
          </section>
        </AppPage>
      </div>

      <AppPage className="pt-4">
        <section aria-labelledby="recent-title">
          <SectionHead id="recent-title" title="Your projects" description={current ? `${projectCount} in ${current.workspace.name}` : undefined} href="/projects" linkLabel="View all" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {canCreate ? (
              <Link
                href="/new-project"
                data-reveal
                className="group flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong text-center transition-colors hover:border-foreground/40 hover:bg-muted/30"
              >
                <span className="flex size-11 items-center justify-center rounded-full border border-border bg-surface transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110">
                  <Plus className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-medium">New project</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">From a template or a description</span>
                </span>
              </Link>
            ) : null}
            {items.map((p, i) => (
              <div key={p.id} data-reveal style={{ "--reveal-delay": `${(i + 1) * 70}ms` } as React.CSSProperties}>
                <ProjectCard project={p} showWorkspace={all.length > 1} />
              </div>
            ))}
          </div>
          {items.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No projects yet. Describe an idea above or pick a template below to create your first one.</p> : null}
        </section>

        <section aria-labelledby="shortcuts-title" className="mt-16">
          <SectionHead id="shortcuts-title" title="Start from a template" description="Runnable starters with real files. Pick one and ask the agent to change it." href="/dashboard/templates" linkLabel="All templates" />
          <TemplateShowcase templates={templates.map((t) => ({ id: t.id, name: t.name, description: t.description, category: t.category, frameworkName: t.frameworkName }))} />
        </section>

        <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {current && entitlements ? (
            <section aria-labelledby="usage-title" data-reveal>
              <SectionHead id="usage-title" title="Usage this month" href="/settings/usage" linkLabel="Details" />
              <UsageCard workspaceName={current.workspace.name} entitlements={entitlements} projectCount={projectCount} />
            </section>
          ) : null}
          <section aria-labelledby="guides-title" data-reveal style={{ "--reveal-delay": "100ms" } as React.CSSProperties}>
            <SectionHead id="guides-title" title="Learn Codexa" href="/docs" linkLabel="Docs" />
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {GUIDES.map((g) => (
                <li key={g.href}>
                  <Link href={g.href} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
                      <g.icon className="size-4 text-muted-foreground transition-colors group-hover:text-signal" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{g.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{g.body}</span>
                    </span>
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/help" className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <BookOpen className="size-3.5" aria-hidden="true" /> Help center
            </Link>
          </section>
        </div>
      </AppPage>
    </>
  );
}
