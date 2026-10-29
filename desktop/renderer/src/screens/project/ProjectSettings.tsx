import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { ApiError, settingsApi, type Project } from "../../lib/api";
import { Button, Field, Input, Spinner, toast } from "../../ui";
import { PanelHeader } from "./History";

/** Name, description, who can see it, and project knowledge (rules the AI follows on every request). */
export function ProjectSettingsPanel({ projectId, canEdit, onSaved }: { projectId: string; canEdit: boolean; onSaved: (p: Project) => void }) {
  const [form, setForm] = useState<{ name: string; description: string; visibility: Project["visibility"]; knowledge: string } | null>(null);
  const [initial, setInitial] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    settingsApi
      .get(projectId)
      .then(({ project }) => {
        const f = { name: project.name, description: project.description ?? "", visibility: project.visibility, knowledge: project.settings?.knowledge ?? "" };
        setForm(f);
        setInitial(JSON.stringify(f));
      })
      .catch(() => setForm(null));
  }, [projectId]);

  if (!form) {
    return (
      <div className="flex h-full flex-col bg-card">
        <PanelHeader title="Project settings" />
        <Spinner className="m-4" />
      </div>
    );
  }
  const dirty = JSON.stringify(form) !== initial;
  const save = async () => {
    setBusy(true);
    try {
      const { project } = await settingsApi.save(projectId, { name: form.name.trim(), description: form.description.trim(), visibility: form.visibility, settings: { knowledge: form.knowledge.trim() } });
      setInitial(JSON.stringify(form));
      onSaved(project);
      toast.success("Project settings saved");
    } catch (err) {
      toast.error("Couldn't save", err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <PanelHeader title="Project settings" sub="Applies to everyone in this project">
        <Button size="sm" variant="primary" disabled={!canEdit || !dirty || !form.name.trim()} loading={busy} onClick={() => void save()}>
          Save
        </Button>
      </PanelHeader>
      <fieldset disabled={!canEdit} className="scroll min-h-0 flex-1 space-y-5 p-4">
        <Field label="Name" htmlFor="ps-name">
          <Input id="ps-name" value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Description" htmlFor="ps-desc">
          <Input id="ps-desc" value={form.description} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this app does" />
        </Field>
        <Field label="Who can see it" htmlFor="ps-vis" hint={form.visibility === "public" ? "Listed in the community; anyone can view and remix it." : form.visibility === "unlisted" ? "Anyone with the link can view it." : "Only your workspace."}>
          <select
            id="ps-vis"
            value={form.visibility}
            onChange={(e) => setForm({ ...form, visibility: e.target.value as Project["visibility"] })}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-[14px] shadow-sm outline-none focus-visible:outline-2 focus-visible:outline-ring"
          >
            <option value="private">Private</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
        </Field>
        <Field label="Project knowledge" htmlFor="ps-know" hint={`Rules and facts the AI follows on every request (${form.knowledge.length.toLocaleString()} / 4,000).`}>
          <textarea
            id="ps-know"
            value={form.knowledge}
            maxLength={4000}
            rows={8}
            onChange={(e) => setForm({ ...form, knowledge: e.target.value })}
            placeholder={"e.g. Use our brand color #0f766e.\nAll prices are in INR.\nKeep copy short and friendly."}
            className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-[13.5px] leading-relaxed shadow-sm outline-none placeholder:text-dim focus-visible:outline-2 focus-visible:outline-ring"
          />
        </Field>
        <div className="rounded-xl border border-border bg-surface/60 p-3.5">
          <p className="text-[12.5px] font-medium">More on the web</p>
          <p className="mt-0.5 text-[12px] text-muted">Environment variables, custom domains, GitHub sync, Cloud database and client feedback.</p>
          <Button size="sm" variant="ghost" className="mt-2 -ml-2" onClick={() => void window.codexa.openWeb(`/projects/${projectId}`)}>
            <ExternalLink /> Open project on the web
          </Button>
        </div>
      </fieldset>
    </div>
  );
}
