import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, ExternalLink, Globe, Link2, Lock, Trash2 } from "lucide-react";
import { ApiError, projectsApi, settingsApi, type Project } from "../../lib/api";
import { cn, frameworkLabel } from "../../lib/util";
import { useApp } from "../../app/state";
import { Button, Dialog, Field, Input, Spinner, toast } from "../../ui";
import { PanelHeader } from "./History";

const VISIBILITY: { id: Project["visibility"]; label: string; hint: string; icon: typeof Lock }[] = [
  { id: "private", label: "Private", hint: "Only your workspace", icon: Lock },
  { id: "unlisted", label: "Unlisted", hint: "Anyone with the link", icon: Link2 },
  { id: "public", label: "Public", hint: "Listed in the community", icon: Globe },
];

function Section({ title, description, children, tone }: { title: string; description?: string; children: ReactNode; tone?: "danger" }) {
  return (
    <section className={cn("rounded-xl border bg-card", tone === "danger" ? "border-danger/30" : "border-border")}>
      <div className="border-b border-border px-4 py-2.5">
        <h3 className={cn("text-[13px] font-semibold", tone === "danger" && "text-danger")}>{title}</h3>
        {description ? <p className="mt-0.5 text-[12px] text-muted">{description}</p> : null}
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

/** Name, description, who can see it, and project knowledge (rules the AI follows on every request). */
export function ProjectSettingsPanel({ projectId, canEdit, onSaved }: { projectId: string; canEdit: boolean; onSaved: (p: Project) => void }) {
  const { go, refreshProjects } = useApp();
  const [project, setProject] = useState<Project | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; visibility: Project["visibility"]; knowledge: string } | null>(null);
  const [initial, setInitial] = useState("");
  const [busy, setBusy] = useState<"save" | "duplicate" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    settingsApi
      .get(projectId)
      .then(({ project }) => {
        const f = { name: project.name, description: project.description ?? "", visibility: project.visibility, knowledge: project.settings?.knowledge ?? "" };
        setProject(project);
        setForm(f);
        setInitial(JSON.stringify(f));
      })
      .catch(() => setForm(null));
  }, [projectId]);

  if (!form || !project) {
    return (
      <div className="flex h-full flex-col bg-card">
        <PanelHeader title="Project settings" />
        <Spinner className="m-4" />
      </div>
    );
  }
  const dirty = JSON.stringify(form) !== initial;
  const save = async () => {
    setBusy("save");
    try {
      const { project: p } = await settingsApi.save(projectId, { name: form.name.trim(), description: form.description.trim(), visibility: form.visibility, settings: { knowledge: form.knowledge.trim() } });
      setInitial(JSON.stringify(form));
      setProject((cur) => (cur ? { ...cur, ...p } : cur));
      onSaved(p);
      toast.success("Project settings saved");
    } catch (err) {
      toast.error("Couldn't save", err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(null);
    }
  };
  const duplicate = async () => {
    setBusy("duplicate");
    try {
      const { project: p } = await projectsApi.duplicate(projectId);
      await refreshProjects();
      toast.success("Project duplicated", `Opening “${p.name}”.`);
      go({ name: "project", id: p.id });
    } catch (err) {
      toast.error("Couldn't duplicate", err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(null);
    }
  };
  const remove = async () => {
    setBusy("delete");
    try {
      await projectsApi.remove(projectId);
      await refreshProjects();
      toast.success("Project deleted");
      go({ name: "projects" });
    } catch (err) {
      toast.error("Couldn't delete", err instanceof ApiError ? err.message : undefined);
      setBusy(null);
    }
  };
  const copyId = async () => {
    await navigator.clipboard.writeText(projectId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <PanelHeader title="Project settings" sub={dirty ? "Unsaved changes" : "Applies to everyone in this project"}>
        <Button size="sm" variant="primary" disabled={!canEdit || !dirty || !form.name.trim()} loading={busy === "save"} onClick={() => void save()}>
          Save
        </Button>
      </PanelHeader>
      <fieldset disabled={!canEdit} className="scroll min-h-0 flex-1 space-y-4 bg-bg/40 p-3">
        <Section title="General">
          <Field label="Name" htmlFor="ps-name">
            <Input id="ps-name" value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Description" htmlFor="ps-desc" hint="Shown on the project card and used by the AI for context.">
            <Input id="ps-desc" value={form.description} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this app does" />
          </Field>
        </Section>

        <Section title="Who can see it">
          <div className="grid gap-2" role="radiogroup" aria-label="Visibility">
            {VISIBILITY.map((v) => {
              const on = form.visibility === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setForm({ ...form, visibility: v.id })}
                  className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors", on ? "border-fg bg-surface" : "border-border hover:border-border-strong")}
                >
                  <v.icon className={cn("size-4 shrink-0", on ? "text-fg" : "text-muted")} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">{v.label}</span>
                    <span className="block text-[12px] text-muted">{v.hint}</span>
                  </span>
                  <span className={cn("flex size-4 items-center justify-center rounded-full border", on ? "border-fg bg-fg text-card" : "border-border-strong")}>{on ? <Check className="size-3" /> : null}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Project knowledge" description="Rules and facts the AI follows on every request in this project.">
          <textarea
            id="ps-know"
            aria-label="Project knowledge"
            value={form.knowledge}
            maxLength={4000}
            rows={7}
            onChange={(e) => setForm({ ...form, knowledge: e.target.value })}
            placeholder={"e.g. Use our brand color #0f766e.\nAll prices are in INR.\nKeep copy short and friendly."}
            className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-[13.5px] leading-relaxed shadow-sm outline-none placeholder:text-dim focus-visible:outline-2 focus-visible:outline-ring"
          />
          <p className="text-right text-[11.5px] tabular-nums text-dim">{form.knowledge.length.toLocaleString()} / 4,000</p>
        </Section>

        <Section title="About">
          <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[12.5px]">
            <dt className="text-muted">Framework</dt>
            <dd className="font-medium">{frameworkLabel(project.framework)}</dd>
            <dt className="text-muted">Template</dt>
            <dd className="truncate font-medium">{project.templateId ?? "Blank"}</dd>
            <dt className="text-muted">Created</dt>
            <dd className="font-medium">{new Date(project.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</dd>
            <dt className="text-muted">Project ID</dt>
            <dd className="flex min-w-0 items-center gap-1.5">
              <code className="selectable truncate font-mono text-[11.5px] text-muted">{projectId}</code>
              <button type="button" onClick={() => void copyId()} aria-label="Copy project ID" className="shrink-0 text-dim hover:text-fg">
                {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
              </button>
            </dd>
          </dl>
          <p className="text-[12px] text-muted">Environment variables, custom domains, GitHub sync, Cloud database and client feedback are managed on the web.</p>
          <Button size="sm" variant="secondary" onClick={() => void window.codexa.openWeb(`/projects/${projectId}`)}>
            <ExternalLink /> Open project on the web
          </Button>
        </Section>

        <Section title="Danger zone" tone="danger" description="These actions affect the whole project.">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium">Duplicate</p>
              <p className="text-[12px] text-muted">Copy all files into a new project.</p>
            </div>
            <Button size="sm" variant="secondary" loading={busy === "duplicate"} onClick={() => void duplicate()}>
              Duplicate
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <div>
              <p className="text-[13px] font-medium">Delete project</p>
              <p className="text-[12px] text-muted">Removes files, history and deployments.</p>
            </div>
            <Button size="sm" variant="danger" onClick={() => (setTyped(""), setConfirmDelete(true))}>
              <Trash2 /> Delete
            </Button>
          </div>
        </Section>
      </fieldset>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Delete “${project.name}”?`} description="This permanently removes the project's files, chat history, checkpoints and published versions. This can't be undone.">
        <Field label={`Type ${project.name} to confirm`} htmlFor="ps-del">
          <Input id="ps-del" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={typed.trim() !== project.name} loading={busy === "delete"} onClick={() => void remove()}>
            <Trash2 /> Delete project
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
