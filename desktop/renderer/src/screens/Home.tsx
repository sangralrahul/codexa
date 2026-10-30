import { useEffect, useState } from "react";
import { ArrowRight, ArrowUp, BarChart3, Bot, Briefcase, Check, ChevronDown, Compass, Cpu, ExternalLink, GitBranch, Globe, LayoutTemplate, Rocket, Server, ShoppingBag, Sparkles, UserPlus, Zap } from "lucide-react";
import { useApp } from "../app/state";
import { deployApi, templatesApi, type Deployment, type Project, type Template } from "../lib/api";
import { cn, frameworkLabel, relativeTime } from "../lib/util";
import { Badge, Button, EmptyState, Kbd, Menu, Spinner, Textarea } from "../ui";
import { ProjectMenu } from "../components/ProjectCard";
import { ProjectThumb } from "../components/ProjectThumb";
import { createProject, DEFAULT_TEMPLATE } from "../components/create";

const IDEAS = [
  { label: "SaaS product", icon: Rocket, prompt: "A SaaS app for booking studio time, with plans, sign-in and a billing page", template: "vite-react-saas" },
  { label: "Dashboard", icon: BarChart3, prompt: "A sales dashboard with revenue charts, a customers table and date filters", template: "vite-react-dashboard" },
  { label: "Landing page", icon: Globe, prompt: "A landing page for a coffee subscription with pricing, FAQ and an email signup", template: "vite-react-landing" },
  { label: "Online store", icon: ShoppingBag, prompt: "An online store for handmade candles with a product grid, filters and a cart", template: "vite-react-storefront" },
  { label: "AI app", icon: Bot, prompt: "A support chatbot with a conversation sidebar and saved chats", template: "vite-react-ai-chat" },
  { label: "Portfolio", icon: Briefcase, prompt: "A personal portfolio with a projects grid, an about section and a contact form", template: "vite-react-portfolio" },
  { label: "Backend API", icon: Server, prompt: "A REST API for a library: books, members and loans with validation", template: "node-express-api" },
];
const FEATURED = ["vite-react-saas", "vite-react-dashboard", "vite-react-storefront", "vite-react-landing", "vite-react-ai-chat", "vite-react-portfolio"];
const STARTERS = [DEFAULT_TEMPLATE, ...FEATURED, "node-express-api"];
const PLACEHOLDERS = [
  "Build a habit tracker with streaks and weekly charts…",
  "A landing page for my bakery with online orders…",
  "An invoice app for freelancers with PDF export…",
  "A recipe box with search, tags and a shopping list…",
  "A team dashboard with tasks, owners and due dates…",
];
const DEPLOY_TONE: Record<Deployment["status"], "neutral" | "success" | "warning" | "danger"> = { queued: "warning", building: "warning", deploying: "warning", live: "success", failed: "danger", rolled_back: "neutral" };
const DEPLOY_LABEL: Record<Deployment["status"], string> = { queued: "Queued", building: "Building", deploying: "Deploying", live: "Live", failed: "Failed", rolled_back: "Previous" };

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function HomeScreen() {
  const { user, workspace, projects, usage, go } = useApp();
  const [prompt, setPrompt] = useState("");
  const [template, setTemplate] = useState<string>(DEFAULT_TEMPLATE);
  const [busy, setBusy] = useState(false);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [ph, setPh] = useState(0);
  const [deploys, setDeploys] = useState<(Deployment & { project: Project })[] | null>(null);
  const first = (user.name || user.email).split(/[\s@]/)[0];

  useEffect(() => {
    templatesApi
      .list()
      .then((r) => setTemplates(r.templates))
      .catch(() => setTemplates([]));
  }, []);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setPh((p) => (p + 1) % PLACEHOLDERS.length), 3200);
    return () => clearInterval(t);
  }, []);
  // Latest deployments across the most recent projects (the API is per project).
  useEffect(() => {
    if (!projects) return;
    const top = projects.slice(0, 5);
    Promise.all(top.map((p) => deployApi.list(p.id).then((r) => r.deployments.slice(0, 2).map((d) => ({ ...d, project: p }))).catch(() => [])))
      .then((all) => setDeploys(all.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)))
      .catch(() => setDeploys([]));
  }, [projects]);

  const byId = new Map((templates ?? []).map((t) => [t.id, t]));
  const featured = FEATURED.map((id) => byId.get(id)).filter((t): t is Template => Boolean(t));
  const starters = STARTERS.map((id) => byId.get(id)).filter((t): t is Template => Boolean(t));
  const picked = byId.get(template);
  const liveByProject = new Map((deploys ?? []).filter((d) => d.status === "live").map((d) => [d.project.id, d]));

  const build = async () => {
    const text = prompt.trim();
    if (!text || busy) return;
    setBusy(true);
    const id = await createProject(workspace?.id, { prompt: text, templateId: template });
    setBusy(false);
    if (id) go({ name: "project", id, prompt: text });
  };
  const startFrom = async (t: Template) => {
    setStarting(t.id);
    const id = await createProject(workspace?.id, { templateId: t.id, name: t.name });
    setStarting(null);
    if (id) go({ name: "project", id });
  };

  const meters = usage
    ? [
        { icon: LayoutTemplate, label: "Projects", value: usage.counts.projects, limit: usage.limits.projects },
        { icon: Sparkles, label: "AI requests", value: usage.used.ai_request ?? 0, limit: usage.limits.aiRequestsPerMonth },
        { icon: Cpu, label: "Preview minutes", value: usage.used.runtime_minutes ?? 0, limit: usage.limits.runtimeMinutesPerMonth },
        { icon: Zap, label: "Deployments", value: usage.used.deployment ?? 0, limit: usage.limits.deploymentsPerMonth },
      ]
    : null;

  return (
    <div className="scroll h-full">
      <div className="mx-auto max-w-[1240px] px-8 pb-12 pt-7">
        {/* Header row + composer: compact, left-aligned, tool-like. */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-[-0.02em]">
              {greeting()}, {first}
            </h1>
            <p className="mt-0.5 text-[13px] text-muted">{workspace?.name ?? "Your workspace"} · {projects ? `${projects.length} project${projects.length === 1 ? "" : "s"}` : "…"}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => go({ name: "templates" })}>
              <LayoutTemplate /> Templates
            </Button>
            <Button size="sm" onClick={() => void window.codexa.openWeb("/dashboard/github")}>
              <GitBranch /> Import from GitHub
            </Button>
          </div>
        </div>

        <div className="card-edge focus-halo mt-5 rounded-xl border border-border bg-card focus-within:border-border-strong">
          <Textarea
            id="composer"
            value={prompt}
            rows={2}
            maxLength={4000}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void build();
              }
            }}
            placeholder={PLACEHOLDERS[ph]}
            aria-label="Describe what you want to build"
            className="min-h-[72px] px-4 pt-3.5 text-[14px]"
          />
          <div className="flex items-center gap-2 border-t border-border/70 px-2.5 py-2">
            <Menu
              align="start"
              width={300}
              trigger={(open, toggle) => (
                <button type="button" onClick={toggle} aria-expanded={open} aria-label="Starter" className="inline-flex h-7 max-w-[260px] items-center gap-2 rounded-md border border-border bg-bg px-2 text-[12.5px] font-medium hover:border-border-strong">
                  <ProjectThumb templateId={picked?.id ?? template} name={picked?.name ?? "Starter"} className="h-4 w-7 rounded-[3px] border border-border" />
                  <span className="truncate">{picked?.name ?? "React starter"}</span>
                  <ChevronDown className="size-3.5 shrink-0 text-dim" />
                </button>
              )}
            >
              {(close) => (
                <>
                  <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium text-dim">Build on</p>
                  {starters.map((t) => (
                    <button key={t.id} type="button" onClick={() => (setTemplate(t.id), close())} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface">
                      <ProjectThumb templateId={t.id} name={t.name} className="h-7 w-11 rounded-md border border-border" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{t.name}</span>
                        <span className="block truncate text-[11.5px] text-muted">{t.frameworkName}</span>
                      </span>
                      {template === t.id ? <Check className="size-4 text-muted" /> : null}
                    </button>
                  ))}
                  <button type="button" onClick={() => (close(), go({ name: "templates" }))} className="mt-1 flex w-full items-center justify-between rounded-lg border-t border-border px-2.5 pb-1.5 pt-2.5 text-[12.5px] font-medium text-muted hover:text-fg">
                    Browse all templates <ArrowRight className="size-3.5" />
                  </button>
                </>
              )}
            </Menu>
            <ul className="hidden items-center gap-1 xl:flex" aria-label="Ideas">
              {IDEAS.slice(0, 5).map((i) => (
                <li key={i.label}>
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt(i.prompt);
                      setTemplate(i.template);
                      document.getElementById("composer")?.focus();
                    }}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-muted transition-colors hover:bg-surface hover:text-fg"
                  >
                    <i.icon className="size-3.5" /> {i.label}
                  </button>
                </li>
              ))}
            </ul>
            <span className="ml-auto hidden items-center gap-1 text-[11.5px] text-dim md:flex">
              <Kbd>Enter</Kbd> to build
            </span>
            <Button variant="accent" size="sm" onClick={() => void build()} disabled={!prompt.trim()} loading={busy}>
              Build {busy ? null : <ArrowUp />}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_320px] gap-5">
          {/* Left: projects table + templates */}
          <div className="min-w-0 space-y-6">
            <section aria-labelledby="recent">
              <SectionHead id="recent" title="Recent projects" action={projects && projects.length > 0 ? "All projects" : undefined} onAction={() => go({ name: "projects" })} />
              {projects === null ? (
                <div className="flex h-32 items-center justify-center rounded-xl border border-border bg-card">
                  <Spinner />
                </div>
              ) : projects.length === 0 ? (
                <EmptyState icon={<Rocket />} title="No projects yet" body="Describe your first app above, or start from one of 111 working templates." action={<Button onClick={() => go({ name: "templates" })}>Browse templates</Button>} />
              ) : (
                <div className="card-edge overflow-hidden rounded-xl border border-border bg-card">
                  <div className="grid grid-cols-[minmax(0,1fr)_130px_110px_90px_36px] gap-3 border-b border-border bg-surface/60 px-3 py-1.5 text-[11.5px] font-medium text-dim">
                    <span>Name</span>
                    <span>Framework</span>
                    <span>Edited</span>
                    <span>Status</span>
                    <span />
                  </div>
                  {projects.slice(0, 8).map((p) => {
                    const live = liveByProject.get(p.id);
                    return (
                      <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_130px_110px_90px_36px] items-center gap-3 border-b border-border px-3 py-2 last:border-b-0 hover:bg-surface/50">
                        <button type="button" onClick={() => go({ name: "project", id: p.id })} className="flex min-w-0 items-center gap-2.5 text-left">
                          <ProjectThumb templateId={p.templateId} name={p.name} className="h-7 w-[46px] rounded-[5px] border border-border" />
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium">{p.name}</span>
                            {p.description ? <span className="block truncate text-[11.5px] text-muted">{p.description}</span> : null}
                          </span>
                        </button>
                        <span className="truncate text-[12.5px] text-muted">{frameworkLabel(p.framework)}</span>
                        <span className="text-[12.5px] text-muted">{relativeTime(p.updatedAt)}</span>
                        <span>
                          {live ? (
                            <button type="button" onClick={() => live.url && void window.codexa.openExternal(live.url)} className="inline-flex items-center gap-1 text-[12px] font-medium text-success hover:underline">
                              <span className="size-1.5 rounded-full bg-success" /> Live
                            </button>
                          ) : (
                            <span className="text-[12px] text-dim">Draft</span>
                          )}
                        </span>
                        <ProjectMenu project={p} />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {featured.length ? (
              <section aria-labelledby="starters">
                <SectionHead id="starters" title="Start from a template" sub="Working apps you can run right away and change with AI." action="All 111" onAction={() => go({ name: "templates" })} />
                <ul className="grid grid-cols-3 gap-3">
                  {featured.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => void startFrom(t)}
                        disabled={Boolean(starting)}
                        className="card-edge lift group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-2.5 text-left hover:border-border-strong disabled:opacity-60"
                      >
                        <ProjectThumb templateId={t.id} name={t.name} className="h-11 w-[72px] shrink-0 rounded-md border border-border" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">{t.name}</span>
                          <span className="block truncate text-[11.5px] text-muted">{t.frameworkName} · {t.fileCount} files</span>
                        </span>
                        {starting === t.id ? <Spinner /> : <ArrowRight className="size-4 shrink-0 text-dim opacity-0 transition-opacity group-hover:opacity-100" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {/* Right rail: usage, deployments, quick links */}
          <aside className="space-y-4">
            <Card title="Usage this month" action={usage?.plan === "free" ? { label: "Upgrade", onClick: () => void window.codexa.openWeb("/settings/billing") } : undefined}>
              {meters ? (
                <ul className="space-y-3">
                  {meters.map((m) => {
                    const unlimited = m.limit <= 0 || m.limit >= 1e9;
                    const pct = unlimited ? 0 : Math.min(100, (m.value / m.limit) * 100);
                    return (
                      <li key={m.label}>
                        <div className="flex items-center justify-between text-[12.5px]">
                          <span className="flex items-center gap-1.5 text-muted">
                            <m.icon className="size-3.5" /> {m.label}
                          </span>
                          <span className="tabular-nums">
                            {m.value.toLocaleString()}
                            {!unlimited ? <span className="text-dim"> / {m.limit.toLocaleString()}</span> : null}
                          </span>
                        </div>
                        {!unlimited ? (
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface">
                            <div className={cn("h-full rounded-full", pct > 90 ? "bg-danger" : pct > 70 ? "bg-warning" : "bg-accent")} style={{ width: `${Math.max(pct, 1.5)}%` }} />
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <Spinner />
              )}
            </Card>

            <Card title="Latest deployments">
              {deploys === null ? (
                <Spinner />
              ) : deploys.length === 0 ? (
                <p className="text-[12.5px] text-muted">Nothing published yet. Open a project and press Publish.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {deploys.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0">
                      <Badge tone={DEPLOY_TONE[d.status]} className="w-[64px] justify-center">
                        {DEPLOY_LABEL[d.status]}
                      </Badge>
                      <button type="button" onClick={() => go({ name: "project", id: d.project.id })} className="min-w-0 flex-1 truncate text-left text-[12.5px] hover:underline">
                        {d.project.name}
                      </button>
                      <span className="shrink-0 text-[11.5px] text-dim">{relativeTime(d.createdAt)}</span>
                      {d.url && d.status === "live" ? (
                        <button type="button" aria-label="Open site" onClick={() => void window.codexa.openExternal(d.url!)} className="text-dim hover:text-fg">
                          <ExternalLink className="size-3.5" />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Quick links">
              <ul className="space-y-0.5">
                {(
                  [
                    ["Browse community apps", Compass, () => void window.codexa.openWeb("/showcase")],
                    ["Invite your team", UserPlus, () => void window.codexa.openWeb("/settings/members")],
                    ["Documentation", Globe, () => void window.codexa.openWeb("/docs")],
                  ] as const
                ).map(([label, Icon, run]) => (
                  <li key={label}>
                    <button type="button" onClick={run} className="group flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-[13px] text-muted transition-colors hover:bg-surface hover:text-fg">
                      <Icon className="size-4" /> <span className="flex-1 text-left">{label}</span>
                      <ExternalLink className="size-3.5 text-dim opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Card({ title, action, children }: { title: string; action?: { label: string; onClick: () => void }; children: React.ReactNode }) {
  return (
    <section className="card-edge rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2">
        <h2 className="text-[12.5px] font-semibold">{title}</h2>
        {action ? (
          <button type="button" onClick={action.onClick} className="text-[12px] font-medium text-accent hover:underline">
            {action.label}
          </button>
        ) : null}
      </div>
      <div className="p-3.5">{children}</div>
    </section>
  );
}

function SectionHead({ id, title, sub, action, onAction }: { id: string; title: string; sub?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-2.5 flex items-end justify-between">
      <div>
        <h2 id={id} className="text-[14px] font-semibold tracking-[-0.01em]">
          {title}
        </h2>
        {sub ? <p className="mt-0.5 text-[12.5px] text-muted">{sub}</p> : null}
      </div>
      {action ? (
        <button type="button" onClick={onAction} className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-fg">
          {action} <ArrowRight className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
