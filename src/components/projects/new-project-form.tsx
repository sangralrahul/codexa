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
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section aria-labelledby="template-heading" className="order-2 lg:order-1">
        <h2 id="template-heading" className="mb-3 text-sm font-semibold">
          Template
        </h2>
        <TemplatePicker templates={templates} value={templateId} onChange={setTemplateId} />
      </section>
      <aside className="order-1 space-y-4 lg:order-2">
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
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" loading={busy} disabled={!name.trim() || !workspaceId} className="sm:flex-1">
            Create project
          </Button>
          <Link href="/projects" className={buttonClasses("outline", "md")}>
            Cancel
          </Link>
        </div>
      </aside>
    </form>
  );
}
