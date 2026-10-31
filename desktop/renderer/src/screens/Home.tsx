import { useEffect, useState } from "react";
import { Activity, ArrowRight, ArrowUp, BarChart3, BookOpen, Bot, Briefcase, Check, CheckCircle2, ChevronDown, Circle, Clock, Compass, Cpu, ExternalLink, GitBranch, GitFork, Globe, GraduationCap, LayoutTemplate, Rocket, Save, Server, ShieldCheck, ShoppingBag, Sparkles, Undo2, UserPlus, X, Zap } from "lucide-react";
import { useApp } from "../app/state";
import { deployApi, historyApi, membersApi, showcaseApi, statusApi, templatesApi, type Deployment, type Project, type ShowcaseItem, type Snapshot, type SystemStatus, type TeamMember, type Template } from "../lib/api";
import { cn, relativeTime } from "../lib/util";
import { Avatar, Badge, Button, EmptyState, Kbd, Menu, Spinner, Textarea } from "../ui";
import { ProjectCard } from "../components/ProjectCard";
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
const LEARN = [
  { title: "Prompting that works", body: "How to describe features so the agent gets them right the first time.", path: "/docs/prompting", icon: BookOpen },
  { title: "Preview and debug", body: "Run your app, read the console, and let Fix mode repair errors.", path: "/docs/editor", icon: Cpu },
  { title: "Publish to a domain", body: "Put your app on the web and connect a custom domain.", path: "/docs/custom-domains", icon: Globe },
];
const SETUP_KEY = "codexa:setup-dismissed";
const DEPLOY_TONE: Record<Deployment["status"], "neutral" | "success" | "warning" | "danger"> = { queued: "warning", building: "warning", deploying: "warning", live: "success", failed: "danger", rolled_back: "neutral" };
const DEPLOY_LABEL: Record<Deployment["status"], string> = { queued: "Queued", building: "Building", deploying: "Deploying", live: "Live", failed: "Failed", rolled_back: "Previous" };
type Event = { id: string; at: string; icon: typeof Save; tint: string; text: string; project: Project };
const SNAPSHOT_KIND: Record<string, { icon: typeof Save; tint: string; verb: string }> = {
  manual: { icon: Save, tint: "text-fg", verb: "saved a checkpoint in" },
  auto: { icon: Clock, tint: "text-muted", verb: "auto-saved" },
  ai: { icon: Sparkles, tint: "text-accent", verb: "AI changed" },
  deploy: { icon: Rocket, tint: "text-success", verb: "published" },
  restore: { icon: Undo2, tint: "text-warning", verb: "restored" },
};
const STATE_DOT: Record<SystemStatus["overall"], string> = { operational: "bg-success", degraded: "bg-warning", down: "bg-danger", not_configured: "bg-dim", unknown: "bg-dim" };
const STATE_LABEL: Record<SystemStatus["overall"], string> = { operational: "Operational", degraded: "Degraded", down: "Down", not_configured: "Not configured", unknown: "Unknown" };

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
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [setupHidden, setSetupHidden] = useState(() => localStorage.getItem(SETUP_KEY) === "1");
  const [snapshots, setSnapshots] = useState<(Snapshot & { project: Project })[] | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const first = (user.name || user.email).split(/[\s@]/)[0];

  useEffect(() => {
    statusApi
      .get()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);
  // Checkpoints across recent projects: the activity feed and the 14-day chart are built from them.
  useEffect(() => {
    if (!projects) return;
    Promise.all(projects.slice(0, 6).map((p) => historyApi.list(p.id).then((r) => r.snapshots.map((s) => ({ ...s, project: p }))).catch(() => [])))
      .then((all) => setSnapshots(all.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
      .catch(() => setSnapshots([]));
  }, [projects]);

  useEffect(() => {
    templatesApi
      .list()
      .then((r) => setTemplates(r.templates))
      .catch(() => setTemplates([]));
    showcaseApi
      .list(4)
      .then((r) => setShowcase(r.entries))
      .catch(() => setShowcase([]));
  }, []);
  useEffect(() => {
    if (!workspace) return;
    membersApi
      .list(workspace.id)
      .then((r) => setMembers(r.members))
      .catch(() => setMembers([]));
  }, [workspace]);
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

  // Setup checklist: every item is a real signal from the account, never a guess.
  const setup = [
    { label: "Create your first project", done: (projects?.length ?? 0) > 0, run: () => document.getElementById("composer")?.focus() },
    { label: "Run a live preview", done: (usage?.used.runtime_minutes ?? 0) > 0, run: () => projects?.[0] && go({ name: "project", id: projects[0].id }) },
    { label: "Publish an app", done: (deploys?.some((d) => d.status === "live") ?? false) || (usage?.used.deployment ?? 0) > 0, run: () => projects?.[0] && go({ name: "project", id: projects[0].id }) },
    { label: "Verify your email", done: Boolean(user.emailVerifiedAt), run: () => void window.codexa.openWeb("/settings/security") },
    { label: "Invite a teammate", done: members.length > 1, run: () => void window.codexa.openWeb("/settings/members") },
  ];
  const setupDone = setup.filter((s) => s.done).length;
  const showSetup = !setupHidden && setupDone < setup.length && projects !== null;

  // Activity feed: checkpoints + deployments, newest first.
  const events: Event[] = [
    ...(snapshots ?? []).map((s) => {
      const k = SNAPSHOT_KIND[s.kind] ?? SNAPSHOT_KIND.auto;
      return { id: `s:${s.id}`, at: s.createdAt, icon: k.icon, tint: k.tint, text: `${k.verb} ${s.project.name}`, project: s.project };
    }),
    ...(deploys ?? []).map((d) => ({ id: `d:${d.id}`, at: d.createdAt, icon: Rocket, tint: d.status === "failed" ? "text-danger" : "text-success", text: `${d.status === "failed" ? "failed to publish" : d.status === "live" ? "published" : DEPLOY_LABEL[d.status].toLowerCase()} ${d.project.name}`, project: d.project })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);
  // 14-day chart of checkpoints (one bar per day, oldest left).
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (13 - i));
    return d;
  });
  const perDay = days.map((d) => (snapshots ?? []).filter((s) => new Date(s.createdAt).toDateString() === d.toDateString()).length);
  const peak = Math.max(1, ...perDay);
  const thisWeek = perDay.slice(7).reduce((a, b) => a + b, 0);
  const lastWeek = perDay.slice(0, 7).reduce((a, b) => a + b, 0);
  const checkpointsByProject = new Map<string, number>();
  for (const s of snapshots ?? []) checkpointsByProject.set(s.project.id, (checkpointsByProject.get(s.project.id) ?? 0) + 1);

  const kpis = usage
    ? [
        { icon: LayoutTemplate, label: "Projects", value: usage.counts.projects, limit: usage.limits.projects, hint: "in this workspace" },
        { icon: Sparkles, label: "AI requests", value: usage.used.ai_request ?? 0, limit: usage.limits.aiRequestsPerMonth, hint: "this month" },
        { icon: Cpu, label: "Preview minutes", value: usage.used.runtime_minutes ?? 0, limit: usage.limits.runtimeMinutesPerMonth, hint: "this month" },
        { icon: Zap, label: "Deployments", value: usage.used.deployment ?? 0, limit: usage.limits.deploymentsPerMonth, hint: "this month" },
      ]
    : null;

  return (
    <div className="scroll h-full">
      <div className="mx-auto max-w-[1280px] px-8 pb-14 pt-6">
        {/* Hero band: greeting, team, prompt. */}
        <section className="brand-mesh card-edge rise relative overflow-hidden rounded-2xl border border-border bg-card px-7 pb-6 pt-6">
          <div aria-hidden="true" className="dot-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[12.5px] font-medium text-muted">
                {workspace?.name ?? "Your workspace"} · <span className="capitalize">{usage?.plan ?? workspace?.plan ?? "free"}</span> plan · {projects ? `${projects.length} project${projects.length === 1 ? "" : "s"}` : "…"}
              </p>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-bold tracking-[-0.03em]">
                {greeting()}, {first}. <span className="brand-gradient-text">What are we building?</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {members.length > 0 ? (
                <button type="button" onClick={() => void window.codexa.openWeb("/settings/members")} title={`${members.length} member${members.length === 1 ? "" : "s"}`} className="mr-1 flex items-center">
                  {members.slice(0, 4).map((m, i) => (
                    <span key={m.userId ?? m.id ?? i} className={cn("rounded-full ring-2 ring-card", i > 0 && "-ml-1.5")}>
                      <Avatar name={m.name || m.user?.name || m.email || m.user?.email || "?"} size={26} />
                    </span>
                  ))}
                </button>
              ) : null}
              <Button size="sm" onClick={() => go({ name: "templates" })}>
                <LayoutTemplate /> Templates
              </Button>
              <Button size="sm" onClick={() => void window.codexa.openWeb("/dashboard/github")}>
                <GitBranch /> Import
              </Button>
            </div>
          </div>

          <div className="focus-halo relative mt-5 rounded-xl border border-border bg-card shadow-card">
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
              className="min-h-[84px] px-4 pt-4 text-[15px]"
            />
            <div className="flex items-center gap-2 border-t border-border/70 px-2.5 py-2">
              <Menu
                align="start"
                width={300}
                trigger={(open, toggle) => (
                  <button type="button" onClick={toggle} aria-expanded={open} aria-label="Starter" className="inline-flex h-8 max-w-[260px] items-center gap-2 rounded-lg border border-border bg-bg px-2 text-[12.5px] font-medium hover:border-border-strong">
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
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12.5px] text-muted transition-colors hover:bg-surface hover:text-fg"
                    >
                      <i.icon className="size-3.5" /> {i.label}
                    </button>
                  </li>
                ))}
              </ul>
              <span className="ml-auto hidden items-center gap-1 text-[11.5px] text-dim md:flex">
                <Kbd>Enter</Kbd> to build
              </span>
              <Button variant="primary" onClick={() => void build()} disabled={!prompt.trim()} loading={busy}>
                Build {busy ? null : <ArrowUp />}
              </Button>
            </div>
          </div>
        </section>

        {/* KPI row */}
        <ul className="mt-5 grid grid-cols-4 gap-4">
          {(kpis ?? Array.from({ length: 4 }, () => null)).map((k, i) => {
            if (!k) return <li key={i} className="pulse h-[92px] rounded-2xl border border-border bg-card" />;
            const unlimited = k.limit <= 0 || k.limit >= 1e9;
            const pct = unlimited ? 0 : Math.min(100, (k.value / k.limit) * 100);
            return (
              <li key={k.label} className="card-edge lift rise rounded-2xl border border-border bg-card p-4" style={{ "--d": `${80 + i * 50}ms` } as React.CSSProperties}>
                <div className="flex items-center gap-3">
                  <span className="icon-tile size-10">
                    <k.icon className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] text-muted">{k.label}</span>
                    <span className="block font-[family-name:var(--font-display)] text-[22px] font-bold tabular-nums leading-tight tracking-[-0.02em]">
                      {k.value.toLocaleString()}
                      {!unlimited ? <span className="text-[13px] font-medium text-dim"> / {k.limit.toLocaleString()}</span> : null}
                    </span>
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div className={cn("h-full rounded-full", pct > 90 ? "bg-danger" : pct > 70 ? "bg-warning" : "brand-bar")} style={{ width: `${unlimited ? 100 : Math.max(pct, 2)}%`, opacity: unlimited ? 0.25 : 1 }} />
                </div>
              </li>
            );
          })}
        </ul>

        {showSetup ? (
          <section className="card-edge rise mt-5 rounded-2xl border border-border bg-card" aria-labelledby="setup" style={{ "--d": "260ms" } as React.CSSProperties}>
            <div className="flex items-center gap-3 border-b border-border px-5 py-3">
              <span className="relative flex size-9 items-center justify-center">
                <svg viewBox="0 0 36 36" className="absolute inset-0 size-9 -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-surface" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke="url(#ring)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(setupDone / setup.length) * 94.2} 94.2`} />
                  <defs>
                    <linearGradient id="ring" x1="0" x2="1">
                      <stop offset="0" stopColor="var(--brand-a)" />
                      <stop offset="1" stopColor="var(--brand-c)" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="text-[11px] font-semibold tabular-nums">{setupDone}/{setup.length}</span>
              </span>
              <span className="min-w-0 flex-1">
                <h2 id="setup" className="text-[14px] font-semibold">
                  Get set up
                </h2>
                <span className="block text-[12.5px] text-muted">{setup.length - setupDone} step{setup.length - setupDone === 1 ? "" : "s"} left to get the most out of Codexa.</span>
              </span>
              <button type="button" aria-label="Hide setup checklist" onClick={() => (localStorage.setItem(SETUP_KEY, "1"), setSetupHidden(true))} className="flex size-7 items-center justify-center rounded-md text-dim hover:bg-surface hover:text-fg">
                <X className="size-4" />
              </button>
            </div>
            <ol className="grid grid-cols-5 divide-x divide-border">
              {setup.map((s) => (
                <li key={s.label}>
                  <button type="button" onClick={s.run} disabled={s.done} className={cn("flex h-full w-full items-start gap-2 px-4 py-3.5 text-left transition-colors", s.done ? "text-muted" : "hover:bg-surface/60")}>
                    {s.done ? <CheckCircle2 className="mt-px size-4 shrink-0 text-success" /> : <Circle className="mt-px size-4 shrink-0 text-border-strong" />}
                    <span className={cn("text-[13px] leading-snug", s.done && "line-through decoration-border-strong")}>{s.label}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="min-w-0 space-y-8">
            <section aria-labelledby="recent">
              <SectionHead id="recent" title="Recent projects" sub="Pick up where you left off." action={projects && projects.length > 0 ? "All projects" : undefined} onAction={() => go({ name: "projects" })} />
              {projects === null ? (
                <div className="flex h-40 items-center justify-center rounded-2xl border border-border bg-card">
                  <Spinner />
                </div>
              ) : projects.length === 0 ? (
                <EmptyState icon={<Rocket />} title="No projects yet" body="Describe your first app above, or start from one of 111 working templates." action={<Button variant="primary" onClick={() => go({ name: "templates" })}>Browse templates</Button>} />
              ) : (
                <ul className="grid grid-cols-2 gap-4 2xl:grid-cols-3">
                  {projects.slice(0, 6).map((p) => (
                    <li key={p.id}>
                      <ProjectCard project={p} live={liveByProject.get(p.id)?.url ?? null} checkpoints={checkpointsByProject.get(p.id)} members={members} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {featured.length ? (
              <section aria-labelledby="starters">
                <SectionHead id="starters" title="Start from a template" sub="Working apps you can run right away and change with AI." action="All 111" onAction={() => go({ name: "templates" })} />
                <ul className="grid grid-cols-3 gap-4">
                  {featured.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => void startFrom(t)}
                        disabled={Boolean(starting)}
                        className="card-edge lift group w-full overflow-hidden rounded-2xl border border-border bg-card text-left hover:border-border-strong disabled:opacity-60"
                      >
                        <span className="block aspect-[16/9] overflow-hidden border-b border-border bg-surface">
                          <ProjectThumb templateId={t.id} name={t.name} big className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]" />
                        </span>
                        <span className="flex items-center gap-2 px-3.5 py-3">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-semibold">{t.name}</span>
                            <span className="block truncate text-[12px] text-muted">{t.frameworkName} · {t.fileCount} files</span>
                          </span>
                          {starting === t.id ? <Spinner /> : <ArrowRight className="size-4 shrink-0 text-dim opacity-0 transition-opacity group-hover:opacity-100" />}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {showcase.length ? (
              <section aria-labelledby="community">
                <SectionHead id="community" title="From the community" sub="Public apps built with Codexa that you can open and remix." action="Browse all" onAction={() => void window.codexa.openWeb("/showcase")} />
                <ul className="grid grid-cols-2 gap-4">
                  {showcase.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => void window.codexa.openWeb(`/showcase/${s.slug}`)} className="card-edge lift flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-3 text-left hover:border-border-strong">
                        <ProjectThumb templateId={s.project.templateId} name={s.title} className="h-14 w-[92px] shrink-0 rounded-lg border border-border" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-semibold">{s.title}</span>
                          <span className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted">{s.description}</span>
                          <span className="mt-1.5 flex items-center gap-2 text-[11.5px] text-dim">
                            <span>{s.project.frameworkName}</span>
                            <span className="flex items-center gap-1">
                              <GitFork className="size-3" /> {s.remixCount}
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section aria-labelledby="learn">
              <SectionHead id="learn" title="Learn Codexa" sub="Short guides from the documentation." action="All docs" onAction={() => void window.codexa.openWeb("/docs")} />
              <ul className="grid grid-cols-3 gap-4">
                {LEARN.map((l) => (
                  <li key={l.title}>
                    <button type="button" onClick={() => void window.codexa.openWeb(l.path)} className="card-edge lift flex h-full w-full flex-col rounded-2xl border border-border bg-card p-4 text-left hover:border-border-strong">
                      <span className="icon-tile size-10">
                        <l.icon className="size-[18px]" />
                      </span>
                      <span className="mt-3 text-[14px] font-semibold">{l.title}</span>
                      <span className="mt-1 text-[12.5px] leading-snug text-muted">{l.body}</span>
                      <span className="mt-3 flex items-center gap-1 text-[12px] font-medium text-primary">
                        <GraduationCap className="size-3.5" /> Read the guide
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-4">
            <Card title="Activity · 14 days" icon={Activity}>
              {snapshots === null ? (
                <Spinner />
              ) : (
                <>
                  <div className="flex items-end justify-between">
                    <span>
                      <span className="block font-[family-name:var(--font-display)] text-[22px] font-bold tabular-nums leading-none tracking-[-0.02em]">{thisWeek}</span>
                      <span className="mt-1 block text-[11.5px] text-muted">checkpoints this week</span>
                    </span>
                    <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums", thisWeek >= lastWeek ? "bg-success/10 text-success" : "bg-surface text-muted")}>
                      {thisWeek >= lastWeek ? "+" : ""}
                      {thisWeek - lastWeek} vs last week
                    </span>
                  </div>
                  <div className="mt-3 flex h-12 items-end gap-1" aria-label="Checkpoints per day, last 14 days">
                    {perDay.map((n, i) => (
                      <span key={i} title={`${days[i].toLocaleDateString(undefined, { month: "short", day: "numeric" })}: ${n}`} className={cn("flex-1 rounded-sm", n ? "bg-primary" : "bg-surface")} style={{ height: `${Math.max(8, (n / peak) * 100)}%`, opacity: n ? 0.55 + 0.45 * (n / peak) : 1 }} />
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-[10.5px] text-dim">
                    <span>{days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    <span>Today</span>
                  </div>
                  <ul className="mt-3 divide-y divide-border border-t border-border">
                    {events.length === 0 ? <li className="pt-2 text-[12.5px] text-muted">No activity yet.</li> : null}
                    {events.slice(0, 6).map((e) => (
                      <li key={e.id} className="flex items-center gap-2.5 py-1.5">
                        <e.icon className={cn("size-3.5 shrink-0", e.tint)} />
                        <button type="button" onClick={() => go({ name: "project", id: e.project.id })} className="min-w-0 flex-1 truncate text-left text-[12.5px] hover:underline">
                          <span className="text-muted">You </span>
                          {e.text}
                        </button>
                        <span className="shrink-0 text-[11px] tabular-nums text-dim">{relativeTime(e.at)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>

            <Card title="Latest deployments" icon={Rocket}>
              {deploys === null ? (
                <Spinner />
              ) : deploys.length === 0 ? (
                <p className="text-[12.5px] text-muted">Nothing published yet. Open a project and press Publish.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {deploys.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                      <Badge tone={DEPLOY_TONE[d.status]} className="w-[64px] justify-center">
                        {DEPLOY_LABEL[d.status]}
                      </Badge>
                      <button type="button" onClick={() => go({ name: "project", id: d.project.id })} className="min-w-0 flex-1 truncate text-left text-[13px] font-medium hover:underline">
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

            <Card title="Quick actions" icon={Zap}>
              <ul className="space-y-1">
                {(
                  [
                    ["Browse community apps", "Open and remix public projects", Compass, () => void window.codexa.openWeb("/showcase")],
                    ["Invite your team", "Build together in this workspace", UserPlus, () => void window.codexa.openWeb("/settings/members")],
                    ["Documentation", "Guides for every step", BookOpen, () => void window.codexa.openWeb("/docs")],
                  ] as const
                ).map(([label, hint, Icon, run]) => (
                  <li key={label}>
                    <button type="button" onClick={run} className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface">
                      <span className="icon-tile size-9">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium">{label}</span>
                        <span className="block truncate text-[11.5px] text-muted">{hint}</span>
                      </span>
                      <ExternalLink className="size-3.5 text-dim opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="System status" icon={ShieldCheck}>
              {status ? (
                <ul className="space-y-1.5">
                  {status.components.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 text-[12.5px]">
                      <span className={cn("size-1.5 shrink-0 rounded-full", STATE_DOT[c.state])} />
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="shrink-0 text-[11.5px] text-dim">
                        {STATE_LABEL[c.state]}
                        {c.latencyMs !== undefined ? ` · ${c.latencyMs} ms` : ""}
                      </span>
                    </li>
                  ))}
                  <li className="pt-1 text-[11px] text-dim">Checked {relativeTime(status.checkedAt)}</li>
                </ul>
              ) : (
                <Spinner />
              )}
            </Card>

            {usage?.plan === "free" ? (
              <section className="card-edge relative overflow-hidden rounded-2xl border border-border bg-card p-4">
                <p className="text-[14px] font-semibold">Go Pro</p>
                <p className="mt-1 text-[12.5px] leading-snug text-muted">25 projects, 1,000 AI requests a month, more preview time and deployments.</p>
                <Button size="sm" variant="primary" className="mt-3" onClick={() => void window.codexa.openWeb("/settings/billing")}>
                  See plans <ArrowRight />
                </Button>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Rocket; children: React.ReactNode }) {
  return (
    <section className="card-edge rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Icon className="size-4 text-primary" />
        <h2 className="text-[13px] font-semibold">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function SectionHead({ id, title, sub, action, onAction }: { id: string; title: string; sub?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <h2 id={id} className="font-[family-name:var(--font-display)] text-[17px] font-bold tracking-[-0.02em]">
          {title}
        </h2>
        {sub ? <p className="mt-0.5 text-[13px] text-muted">{sub}</p> : null}
      </div>
      {action ? (
        <button type="button" onClick={onAction} className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
          {action} <ArrowRight className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
