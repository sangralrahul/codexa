"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { projectsApi } from "@/lib/client/workspace/api";
import { ClientApiError } from "@/lib/client/api";
import type { ProjectVisibility, TemplateSummary } from "@/lib/client/workspace/types";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { TemplatePicker } from "./template-picker";
import { TemplateThumb } from "@/components/templates/template-thumb";

export type WorkspaceOption = { id: string; name: string; role: string; plan: string };

export function NewProjectForm({
  templates,
  workspaces,
  defaultWorkspaceId,
  defaultTemplateId,
}: {
  templates: TemplateSummary[];
  workspaces: WorkspaceOption[];
  defaultWorkspaceId: string | null;
  defaultTemplateId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId ?? workspaces[0]?.id ?? "");
  const [visibility, setVisibility] = useState<ProjectVisibility>("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const selected = templates.find((t) => t.id === templateId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await projectsApi.create({ workspaceId, name: name.trim(), description: description.trim() || undefined, templateId, visibility });
      router.push(`/projects/${res.project.id}`);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setFieldErrors(err.fieldErrors());
        setError(err.message);
      } else setError(err instanceof Error ? err.message : "Could not create the project");
      setBusy(false);
    }
  };

  if (workspaces.length === 0) {
    return (
      <Alert variant="warning" title="No workspace with edit access">
        You need to be an editor, admin or owner of a workspace to create projects.{" "}
        <Link href="/settings/workspaces/new" className="underline">
          Create a workspace
        </Link>
        .
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:gap-10">
      <section aria-labelledby="template-heading" className="order-2 lg:order-1">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 id="template-heading" className="text-base font-semibold tracking-tight">
            Template
          </h2>
          <p className="text-xs text-muted-foreground">{templates.length} starters</p>
        </div>
        <TemplatePicker templates={templates} value={templateId} onChange={setTemplateId} />
      </section>
      <aside className="order-1 lg:order-2">
        <div className="overflow-hidden rounded-xl border border-border bg-card lg:sticky lg:top-20">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight">Project details</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">You can change these later in project settings.</p>
          </div>
          <div className="space-y-4 px-5 py-5">
            {selected ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface/60 p-2">
                <TemplateThumb category={selected.category} className="w-20 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Starting from</p>
                  <p className="truncate text-sm font-medium">{selected.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{selected.frameworkName}</p>
                </div>
              </div>
            ) : null}
            <Field label="Project name" htmlFor="np-name" error={fieldErrors.name}>
              <Input id="np-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} placeholder="My app" autoFocus />
            </Field>
            <Field label="Description" htmlFor="np-description" hint="Optional. Shown on your project cards." error={fieldErrors.description}>
              <Textarea id="np-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} />
            </Field>
            <Field label="Workspace" htmlFor="np-workspace" error={fieldErrors.workspaceId}>
              <Select id="np-workspace" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.plan})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Visibility" htmlFor="np-visibility" hint="Private projects are visible only to workspace members. Unlisted and public projects can be opened by anyone with a share link." error={fieldErrors.visibility}>
              <Select id="np-visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as ProjectVisibility)}>
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
              </Select>
            </Field>
            {error ? (
              <Alert variant="danger" title="Could not create project">
                {error}{" "}
                {error.includes("Upgrade") ? (
                  <Link href="/settings/billing" className="underline">
                    View plans
                  </Link>
                ) : null}
              </Alert>
            ) : null}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border bg-surface/60 px-5 py-3">
            <Link href="/projects" className={buttonClasses("ghost", "sm")}>
              Cancel
            </Link>
            <Button type="submit" size="sm" loading={busy} disabled={!name.trim() || !workspaceId}>
              Create project
            </Button>
          </div>
        </div>
      </aside>
    </form>
  );
}
