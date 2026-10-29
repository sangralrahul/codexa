import { useEffect, useState } from "react";
import { ArrowRight, ArrowUp, BarChart3, Bot, Briefcase, Check, ChevronDown, Clock, Cpu, Globe, LayoutTemplate, Rocket, Server, ShoppingBag, Sparkles, Zap } from "lucide-react";
import { useApp } from "../app/state";
import { templatesApi, type Template } from "../lib/api";
import { frameworkLabel, relativeTime } from "../lib/util";
import { Button, EmptyState, Kbd, Menu, Spinner, Textarea } from "../ui";
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
const FEATURED = ["vite-react-saas", "vite-react-dashboard", "vite-react-storefront", "vite-react-landing"];
const STARTERS = [DEFAULT_TEMPLATE, ...FEATURED, "vite-react-ai-chat", "vite-react-portfolio", "node-express-api"];

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
  const first = (user.name || user.email).split(/[\s@]/)[0];

  useEffect(() => {
    templatesApi
      .list()
      .then((r) => setTemplates(r.templates))
      .catch(() => setTemplates([]));
  }, []);

  const byId = new Map((templates ?? []).map((t) => [t.id, t]));
  const featured = FEATURED.map((id) => byId.get(id)).filter((t): t is Template => Boolean(t));
  const starters = STARTERS.map((id) => byId.get(id)).filter((t): t is Template => Boolean(t));
  const picked = byId.get(template);
  const last = projects?.[0] ?? null;
  const rest = (projects ?? []).slice(1, 7);

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

  const stats = usage
    ? [
        { icon: LayoutTemplate, label: "Projects", value: usage.counts.projects, limit: usage.limits.projects },
        { icon: Sparkles, label: "AI requests this month", value: usage.used.ai_request ?? 0, limit: usage.limits.aiRequestsPerMonth },
        { icon: Cpu, label: "Preview minutes", value: usage.used.runtime_minutes ?? 0, limit: usage.limits.runtimeMinutesPerMonth },
        { icon: Zap, label: "Deployments", value: usage.used.deployment ?? 0, limit: usage.limits.deploymentsPerMonth },
      ]
    : null;

  return (
    <div className="scroll relative h-full">
      <div aria-hidden="true" className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[520px]" />
      <div aria-hidden="true" className="dot-grid pointer-events-none absolute inset-x-0 top-0 h-[420px] [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-60" />
      <div className="relative mx-auto max-w-[1180px] px-10 pb-16">
        <section className="mx-auto max-w-[780px] pt-[7vh]">
          <p className="text-center text-[13px] font-medium text-muted">
            {greeting()}, {first}
          </p>
          <h1 className="mt-2 text-balance text-center font-[family-name:var(--font-display)] text-[38px] font-semibold leading-[1.1] tracking-[-0.03em]">What should we build today?</h1>
          <p className="mt-3 text-center text-[15px] text-muted">Describe it in plain words. Codexa plans it, writes the code and runs a live preview.</p>

          <div className="card-edge mt-8 rounded-[22px] border border-border bg-card transition-colors focus-within:border-border-strong focus-within:accent-ring">
            <Textarea
              id="composer"
              value={prompt}
              rows={3}
              maxLength={4000}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void build();
                }
              }}
              placeholder="Build a habit tracker with streaks and weekly charts…"
              aria-label="Describe what you want to build"
              className="min-h-[116px] px-5 pt-5 text-[15px]"
            />
            <div className="flex items-center gap-2 border-t border-border/70 px-3 py-2.5">
              <Menu
                align="start"
                width={300}
                trigger={(open, toggle) => (
                  <button type="button" onClick={toggle} aria-expanded={open} aria-label="Starter" className="inline-flex h-8 max-w-[260px] items-center gap-2 rounded-lg border border-border bg-bg px-2 text-[12.5px] font-medium hover:border-border-strong">
                    <ProjectThumb templateId={picked?.id ?? template} name={picked?.name ?? "Starter"} className="h-5 w-8 rounded-[4px] border border-border" />
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
              <span className="ml-auto hidden items-center gap-1 text-[12px] text-dim md:flex">
                <Kbd>Enter</Kbd> to build · <Kbd>Shift</Kbd> <Kbd>Enter</Kbd> new line
              </span>
              <Button variant="accent" className="rounded-full px-4" onClick={() => void build()} disabled={!prompt.trim()} loading={busy}>
                Build {busy ? null : <ArrowUp />}
              </Button>
            </div>
          </div>

          <ul className="mt-5 flex flex-wrap justify-center gap-2" aria-label="Ideas">
            {IDEAS.map((i) => (
              <li key={i.label}>
                <button
                  type="button"
                  onClick={() => {
                    setPrompt(i.prompt);
                    setTemplate(i.template);
                    document.getElementById("composer")?.focus();
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 text-[12.5px] font-medium text-muted backdrop-blur transition-colors hover:border-border-strong hover:text-fg"
                >
                  <i.icon className="size-3.5" /> {i.label}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {last ? (
          <section className="mt-14 grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-4" aria-label="Overview">
            <div className="card-edge group relative flex overflow-hidden rounded-2xl border border-border bg-card">
              <button type="button" onClick={() => go({ name: "project", id: last.id })} className="flex w-full text-left" aria-label={`Continue ${last.name}`}>
                <span className="relative w-[46%] shrink-0 overflow-hidden border-r border-border bg-surface">
                  <ProjectThumb templateId={last.templateId} name={last.name} big className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-[1.03]" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col p-5">
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-accent">
                    <Clock className="size-3.5" /> Continue building
                  </span>
                  <span className="mt-2 truncate font-[family-name:var(--font-display)] text-[20px] font-semibold tracking-[-0.02em]">{last.name}</span>
                  <span className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">{last.description || `${frameworkLabel(last.framework)} project`}</span>
                  <span className="mt-auto flex items-center justify-between pt-4 text-[12.5px] text-muted">
                    <span>Edited {relativeTime(last.updatedAt)}</span>
                    <span className="inline-flex items-center gap-1 font-medium text-fg">
                      Open <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(stats ?? Array.from({ length: 4 }, () => null)).map((s, i) =>
                s ? (
                  <div key={s.label} className="card-edge rounded-2xl border border-border bg-card p-4">
                    <s.icon className="size-4 text-muted" />
                    <p className="mt-3 font-[family-name:var(--font-display)] text-[22px] font-semibold tabular-nums tracking-[-0.02em]">
                      {s.value.toLocaleString()}
                      {s.limit > 0 && s.limit < 1e9 ? <span className="text-[13px] font-medium text-dim"> / {s.limit.toLocaleString()}</span> : null}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted">{s.label}</p>
                  </div>
                ) : (
                  <div key={i} className="pulse rounded-2xl border border-border bg-card" />
                ),
              )}
            </div>
          </section>
        ) : null}

        {featured.length ? (
          <section className="mt-12" aria-labelledby="starters">
            <SectionHead id="starters" title="Start from a template" sub="Working apps you can run right away and change with AI." action="All templates" onAction={() => go({ name: "templates" })} />
            <ul className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {featured.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => void startFrom(t)}
                    disabled={Boolean(starting)}
                    className="card-edge group w-full overflow-hidden rounded-2xl border border-border bg-card text-left transition-[border-color,translate] duration-200 hover:-translate-y-0.5 hover:border-border-strong disabled:opacity-60"
                  >
                    <span className="block aspect-[16/10] overflow-hidden border-b border-border">
                      <ProjectThumb templateId={t.id} name={t.name} big className="h-full w-full transition-transform duration-500 group-hover:scale-[1.02]" />
                    </span>
                    <span className="flex items-center gap-2 px-3.5 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold">{t.name}</span>
                        <span className="block truncate text-[12px] text-muted">{t.frameworkName}</span>
                      </span>
                      {starting === t.id ? <Spinner /> : <ArrowRight className="size-4 shrink-0 text-dim opacity-0 transition-opacity group-hover:opacity-100" />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-12" aria-labelledby="recent">
          <SectionHead id="recent" title="Recent projects" sub={projects ? `${projects.length} in ${workspace?.name ?? "this workspace"}` : undefined} action={projects && projects.length > 1 ? "View all" : undefined} onAction={() => go({ name: "projects" })} />
          {projects === null ? (
            <div className="flex h-40 items-center justify-center">
              <Spinner />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState icon={<Rocket />} title="No projects yet" body="Describe your first app above, or start from one of 111 working templates." action={<Button onClick={() => go({ name: "templates" })}>Browse templates</Button>} />
          ) : rest.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border-strong px-6 py-8 text-center text-[13px] text-muted">Your other projects will show up here.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {rest.map((p) => (
                <li key={p.id}>
                  <ProjectCard project={p} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function SectionHead({ id, title, sub, action, onAction }: { id: string; title: string; sub?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <h2 id={id} className="font-[family-name:var(--font-display)] text-[17px] font-semibold tracking-[-0.015em]">
          {title}
        </h2>
        {sub ? <p className="mt-0.5 text-[13px] text-muted">{sub}</p> : null}
      </div>
      {action ? (
        <button type="button" onClick={onAction} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
          {action} <ArrowRight className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
