import { useEffect, useState } from "react";
import { ArrowRight, ArrowUp, BarChart3, Bot, Briefcase, Globe, LayoutTemplate, Rocket, ShoppingBag, Server } from "lucide-react";
import { useApp } from "../app/state";
import { templatesApi, type Template } from "../lib/api";
import { ProjectThumb } from "../components/ProjectThumb";
import { Button, EmptyState, Kbd, Spinner, Textarea } from "../ui";
import { ProjectCard } from "../components/ProjectCard";
import { createProject } from "../components/create";

const IDEAS = [
  { label: "SaaS product", icon: Rocket, prompt: "A SaaS app for booking studio time, with plans, sign-in and a billing page", template: "vite-react-saas" },
  { label: "Dashboard", icon: BarChart3, prompt: "A sales dashboard with revenue charts, a customers table and date filters", template: "vite-react-dashboard" },
  { label: "Landing page", icon: Globe, prompt: "A landing page for a coffee subscription with pricing, FAQ and an email signup", template: "vite-react-landing" },
  { label: "Online store", icon: ShoppingBag, prompt: "An online store for handmade candles with a product grid, filters and a cart", template: "vite-react-storefront" },
  { label: "AI app", icon: Bot, prompt: "A support chatbot with a conversation sidebar and saved chats", template: "vite-react-ai-chat" },
  { label: "Portfolio", icon: Briefcase, prompt: "A personal portfolio with a projects grid, an about section and a contact form", template: "vite-react-portfolio" },
  { label: "Backend API", icon: Server, prompt: "A REST API for a library: books, members and loans with validation", template: "node-express-api" },
];

export function HomeScreen() {
  const { user, workspace, projects, go } = useApp();
  const [prompt, setPrompt] = useState("");
  const [template, setTemplate] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const first = (user.name || user.email).split(/[\s@]/)[0];
  const [featured, setFeatured] = useState<Template[] | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    const picks = ["vite-react-saas", "vite-react-dashboard", "vite-react-storefront", "vite-react-landing"];
    templatesApi
      .list()
      .then((r) => setFeatured(picks.map((id) => r.templates.find((t) => t.id === id)).filter((t): t is Template => Boolean(t))))
      .catch(() => setFeatured([]));
  }, []);

  const startFrom = async (t: Template) => {
    setStarting(t.id);
    const id = await createProject(workspace?.id, { templateId: t.id, name: t.name });
    setStarting(null);
    if (id) go({ name: "project", id });
  };

  const build = async () => {
    const text = prompt.trim();
    if (!text || busy) return;
    setBusy(true);
    const id = await createProject(workspace?.id, { prompt: text, templateId: template });
    setBusy(false);
    if (id) go({ name: "project", id, prompt: text });
  };

  return (
    <div className="scroll h-full">
      <div className="mx-auto max-w-[1180px] px-10 pb-16">
        <section className="mx-auto max-w-[760px] pt-[7vh]">
          <h1 className="text-center font-[family-name:var(--font-display)] text-[34px] font-semibold leading-tight tracking-[-0.025em]">What should we build{first ? `, ${first}` : ""}?</h1>
          <p className="mt-2.5 text-center text-[15px] text-muted">Describe it in plain words. Codexa writes the code and runs a live preview.</p>

          <div className="mt-8 rounded-[20px] border border-border bg-card shadow-card transition-colors focus-within:border-border-strong">
            <Textarea
              id="composer"
              value={prompt}
              rows={3}
              maxLength={4000}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (!e.target.value) setTemplate(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void build();
                }
              }}
              placeholder="Build a habit tracker with streaks and weekly charts…"
              aria-label="Describe what you want to build"
              className="min-h-[112px] px-5 pt-5"
            />
            <div className="flex items-center gap-2 px-3 pb-3">
              <Button variant="ghost" size="sm" onClick={() => go({ name: "templates" })}>
                <LayoutTemplate /> Start from a template
              </Button>
              <span className="ml-auto hidden items-center gap-1 text-[12px] text-dim md:flex">
                <Kbd>Enter</Kbd> to build
              </span>
              <Button variant="primary" className="rounded-full px-4" onClick={() => void build()} disabled={!prompt.trim()} loading={busy}>
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
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12.5px] font-medium text-muted transition-colors hover:border-border-strong hover:text-fg"
                >
                  <i.icon className="size-3.5" /> {i.label}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {featured && featured.length ? (
          <section className="mt-14" aria-labelledby="starters">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 id="starters" className="text-[16px] font-semibold tracking-[-0.01em]">
                  Start from a template
                </h2>
                <p className="mt-0.5 text-[13px] text-muted">Working apps you can run right away and change with AI.</p>
              </div>
              <button type="button" onClick={() => go({ name: "templates" })} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
                All templates <ArrowRight className="size-3.5" />
              </button>
            </div>
            <ul className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {featured.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => void startFrom(t)}
                    disabled={Boolean(starting)}
                    className="group w-full overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card disabled:opacity-60"
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

        <section className="mt-14" aria-labelledby="recent">
          <div className="mb-4 flex items-end justify-between">
            <h2 id="recent" className="text-[16px] font-semibold tracking-[-0.01em]">
              Recent projects
            </h2>
            {projects && projects.length > 6 ? (
              <button type="button" onClick={() => go({ name: "projects" })} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
                View all {projects.length} <ArrowRight className="size-3.5" />
              </button>
            ) : null}
          </div>
          {projects === null ? (
            <div className="flex h-40 items-center justify-center">
              <Spinner />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState icon={<Rocket />} title="No projects yet" body="Describe your first app above, or start from one of 111 working templates." action={<Button onClick={() => go({ name: "templates" })}>Browse templates</Button>} />
          ) : (
            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {projects.slice(0, 6).map((p) => (
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
