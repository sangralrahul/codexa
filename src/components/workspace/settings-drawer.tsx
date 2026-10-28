"use client";

import { useEffect, useState } from "react";
import { BookOpenText, Eye, EyeOff, KeyRound, Plus, Settings2, Trash2 } from "lucide-react";
import { envApi, projectsApi } from "@/lib/client/workspace/api";
import type { EnvVarDto, ProjectSettings } from "@/lib/client/workspace/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Alert, Skeleton } from "@/components/ui/misc";
import { Drawer } from "./drawer";
import { ConfirmDialog } from "./confirm-dialog";

export function SettingsDrawer({
  projectId,
  open,
  onOpenChange,
  settings,
  onSettingsSaved,
  canEdit,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  settings: ProjectSettings;
  onSettingsSaved: (s: ProjectSettings) => void;
  canEdit: boolean;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Project settings" icon={<Settings2 aria-hidden="true" />} description="What the AI should always know, the commands used by the preview and build, and environment variables.">
      <div className="space-y-8 px-5 py-4">
        <KnowledgeForm projectId={projectId} settings={settings} onSaved={onSettingsSaved} canEdit={canEdit} />
        <CommandsForm projectId={projectId} settings={settings} onSaved={onSettingsSaved} canEdit={canEdit} />
        <EnvVarsEditor projectId={projectId} canEdit={canEdit} />
      </div>
    </Drawer>
  );
}

const KNOWLEDGE_MAX = 4000;
const KNOWLEDGE_EXAMPLE = `Brand: Larder & Loaf, a neighbourhood bakery in Portland.
Colours: cream #faf8f5 background, terracotta #c2410c accent. Headings in Fraunces.
Tone: warm and plain-spoken; no exclamation marks.
Never: stock photos, emoji, purple, lorem ipsum.`;

/** Project knowledge: owner-written rules the AI follows on every request in this project. */
function KnowledgeForm({ projectId, settings, onSaved, canEdit }: { projectId: string; settings: ProjectSettings; onSaved: (s: ProjectSettings) => void; canEdit: boolean }) {
  const [text, setText] = useState(settings.knowledge ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const dirty = text.trim() !== (settings.knowledge ?? "").trim();
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await projectsApi.patch(projectId, { settings: { knowledge: text.trim() } });
      onSaved(res.project.settings);
      setMsg({ kind: "ok", text: text.trim() ? "Saved. The AI uses this on every request in this project." : "Knowledge cleared." });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not save" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} className="space-y-3" aria-labelledby="settings-knowledge">
      <div>
        <h3 id="settings-knowledge" className="flex items-center gap-1.5 text-[13px] font-semibold">
          <BookOpenText className="size-3.5 text-muted-foreground" aria-hidden="true" /> Project knowledge
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Rules and facts the AI follows on every request here: brand, colours, tone, tech choices, things to avoid.</p>
      </div>
      <Field label="Knowledge" htmlFor="st-knowledge" hint={`${text.length.toLocaleString("en-US")} / ${KNOWLEDGE_MAX.toLocaleString("en-US")} characters`}>
        <Textarea id="st-knowledge" value={text} onChange={(e) => setText(e.target.value)} disabled={!canEdit} maxLength={KNOWLEDGE_MAX} rows={6} placeholder={KNOWLEDGE_EXAMPLE} className="font-mono text-[12.5px] leading-relaxed" />
      </Field>
      {msg ? (
        <p role={msg.kind === "err" ? "alert" : "status"} className={msg.kind === "err" ? "text-xs text-danger" : "text-xs text-success"}>
          {msg.text}
        </p>
      ) : null}
      {canEdit ? (
        <Button type="submit" size="sm" appearance="app" loading={busy} disabled={!dirty}>
          Save knowledge
        </Button>
      ) : null}
    </form>
  );
}

function CommandsForm({ projectId, settings, onSaved, canEdit }: { projectId: string; settings: ProjectSettings; onSaved: (s: ProjectSettings) => void; canEdit: boolean }) {
  const [form, setForm] = useState({
    installCommand: settings.installCommand ?? "",
    devCommand: settings.devCommand ?? "",
    buildCommand: settings.buildCommand ?? "",
    outputDir: settings.outputDir ?? "",
    port: settings.port ? String(settings.port) : "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const port = form.port.trim() ? Number(form.port) : undefined;
    if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) {
      setMsg({ kind: "err", text: "Port must be a whole number between 1 and 65535" });
      setBusy(false);
      return;
    }
    try {
      const patch: ProjectSettings = {
        installCommand: form.installCommand.trim(),
        devCommand: form.devCommand.trim(),
        buildCommand: form.buildCommand.trim(),
        outputDir: form.outputDir.trim(),
        ...(port !== undefined ? { port } : {}),
      };
      const res = await projectsApi.patch(projectId, { settings: patch });
      onSaved(res.project.settings);
      setMsg({ kind: "ok", text: "Settings saved. Restart the preview to apply them." });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not save settings" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" aria-labelledby="settings-commands">
      <h3 id="settings-commands" className="text-[13px] font-semibold">
        Commands
      </h3>
      <Field label="Install command" htmlFor="st-install" hint="Leave empty for npm install.">
        <Input id="st-install" value={form.installCommand} onChange={set("installCommand")} disabled={!canEdit} maxLength={200} placeholder="npm install" />
      </Field>
      <Field label="Dev command" htmlFor="st-dev">
        <Input id="st-dev" value={form.devCommand} onChange={set("devCommand")} disabled={!canEdit} maxLength={200} placeholder="npm run dev" />
      </Field>
      <Field label="Build command" htmlFor="st-build">
        <Input id="st-build" value={form.buildCommand} onChange={set("buildCommand")} disabled={!canEdit} maxLength={200} placeholder="npm run build" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Output directory" htmlFor="st-out">
          <Input id="st-out" value={form.outputDir} onChange={set("outputDir")} disabled={!canEdit} maxLength={100} placeholder="dist" />
        </Field>
        <Field label="Port" htmlFor="st-port">
          <Input id="st-port" value={form.port} onChange={set("port")} disabled={!canEdit} inputMode="numeric" placeholder="5173" />
        </Field>
      </div>
      {msg ? (
        <p role={msg.kind === "err" ? "alert" : "status"} className={msg.kind === "err" ? "text-xs text-danger" : "text-xs text-success"}>
          {msg.text}
        </p>
      ) : null}
      {canEdit ? (
        <Button type="submit" size="sm" appearance="app" loading={busy}>
          Save settings
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">Read-only: you need editor access to change settings.</p>
      )}
    </form>
  );
}

/** Mounted only while the drawer is open, so values are re-fetched (masked) on every open. */
function EnvVarsEditor({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [vars, setVars] = useState<EnvVarDto[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const load = async (reveal: boolean) => {
    try {
      const res = await envApi.list(projectId, reveal);
      setVars(res.vars);
      setRevealed(res.revealed);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load environment variables");
    }
  };

  useEffect(() => {
    let cancelled = false;
    envApi
      .list(projectId, false)
      .then((res) => {
        if (cancelled) return;
        setVars(res.vars);
        setRevealed(res.revealed);
        setError(null);
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load environment variables"));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await envApi.upsert(projectId, { key: key.trim(), value });
      setKey("");
      setValue("");
      await load(revealed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save variable");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="settings-env" className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 id="settings-env" className="flex items-center gap-1.5 text-[13px] font-semibold">
          <KeyRound className="size-4" aria-hidden="true" /> Environment variables
        </h3>
        {canEdit && vars && vars.length > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => void load(!revealed)} aria-pressed={revealed}>
            {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {revealed ? "Mask values" : "Reveal values"}
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">Values are encrypted at rest and injected into the preview sandbox and builds. They are never sent to the browser unless you reveal them.</p>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {!vars ? (
        <Skeleton className="h-10" />
      ) : vars.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong p-4 text-center text-xs text-muted-foreground">No environment variables yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border" aria-label="Environment variables">
          {vars.map((v) => (
            <li key={v.id} className="flex items-center gap-2 px-3 py-2 text-xs">
              <code className="min-w-0 shrink-0 font-mono font-medium">{v.key}</code>
              <code className="min-w-0 flex-1 truncate font-mono text-muted-foreground" title={revealed ? v.value : "Hidden"}>
                {v.value}
              </code>
              {canEdit ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setKey(v.key);
                      setValue(revealed ? v.value : "");
                      document.getElementById("env-value")?.focus();
                    }}
                  >
                    Edit
                  </Button>
                  <button type="button" onClick={() => setToDelete(v.key)} aria-label={`Delete ${v.key}`} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-danger">
                    <Trash2 className="size-4" />
                  </button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <form onSubmit={add} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
          <Field label="Key" htmlFor="env-key">
            <Input id="env-key" value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} placeholder="API_KEY" pattern="[A-Za-z_][A-Za-z0-9_]*" maxLength={128} required className="font-mono" />
          </Field>
          <Field label="Value" htmlFor="env-value">
            <Input id="env-value" value={value} onChange={(e) => setValue(e.target.value)} type="password" autoComplete="off" maxLength={10_000} required className="font-mono" />
          </Field>
          <Button type="submit" size="md" loading={busy} disabled={!key.trim()}>
            <Plus className="size-4" /> {vars?.some((v) => v.key === key.trim()) ? "Update" : "Add"}
          </Button>
        </form>
      ) : null}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete}?`}
        description="The variable is removed from future preview runs and builds."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return;
          await envApi.remove(projectId, toDelete);
          await load(revealed);
        }}
      />
    </section>
  );
}
