import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, BarChart3, Bot, Briefcase, Check, CheckCircle2, ChevronDown, Circle, ExternalLink, GitBranch, GitFork, Globe, LayoutTemplate, Rocket, Server, ShoppingBag, X } from "lucide-react";
import { useApp } from "../app/state";
import { deployApi, historyApi, membersApi, showcaseApi, statusApi, templatesApi, type Deployment, type Project, type ShowcaseItem, type Snapshot, type SystemStatus, type TeamMember, type Template } from "../lib/api";
import { cn, frameworkLabel, relativeTime } from "../lib/util";
import { Avatar, Button, EmptyState, Kbd, Menu, Spinner, Textarea } from "../ui";
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
const LEARN = [
  { title: "Prompting that works", body: "Describe features so the agent gets them right the first time.", path: "/docs/prompting" },
  { title: "Preview and debug", body: "Run your app, read the console, let Fix mode repair errors.", path: "/docs/editor" },
  { title: "Publish to a domain", body: "Put your app on the web and connect a custom domain.", path: "/docs/custom-domains" },
];
/** How many projects the dashboard table shows (and loads deployments and checkpoints for). */
const TABLE_ROWS = 8;
const SETUP_KEY = "codexa:setup-dismissed";
const DEPLOY_LABEL: Record<Deployment["status"], string> = { queued: "Queued", building: "Building", deploying: "Deploying", live: "Live", failed: "Failed", rolled_back: "Rolled back" };
const DEPLOY_DOT: Record<Deployment["status"], string> = { queued: "bg-warning", building: "bg-warning", deploying: "bg-warning", live: "bg-success", failed: "bg-danger", rolled_back: "bg-dim" };
const SNAPSHOT_VERB: Record<string, string> = { manual: "Checkpoint saved", auto: "Auto-saved", ai: "AI changed files", deploy: "Published", restore: "Restored a checkpoint" };
const STATE_DOT: Record<SystemStatus["overall"], string> = { operational: "bg-success", degraded: "bg-warning", down: "bg-danger", not_configured: "bg-dim", unknown: "bg-dim" };
const STATE_LABEL: Record<SystemStatus["overall"], string> = { operational: "Operational", degraded: "Degraded", down: "Down", not_configured: "Not configured", unknown: "Unknown" };

type ProjectDeploy = Deployment & { project: Project };
type ProjectSnapshot = Snapshot & { project: Project };
type Feed = { id: string; at: string; dot: string; title: string; detail: string; project: Project };

const hostOf = (url: string | null | undefined) => {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};
const shortTime = (iso: string) => relativeTime(iso).replace(" ago", "");

export function HomeScreen() {
  const { user, workspace, projects, usage, go } = useApp();
  const [prompt, setPrompt] = useState("");
  const [template, setTemplate] = useState<string>(DEFAULT_TEMPLATE);
  const [busy, setBusy] = useState(false);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [ph, setPh] = useState(0);
  const [deploys, setDeploys] = useState<ProjectDeploy[] | null>(null);
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [setupHidden, setSetupHidden] = useState(() => localStorage.getItem(SETUP_KEY) === "1");
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[] | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [statusFailed, setStatusFailed] = useState(false);
  const first = (user.name || user.email).split(/[\s@]/)[0];

  useEffect(() => {
    statusApi
      .get()
      .then(setStatus)
      .catch(() => setStatusFailed(true));
  }, []);
  // Checkpoints for the projects in the table: the Checkpoint column and the activity feed.
  useEffect(() => {
    if (!projects) return;
    Promise.all(projects.slice(0, TABLE_ROWS).map((p) => historyApi.list(p.id).then((r) => r.snapshots.map((s) => ({ ...s, project: p }))).catch(() => [] as ProjectSnapshot[])))
      .then((all) => setSnapshots(all.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
      .catch(() => setSnapshots([]));
  }, [projects]);
  // Deployments for the same projects (the API is per project): Status and Domain columns, and the feed.
  useEffect(() => {
    if (!projects) return;
    Promise.all(projects.slice(0, TABLE_ROWS).map((p) => deployApi.list(p.id).then((r) => r.deployments.slice(0, 3).map((d) => ({ ...d, project: p }))).catch(() => [] as ProjectDeploy[])))
      .then((all) => setDeploys(all.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
      .catch(() => setDeploys([]));
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

  const byId = new Map((templates ?? []).map((t) => [t.id, t]));
  const featured = FEATURED.map((id) => byId.get(id)).filter((t): t is Template => Boolean(t));
  const starters = STARTERS.map((id) => byId.get(id)).filter((t): t is Template => Boolean(t));
  const picked = byId.get(template);

  // Per project: newest deployment, newest live deployment, newest checkpoint.
  const latestDeploy = new Map<string, ProjectDeploy>();
  const liveDeploy = new Map<string, ProjectDeploy>();
  for (const d of deploys ?? []) {
    if (!latestDeploy.has(d.project.id)) latestDeploy.set(d.project.id, d);
    if (d.status === "live" && !liveDeploy.has(d.project.id)) liveDeploy.set(d.project.id, d);
  }
  const latestSnapshot = new Map<string, ProjectSnapshot>();
  for (const s of snapshots ?? []) if (!latestSnapshot.has(s.project.id)) latestSnapshot.set(s.project.id, s);

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
  const applyIdea = (i: (typeof IDEAS)[number]) => {
    setPrompt(i.prompt);
    setTemplate(i.template);
    document.getElementById("composer")?.focus();
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

  // Activity: deployments and checkpoints, newest first.
  const feed: Feed[] = [
    ...(deploys ?? []).map((d) => ({ id: `d:${d.id}`, at: d.createdAt, dot: DEPLOY_DOT[d.status], title: d.project.name, detail: d.status === "live" ? `Published${hostOf(d.url) ? ` to ${hostOf(d.url)}` : ""}` : d.status === "failed" ? "Publish failed" : DEPLOY_LABEL[d.status], project: d.project })),
    ...(snapshots ?? []).map((s) => ({ id: `s:${s.id}`, at: s.createdAt, dot: "bg-dim", title: s.project.name, detail: SNAPSHOT_VERB[s.kind] ?? "Checkpoint saved", project: s.project })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  const unlimited = (n: number | undefined) => n === undefined || n <= 0 || n >= 1e9;
  const meters = usage
    ? [
        { label: "AI requests", value: usage.used.ai_request ?? 0, limit: usage.limits.aiRequestsPerMonth },
        { label: "Preview minutes", value: usage.used.runtime_minutes ?? 0, limit: usage.limits.runtimeMinutesPerMonth },
        { label: "Projects", value: usage.counts.projects, limit: usage.limits.projects },
        { label: "Deployments", value: usage.used.deployment ?? 0, limit: usage.limits.deploymentsPerMonth },
      ]
    : null;
  const rows = (projects ?? []).slice(0, TABLE_ROWS);

  return (
    <div className="scroll h-full">
      <div className="mx-auto grid max-w-[1280px] grid-cols-[minmax(0,1fr)_320px] gap-8 px-8 pb-14 pt-7">
        <div className="min-w-0">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h1 className="text-[20px] font-semibold tracking-[-0.03em]">What are we building, {first}?</h1>
            <p className="eyebrow shrink-0">
              {workspace?.name ?? "Workspace"} / {usage?.plan ?? workspace?.plan ?? "free"}
            </p>
          </div>

          {/* Prompt */}
          <div className="focus-halo rounded-[10px] border border-border-strong bg-card">
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
              className="min-h-[76px] px-4 pb-2 pt-4 text-[15px]"
            />
            <div className="flex items-center gap-2 border-t border-border px-2.5 py-2">
              <Menu
                align="start"
                width={300}
                trigger={(open, toggle) => (
                  <button type="button" onClick={toggle} aria-expanded={open} aria-label="Starter" className={chip("max-w-[220px]")}>
                    <ProjectThumb templateId={picked?.id ?? template} name={picked?.name ?? "Starter"} className="h-3.5 w-6 rounded-[2px]" />
                    <span className="truncate">{picked?.name ?? "React starter"}</span>
                    <ChevronDown className="size-3 shrink-0 text-dim" />
                  </button>
                )}
              >
                {(close) => (
                  <>
                    <p className="eyebrow px-2.5 pb-1 pt-1.5">Build on</p>
                    {starters.map((t) => (
                      <button key={t.id} type="button" onClick={() => (setTemplate(t.id), close())} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-surface">
                        <ProjectThumb templateId={t.id} name={t.name} className="h-7 w-11 rounded-[4px] border border-border-strong" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">{t.name}</span>
                          <span className="block truncate text-[11.5px] text-muted">{t.frameworkName}</span>
                        </span>
                        {template === t.id ? <Check className="size-4 text-muted" /> : null}
                      </button>
                    ))}
                    <button type="button" onClick={() => (close(), go({ name: "templates" }))} className="mt-1 flex w-full items-center justify-between border-t border-border px-2.5 pb-1.5 pt-2.5 text-[12.5px] font-medium text-muted hover:text-fg">
                      Browse all templates <ArrowRight className="size-3.5" />
                    </button>
                  </>
                )}
              </Menu>
              <ul className="hidden items-center gap-2 xl:flex" aria-label="Ideas">
                {IDEAS.slice(0, 3).map((i) => (
                  <li key={i.label}>
                    <button type="button" onClick={() => applyIdea(i)} className={chip()}>
                      <i.icon className="size-3.5" /> {i.label}
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => void window.codexa.openWeb("/dashboard/github")} className={chip()}>
                <GitBranch className="size-3.5" /> Import from GitHub
              </button>
              <Button variant="primary" size="sm" className="ml-auto h-7 gap-2 px-2.5" onClick={() => void build()} disabled={!prompt.trim()} loading={busy}>
                Build
                <kbd className="mono rounded border border-primary-fg/25 px-1 text-[10.5px] font-normal text-primary-fg/60">Enter</kbd>
              </Button>
            </div>
          </div>

          {showSetup ? (
            <section className="mt-4 rounded-lg border border-border" aria-labelledby="setup">
              <div className="flex items-center gap-3 border-b border-border px-3.5 py-2.5">
                <h2 id="setup" className="text-[13px] font-medium">
                  Get set up
                </h2>
                <span className="mono text-[11px] text-dim">
                  {setupDone} / {setup.length}
                </span>
                <span className="h-1 w-24 overflow-hidden rounded-sm bg-track">
                  <span className="block h-full bg-fg" style={{ width: `${(setupDone / setup.length) * 100}%` }} />
                </span>
                <button type="button" aria-label="Hide setup checklist" onClick={() => (localStorage.setItem(SETUP_KEY, "1"), setSetupHidden(true))} className="ml-auto flex size-6 items-center justify-center rounded-md text-dim hover:bg-surface hover:text-fg">
                  <X className="size-3.5" />
                </button>
              </div>
              <ol className="grid grid-cols-5 divide-x divide-border">
                {setup.map((s) => (
                  <li key={s.label}>
                    <button type="button" onClick={s.run} disabled={s.done} className={cn("flex h-full w-full items-start gap-2 px-3.5 py-3 text-left transition-colors", s.done ? "text-dim" : "text-muted hover:bg-surface hover:text-fg")}>
                      {s.done ? <CheckCircle2 className="mt-px size-3.5 shrink-0 text-success" /> : <Circle className="mt-px size-3.5 shrink-0 text-border-strong" />}
                      <span className={cn("text-[12.5px] leading-snug", s.done && "line-through decoration-border-strong")}>{s.label}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {/* Projects table */}
          <div className="mb-3 mt-7 flex items-center gap-2.5">
            <h2 id="projects" className="text-[16px] font-semibold tracking-[-0.01em]">
              Projects
            </h2>
            {projects ? <span className="mono rounded-full border border-border-strong px-1.5 text-[11px] text-muted">{projects.length}</span> : null}
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => go({ name: "templates" })} className={chip()}>
                <LayoutTemplate className="size-3.5" /> Templates
              </button>
              {projects && projects.length > 0 ? (
                <button type="button" onClick={() => go({ name: "projects" })} className={chip()}>
                  All projects <ArrowRight className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>
          {projects !== null && projects.length === 0 ? (
            <EmptyState icon={<Rocket />} title="No projects yet" body="Describe your first app above, or start from one of 111 working templates." action={<Button variant="primary" onClick={() => go({ name: "templates" })}>Browse templates</Button>} />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full border-collapse text-[13px]" aria-labelledby="projects">
                <thead>
                  <tr className="bg-card">
                    {["Project", "Runtime", "Status", "Domain", "Checkpoint", "Updated"].map((h) => (
                      <th key={h} scope="col" className="mono border-b border-border px-3.5 py-2.5 text-left text-[11px] font-normal uppercase tracking-[0.05em] text-dim">
                        {h}
                      </th>
                    ))}
                    <th scope="col" className="w-10 border-b border-border">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects === null
                    ? Array.from({ length: 4 }, (_, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td colSpan={7} className="px-3.5 py-2.5">
                            <span className="pulse block h-10 rounded-[4px] bg-surface" />
                          </td>
                        </tr>
                      ))
                    : rows.map((p) => {
                        const latest = latestDeploy.get(p.id);
                        const live = liveDeploy.get(p.id);
                        const snap = latestSnapshot.get(p.id);
                        const domain = hostOf(live?.url);
                        const loaded = deploys !== null;
                        const state = !loaded ? null : latest && latest.status !== "live" && latest.status !== "rolled_back" ? latest.status : live ? "live" : "draft";
                        return (
                          <tr key={p.id} onClick={() => go({ name: "project", id: p.id })} className="group cursor-default border-b border-border text-muted transition-colors last:border-0 hover:bg-card">
                            <td className="px-3.5 py-2.5">
                              <button type="button" onClick={(e) => (e.stopPropagation(), go({ name: "project", id: p.id }))} className="flex min-w-0 items-center gap-3 text-left">
                                <ProjectThumb templateId={p.templateId} name={p.name} className="h-10 w-16 rounded-[4px] border border-border-strong" />
                                <span className="min-w-0">
                                  <span className="block truncate font-medium text-fg group-hover:underline group-hover:underline-offset-2">{p.name}</span>
                                  <span className="mono block truncate text-[11px] text-dim">{p.slug}</span>
                                </span>
                              </button>
                            </td>
                            <td className="whitespace-nowrap px-3.5 py-2.5">{frameworkLabel(p.framework)}</td>
                            <td className="whitespace-nowrap px-3.5 py-2.5">
                              {state === null ? (
                                <span className="text-dim">…</span>
                              ) : (
                                <span className="inline-flex items-center gap-2 text-fg">
                                  <span className={cn("size-2 rounded-full", state === "draft" ? "bg-dim" : DEPLOY_DOT[state], (state === "queued" || state === "building" || state === "deploying") && "pulse")} />
                                  {state === "draft" ? "Draft" : DEPLOY_LABEL[state]}
                                </span>
                              )}
                            </td>
                            <td className="mono px-3.5 py-2.5 text-[12px]">
                              {domain ? (
                                <button type="button" onClick={(e) => (e.stopPropagation(), void window.codexa.openExternal(live!.url!))} className="block max-w-[190px] truncate text-left hover:text-fg hover:underline" title={`Open ${domain}`}>
                                  {domain}
                                </button>
                              ) : (
                                <span className="text-dim">{loaded ? "Not published" : "…"}</span>
                              )}
                            </td>
                            <td className="mono whitespace-nowrap px-3.5 py-2.5 text-[12px]" title={snap ? `${snap.name} · ${new Date(snap.createdAt).toLocaleString()}` : undefined}>
                              {snap ? snap.id.replace(/[^a-z0-9]/gi, "").slice(-7).toLowerCase() : <span className="text-dim">{snapshots === null ? "…" : "None"}</span>}
                            </td>
                            <td className="whitespace-nowrap px-3.5 py-2.5">{relativeTime(p.updatedAt)}</td>
                            <td className="px-1.5 py-2.5" onClick={(e) => e.stopPropagation()}>
                              <ProjectMenu project={p} />
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
              {projects && projects.length > TABLE_ROWS ? (
                <button type="button" onClick={() => go({ name: "projects" })} className="flex w-full items-center justify-center gap-1.5 border-t border-border py-2.5 text-[12.5px] text-muted hover:bg-card hover:text-fg">
                  View all {projects.length} projects <ArrowRight className="size-3.5" />
                </button>
              ) : null}
            </div>
          )}

          {/* Templates */}
          {featured.length ? (
            <section aria-labelledby="starters" className="mt-9">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="eyebrow flex items-center gap-2">
                    <i className="block size-1.5 bg-fg" /> Templates
                  </p>
                  <h2 id="starters" className="mt-1.5 text-[16px] font-semibold tracking-[-0.01em]">
                    Start from a working app
                  </h2>
                </div>
                <button type="button" onClick={() => go({ name: "templates" })} className={chip()}>
                  All 111 <ArrowRight className="size-3.5" />
                </button>
              </div>
              <ul className="grid grid-cols-3 overflow-hidden rounded-lg border border-border">
                {featured.map((t, i) => (
                  <li key={t.id} className={cn("border-border", i % 3 !== 2 && "border-r", i < featured.length - 3 && "border-b")}>
                    <button type="button" onClick={() => void startFrom(t)} disabled={Boolean(starting)} className="group block w-full p-4 text-left transition-colors hover:bg-card disabled:opacity-60">
                      <span className="block aspect-[16/10] overflow-hidden rounded-md border border-border">
                        <ProjectThumb templateId={t.id} name={t.name} big className="h-full w-full" />
                      </span>
                      <span className="mt-3 flex items-center justify-between gap-2 text-[13px]">
                        <span className="truncate text-fg">{t.name}</span>
                        {starting === t.id ? <Spinner /> : <span className="mono shrink-0 text-[10.5px] uppercase text-dim">{t.frameworkName}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Community + guides */}
          <div className="mt-9 grid grid-cols-2 gap-6">
            <section aria-labelledby="community">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="community" className="text-[14px] font-semibold">
                  From the community
                </h2>
                <button type="button" onClick={() => void window.codexa.openWeb("/showcase")} className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-fg">
                  Browse <ArrowUpRight className="size-3.5" />
                </button>
              </div>
              {showcase.length ? (
                <ul className="border-t border-border">
                  {showcase.map((s) => (
                    <li key={s.id} className="border-b border-border">
                      <button type="button" onClick={() => void window.codexa.openWeb(`/showcase/${s.slug}`)} className="flex w-full items-center gap-3 py-2.5 text-left hover:text-fg">
                        <ProjectThumb templateId={s.project.templateId} name={s.title} className="h-8 w-12 rounded-[4px] border border-border-strong" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">{s.title}</span>
                          <span className="block truncate text-[12px] text-muted">{s.description}</span>
                        </span>
                        <span className="mono flex shrink-0 items-center gap-1 text-[11px] text-dim">
                          <GitFork className="size-3" /> {s.remixCount}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="border-t border-border pt-3 text-[12.5px] text-muted">No public apps to show yet.</p>
              )}
            </section>
            <section aria-labelledby="learn">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="learn" className="text-[14px] font-semibold">
                  Learn Codexa
                </h2>
                <button type="button" onClick={() => void window.codexa.openWeb("/docs")} className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-fg">
                  All docs <ArrowUpRight className="size-3.5" />
                </button>
              </div>
              <ul className="border-t border-border">
                {LEARN.map((l, i) => (
                  <li key={l.title} className="border-b border-border">
                    <button type="button" onClick={() => void window.codexa.openWeb(l.path)} className="group flex w-full items-start gap-3 py-2.5 text-left">
                      <span className="mono mt-0.5 text-[11px] text-dim">0{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium group-hover:underline group-hover:underline-offset-2">{l.title}</span>
                        <span className="block truncate text-[12px] text-muted">{l.body}</span>
                      </span>
                      <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-dim" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        {/* Aside */}
        <aside className="flex flex-col gap-5 pt-[42px]">
          <Box title="Usage" meta={usage ? <><span className="capitalize">{usage.plan}</span> plan · this month</> : null}>
            {meters ? (
              <div className="flex flex-col gap-3.5 px-3.5 py-3">
                {meters.map((m) => {
                  const free = unlimited(m.limit);
                  const pct = free ? 0 : Math.min(100, (m.value / m.limit) * 100);
                  return (
                    <div key={m.label}>
                      <div className="mb-1.5 flex justify-between text-[13px] text-muted">
                        {m.label}
                        <span className="mono text-[12px] text-fg">
                          {m.value.toLocaleString()} / {free ? "Unlimited" : m.limit.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-1 rounded-sm bg-track">
                        <div className={cn("h-full rounded-sm", pct > 90 ? "bg-danger" : pct > 75 ? "bg-warning" : "bg-fg")} style={{ width: free ? 0 : `${Math.max(pct, 1)}%` }} />
                      </div>
                    </div>
                  );
                })}
                {usage?.plan === "free" ? (
                  <button type="button" onClick={() => void window.codexa.openWeb("/settings/billing")} className="flex items-center justify-between border-t border-border pt-3 text-[12.5px] text-muted hover:text-fg">
                    Pro: 25 projects, 1,000 AI requests a month <ArrowUpRight className="size-3.5" />
                  </button>
                ) : null}
              </div>
            ) : (
              <BoxLoading />
            )}
          </Box>

          <Box title="Recent activity" meta={feed.length ? "Deploys and checkpoints" : null}>
            {deploys === null || snapshots === null ? (
              <BoxLoading />
            ) : feed.length === 0 ? (
              <p className="px-3.5 py-3 text-[12.5px] text-muted">Nothing yet. Checkpoints and publishes from your projects show up here.</p>
            ) : (
              <ul className="px-3.5 py-1">
                {feed.map((e) => (
                  <li key={e.id} className="grid grid-cols-[8px_1fr_auto] items-start gap-2.5 border-b border-border py-2.5 last:border-0">
                    <span className={cn("mt-1.5 size-2 rounded-full", e.dot)} />
                    <button type="button" onClick={() => go({ name: "project", id: e.project.id })} className="min-w-0 text-left text-[13px] leading-snug">
                      <span className="block truncate font-medium text-fg hover:underline">{e.title}</span>
                      <span className="block truncate text-muted">{e.detail}</span>
                    </button>
                    <time dateTime={e.at} className="mono text-[11px] text-dim">
                      {shortTime(e.at)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Box>

          <Box title="System status" meta={status ? `Checked ${relativeTime(status.checkedAt)}` : null}>
            {status ? (
              <ul className="px-3.5 py-1">
                {status.components.map((c) => (
                  <li key={c.id} className="flex items-center gap-2.5 border-b border-border py-2 text-[13px] last:border-0" title={c.detail}>
                    <span className={cn("size-2 shrink-0 rounded-full", STATE_DOT[c.state])} />
                    <span className="min-w-0 flex-1 truncate text-muted">{c.name}</span>
                    <span className="mono shrink-0 text-[11px] text-dim">
                      {STATE_LABEL[c.state]}
                      {c.latencyMs !== undefined ? ` · ${c.latencyMs}ms` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : statusFailed ? (
              <p className="px-3.5 py-3 text-[12.5px] text-muted">Couldn&apos;t load service status.</p>
            ) : (
              <BoxLoading />
            )}
          </Box>

          {members.length > 0 ? (
            <Box
              title="Members"
              meta={
                <button type="button" onClick={() => void window.codexa.openWeb("/settings/members")} className="inline-flex items-center gap-1 hover:text-fg">
                  Manage <ExternalLink className="size-3" />
                </button>
              }
            >
              <ul className="px-3.5 py-1">
                {members.slice(0, 5).map((m, i) => {
                  const name = m.name || m.user?.name || m.email || m.user?.email || "Member";
                  return (
                    <li key={m.userId ?? m.id ?? i} className="grid grid-cols-[22px_1fr_auto] items-center gap-2.5 border-b border-border py-2 last:border-0">
                      <Avatar name={name} size={22} />
                      <span className="truncate text-[13px] font-medium">{name}</span>
                      <span className="mono text-[10.5px] uppercase tracking-[0.05em] text-dim">{m.role}</span>
                    </li>
                  );
                })}
              </ul>
            </Box>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

/** A d01 "chip": 26px, hairline border, 6px radius, muted 12px label. */
function chip(extra?: string) {
  return cn("inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-md border border-border-strong px-2 text-[12px] text-muted transition-colors hover:bg-surface hover:text-fg", extra);
}

function Box({ title, meta, children }: { title: string; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border" aria-label={title}>
      <h2 className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-3 text-[13px] font-medium">
        {title}
        {meta ? <span className="truncate text-[12px] font-normal text-dim">{meta}</span> : null}
      </h2>
      {children}
    </section>
  );
}

function BoxLoading() {
  return (
    <div className="flex h-20 items-center justify-center">
      <Spinner />
    </div>
  );
}
