import { useEffect, useMemo, useState } from "react";
import { LayoutTemplate, Search } from "lucide-react";
import { useApp } from "../app/state";
import { templatesApi, type Template } from "../lib/api";
import { cn } from "../lib/util";
import { Button, EmptyState, Input, Spinner, toast } from "../ui";
import { ProjectThumb } from "../components/ProjectThumb";
import { createProject } from "../components/create";

const LABELS: Record<string, string> = {
  all: "All",
  "landing-pages": "Landing pages",
  websites: "Websites",
  saas: "SaaS",
  dashboards: "Dashboards",
  ecommerce: "E-commerce",
  "ai-tools": "AI tools",
  "admin-panels": "Admin panels",
  crm: "CRM",
  portfolios: "Portfolios",
  "web-apps": "Web apps",
  apis: "APIs",
};
const label = (c: string) => LABELS[c] ?? c.replace(/-/g, " ").replace(/^./, (x) => x.toUpperCase());

export function TemplatesScreen() {
  const { workspace, go } = useApp();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    templatesApi
      .list()
      .then((r) => setTemplates(r.templates))
      .catch((e) => {
        setTemplates([]);
        toast.error("Couldn't load templates", e instanceof Error ? e.message : undefined);
      });
  }, []);

  const categories = useMemo(() => ["all", ...new Set((templates ?? []).map((t) => t.category))], [templates]);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (templates ?? []).filter((t) => (cat === "all" || t.category === cat) && (!n || `${t.name} ${t.description} ${t.tags.join(" ")}`.toLowerCase().includes(n)));
  }, [templates, q, cat]);

  const use = async (t: Template) => {
    setCreating(t.id);
    const id = await createProject(workspace?.id, { templateId: t.id, name: t.name });
    setCreating(null);
    if (id) go({ name: "project", id });
  };

  return (
    <div className="scroll h-full">
      <div className="mx-auto max-w-[1180px] px-10 py-10">
        <header>
          <p className="eyebrow flex items-center gap-2">
            <i className="block size-1.5 bg-fg" /> Starters
          </p>
          <h1 className="mt-1.5 text-[26px] font-semibold tracking-[-0.04em]">Templates</h1>
          <p className="mt-1 text-[13.5px] text-muted">Working starters you can run right away and change with AI.</p>
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates" aria-label="Search templates" className="h-9 pl-9" />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Category">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cat === c}
                onClick={() => setCat(c)}
                className={cn("mono inline-flex h-[26px] items-center gap-1.5 rounded-md border px-2.5 text-[11.5px] transition-colors", cat === c ? "border-fg bg-fg text-bg" : "border-border-strong text-muted hover:bg-surface hover:text-fg")}
              >
                {label(c)}
                <span className={cn("text-[10.5px]", cat === c ? "opacity-60" : "text-dim")}>{c === "all" ? (templates?.length ?? 0) : (templates ?? []).filter((t) => t.category === c).length}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {templates === null ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner />
            </div>
          ) : shown.length === 0 ? (
            <EmptyState icon={<LayoutTemplate />} title="No matching templates" body="Try another search or category." />
          ) : (
            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-4">
              {shown.map((t) => (
                <li key={t.id} className="group flex flex-col overflow-hidden rounded-lg border border-border bg-bg transition-colors hover:border-border-strong hover:bg-card">
                  <div className="aspect-[16/10] overflow-hidden border-b border-border bg-surface">
                    <ProjectThumb templateId={t.id} name={t.name} big className="h-full w-full" />
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="mono flex items-center gap-2 text-[10.5px] uppercase tracking-[0.04em] text-dim">
                      <span className="truncate">
                        {label(t.category)} · {t.frameworkName}
                      </span>
                      {t.difficulty ? <span className={cn("ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] capitalize", t.difficulty === "beginner" ? "bg-success/10 text-success" : t.difficulty === "advanced" ? "border border-border-strong text-fg" : "bg-surface text-muted")}>{t.difficulty}</span> : null}
                    </p>
                    <h3 className="mt-1 truncate text-[14.5px] font-semibold">{t.name}</h3>
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{t.description}</p>
                    <div className="mt-auto pt-4">
                      <Button size="sm" className="w-full" onClick={() => void use(t)} loading={creating === t.id} disabled={Boolean(creating)}>
                        Use template
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
