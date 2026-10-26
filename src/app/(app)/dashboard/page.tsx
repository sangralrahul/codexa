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
import { GettingStarted } from "@/components/projects/getting-started";
import { DashboardTabs } from "@/components/projects/dashboard-tabs";
import type { ProjectListItem, WorkspaceRole } from "@/lib/client/workspace/types";

export const metadata = { title: "Dashboard", robots: { index: false } };

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
        <AppPage className="pb-24 pt-12 sm:pt-20">
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

      <div className="relative isolate">
        {/* Slow drifting light so the lower page isn't flat. */}
        <div className="ambient" aria-hidden="true">
          <div className="ambient__orb" />
          <div className="ambient__orb" />
          <div className="ambient__orb" />
        </div>
        <AppPage width="wide" className="-mt-8 pt-0">
          <DashboardTabs
            tabs={[
              {
                id: "projects",
                label: "My projects",
                count: projectCount,
                href: items.length ? "/projects" : undefined,
                hrefLabel: "All projects",
                content:
                  items.length === 0 ? (
                    <GettingStarted canCreate={canCreate} />
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map((p, i) => (
                        <div key={p.id} className="pop-in" style={{ animationDelay: `${i * 60}ms` }}>
                          <ProjectCard project={p} showWorkspace={all.length > 1} />
                        </div>
                      ))}
                      {canCreate ? (
                        <Link
                          href="/new-project"
                          className="group flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong text-center transition-colors hover:border-foreground/40 hover:bg-foreground/[0.03]"
                        >
                          <span className="flex size-12 items-center justify-center rounded-full border border-border bg-surface shadow-sm transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110">
                            <Plus className="size-5" aria-hidden="true" />
                          </span>
                          <span>
                            <span className="block text-sm font-medium">New project</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">From a template or a description</span>
                          </span>
                        </Link>
                      ) : null}
                    </div>
                  ),
              },
              {
                id: "templates",
                label: "Templates",
                count: templates.length,
                href: "/dashboard/templates",
                hrefLabel: "Browse all",
                content: <TemplateShowcase templates={templates.map((t) => ({ id: t.id, name: t.name, description: t.description, category: t.category, frameworkName: t.frameworkName }))} />,
              },
              ...(current && entitlements
                ? [
                    {
                      id: "usage",
                      label: "Usage",
                      href: "/settings/usage",
                      hrefLabel: "Details",
                      content: <UsageCard workspaceName={current.workspace.name} entitlements={entitlements} projectCount={projectCount} />,
                    },
                  ]
                : []),
              {
                id: "learn",
                label: "Learn",
                href: "/docs",
                hrefLabel: "All docs",
                content: (
                  <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {GUIDES.map((g) => (
                      <li key={g.href}>
                        <Link href={g.href} className="tilt-shine group flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-lg">
                          <span className="flex items-center justify-between">
                            <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-signal/25 to-signal/5 ring-1 ring-signal/20">
                              <g.icon className="size-4 text-signal" aria-hidden="true" />
                            </span>
                            <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                          </span>
                          <span className="mt-3 block text-sm font-medium">{g.title}</span>
                          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{g.body}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ),
              },
            ]}
          />
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Need a hand?{" "}
            <Link href="/help" className="inline-flex items-center gap-1 underline-offset-2 hover:text-foreground hover:underline">
              <BookOpen className="size-3.5" aria-hidden="true" /> Help center
            </Link>
          </p>
        </AppPage>
      </div>
    </>
  );
}
