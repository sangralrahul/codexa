"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, FolderGit2, Globe, LayoutTemplate, Link2, Lock, Plus, Sparkles, Zap } from "lucide-react";
import { projectsApi } from "@/lib/client/workspace/api";
import { ClientApiError } from "@/lib/client/api";
import type { ProjectVisibility } from "@/lib/client/workspace/types";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { Avatar } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/segmented";
import { SelectMenu } from "@/components/ui/select-menu";
import { useLaunch } from "@/components/motion/launch";
import { TemplatePreview } from "@/components/templates/template-preview";
import { ProjectThumb } from "@/components/app/project-thumb";
import { cn } from "@/lib/utils";
import { CATEGORY_NAMES, pickerMeta, TemplatePicker, type PickerTemplate } from "./template-picker";
import { PromptBox, type PromptPreset } from "./prompt-box";
import { VISIBILITY_HINTS, VISIBILITY_LABELS } from "./format";

export type WorkspaceOption = { id: string; name: string; role: string; plan: string };
export type HubTab = "describe" | "template";

const VIS: { value: ProjectVisibility; icon: typeof Lock }[] = [
  { value: "private", icon: Lock },
  { value: "unlisted", icon: Link2 },
  { value: "public", icon: Globe },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * New project creation hub: "Describe it" (the composer) | "Start from template" | "Import from
 * GitHub" (a link). The template tab is a 2-column grid beside a sticky Inspector: a large
 * preview that crossfades, the real file count, tags and difficulty, and the project fields
 * (name pre-filled from the template, description behind "+ Add description", workspace,
 * visibility as three radio cards). Create is enabled at once and launches into the editor;
 * the server validates (field errors show inline).
 */
export function NewProjectForm({
  templates,
  workspaces,
  defaultWorkspaceId,
  defaultTemplateId,
  initialTab = "describe",
  presets = [],
  aiConfigured = false,
}: {
  templates: PickerTemplate[];
  workspaces: WorkspaceOption[];
  defaultWorkspaceId: string | null;
  defaultTemplateId: string;
  initialTab?: HubTab;
  presets?: PromptPreset[];
  aiConfigured?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [tab, setTab] = useState<HubTab>(initialTab);
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const selected = templates.find((t) => t.id === templateId) ?? templates[0];
  const [name, setName] = useState(selected?.name ?? "");
  const [nameTouched, setNameTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId ?? workspaces[0]?.id ?? "");
  const [visibility, setVisibility] = useState<ProjectVisibility>("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; quota: boolean } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const launch = useLaunch({ title: selected ? `Starting from ${selected.name}` : "Creating your project" });

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

  const pickTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    // The name follows the template until you type your own.
    if (t && !nameTouched) setName(t.name);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !selected || busy) return;
    setBusy(true);
    setError(null);
    setFieldErrors({});
    launch.start(formRef.current, [{ id: "create", label: "Creating project", state: "active" }]);
    try {
      const res = await projectsApi.create({ workspaceId, name: name.trim(), description: description.trim() || undefined, templateId: selected.id, visibility });
      launch.update("create", "done");
      launch.add({ id: "copy", label: `Copied ${selected.fileCount} file${selected.fileCount === 1 ? "" : "s"} from ${selected.name}`, state: "done" });
      launch.add({ id: "open", label: "Opening the editor" });
      router.push(`/projects/${res.project.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create the project";
      if (err instanceof ClientApiError) setFieldErrors(err.fieldErrors());
      setError({ message, quota: err instanceof ClientApiError && (err.code === "quota_exceeded" || err.status === 402) });
      launch.fail("create", message, { collapse: true });
      setBusy(false);
    }
  };

  const workspace = workspaces.find((w) => w.id === workspaceId);

  return (
    <div>
      <Segmented<HubTab | "import">
        aria-label="How do you want to start?"
        value={tab}
        onValueChange={(v) => (v === "import" ? router.push(`/import-project${workspaceId ? `?workspace=${encodeURIComponent(workspaceId)}` : ""}`) : setTab(v))}
        className="mb-8 max-w-full overflow-x-auto"
        options={[
          { value: "describe", label: "Describe it", icon: <Sparkles /> },
          { value: "template", label: <ResponsiveLabel short="Template" long="Start from template" />, icon: <LayoutTemplate /> },
          { value: "import", label: <ResponsiveLabel short="Import" long="Import from GitHub" />, icon: <FolderGit2 /> },
        ]}
      />

      {tab === "describe" ? (
        <div className="pop-in mx-auto max-w-4xl pt-2">
          <PromptBox
            workspaceId={workspaceId || null}
            workspaces={workspaces.map((w) => ({ id: w.id, name: w.name, plan: w.plan }))}
            templateId={defaultTemplateId}
            templates={templates.map((t) => ({ id: t.id, name: t.name, category: t.category, framework: t.framework, frameworkName: t.frameworkName, fileCount: t.fileCount }))}
            presets={presets}
            aiConfigured={aiConfigured}
          />
          <p className="mt-8 text-center text-[13px] text-muted-foreground">
            Prefer a known starting point?{" "}
            <button type="button" onClick={() => setTab("template")} className="link-draw font-medium text-foreground">
              Pick a template
            </button>{" "}
            or{" "}
            <Link href="/import-project" className="link-draw font-medium text-foreground">
              import a repository
            </Link>
            .
          </p>
        </div>
      ) : (
        <form ref={formRef} onSubmit={submit} className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px] xl:gap-10">
          <section aria-labelledby="template-heading" className="min-w-0">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 id="template-heading" className="text-[15px] font-semibold tracking-[-0.01em]">
                Choose a starter
              </h2>
              <p className="text-meta text-foreground-dim">{templates.length} runnable templates</p>
            </div>
            <TemplatePicker templates={templates} value={selected?.id ?? ""} onChange={pickTemplate} />
            {/* Below 1024px the Inspector follows the whole grid, so a docked bar keeps Create in reach while you browse. */}
            {selected ? (
              <div className="sticky bottom-[max(12px,env(safe-area-inset-bottom))] z-20 mt-8 lg:hidden">
                <div className="flex items-center gap-3 rounded-[16px] border border-border-strong bg-card/90 p-2 pl-2.5 shadow-xl backdrop-blur-md">
                  <span key={selected.id} className="inspect-swap flex">
                    <ProjectThumb templateId={selected.id} framework={selected.framework} size="lg" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{name.trim() || selected.name}</span>
                    <span className="text-meta block truncate text-muted-foreground">
                      {name.trim() && name.trim() !== selected.name ? `From ${selected.name} · ` : ""}
                      {pickerMeta(selected)}
                    </span>
                  </span>
                  <a href="#np-form" className={buttonClasses("ghost", "sm", "hidden h-9 px-2.5 text-muted-foreground sm:inline-flex")}>
                    Edit details
                  </a>
                  <Button type="submit" size="sm" disabled={busy} className="h-9 shrink-0 gap-1.5 px-4">
                    {busy ? "Creating…" : "Create"}
                    <span className="sr-only"> project from {selected.name}</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          <aside aria-label="Project details" className="scrollbar-thin lg:sticky lg:top-[68px] lg:max-h-[calc(100dvh-84px)] lg:overflow-y-auto lg:rounded-[18px]">
            <div className="e3 overflow-hidden rounded-[18px]">
              {selected ? (
                <div className="border-b border-border">
                  <div className="shot-pan relative">
                    <div key={selected.id} className="inspect-swap">
                      <TemplatePreview id={selected.id} category={selected.category} sizes="400px" className="rounded-none border-0 shadow-none" />
                    </div>
                    <Link
                      href={`/dashboard/templates?preview=${encodeURIComponent(selected.id)}`}
                      className={buttonClasses("outline", "sm", "absolute bottom-3 right-3 h-7 gap-1.5 bg-card/85 px-2.5 text-xs backdrop-blur-md")}
                    >
                      <Eye className="size-3.5" aria-hidden="true" /> Details
                    </Link>
                  </div>
                  <div className="space-y-2 px-5 py-4">
                    <div>
                      <p className="text-[15px] font-semibold tracking-[-0.01em]">{selected.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground" title={selected.description}>
                        {selected.description}
                      </p>
                    </div>
                    <p className="text-meta text-foreground-dim">
                      {CATEGORY_NAMES[selected.category] ?? selected.category} · {pickerMeta(selected)}
                    </p>
                    {selected.tags.length ? (
                      <ul className="flex flex-wrap gap-1" aria-label="Tags">
                        {selected.tags.slice(0, 4).map((tag) => (
                          <li key={tag} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">
                            {tag}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {selected.prebuilt ? (
                      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Zap className="mt-px size-3.5 shrink-0 text-success" aria-hidden="true" />
                        Starts faster: its dependencies are preinstalled on the preview runner.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div id="np-form" className="scroll-mt-20 space-y-4 px-5 py-4">
                <Field label="Project name" htmlFor="np-name" error={fieldErrors.name}>
                  <Input
                    id="np-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameTouched(true);
                    }}
                    onFocus={(e) => e.currentTarget.select()}
                    maxLength={100}
                    placeholder="My app"
                  />
                </Field>
                {showDescription || description || fieldErrors.description ? (
                  <Field label="Description" htmlFor="np-description" optional hint="Shown on your project cards." error={fieldErrors.description}>
                    <Textarea id="np-description" value={description} onChange={(e) => setDescription(e.target.value)} autoGrow={{ minRows: 2, maxRows: 6 }} maxLength={500} autoFocus={showDescription && !description} />
                  </Field>
                ) : (
                  <button type="button" onClick={() => setShowDescription(true)} className="link-draw inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground">
                    <Plus className="size-3.5" aria-hidden="true" /> Add description
                  </button>
                )}
                <Field label="Workspace" htmlFor="np-workspace" error={fieldErrors.workspaceId}>
                  <SelectMenu
                    id="np-workspace"
                    name="workspaceId"
                    value={workspaceId}
                    onValueChange={setWorkspaceId}
                    options={workspaces.map((w) => ({
                      value: w.id,
                      label: w.name,
                      description: `${cap(w.role)} · ${cap(w.plan)} plan`,
                      icon: <Avatar name={w.name} seed={w.id} shape="square" size="xs" />,
                    }))}
                  />
                </Field>
                <fieldset>
                  <legend id="np-visibility-label" className="mb-1.5 text-[13px] font-medium">
                    Visibility
                  </legend>
                  <div
                    id="np-visibility"
                    role="radiogroup"
                    aria-labelledby="np-visibility-label"
                    aria-describedby={fieldErrors.visibility ? "np-visibility-error" : "np-visibility-hint"}
                    className="grid grid-cols-3 gap-2"
                  >
                    {VIS.map(({ value, icon: Icon }) => {
                      const on = visibility === value;
                      return (
                        <label
                          key={value}
                          className={cn(
                            "relative flex cursor-pointer flex-col items-start gap-2 rounded-[12px] border px-3 py-2.5 transition-[border-color,background-color,box-shadow] duration-(--dur-2) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                            on ? "border-foreground/40 bg-surface shadow-[inset_0_0_0_1px_var(--foreground)]" : "border-border hover:border-border-strong",
                          )}
                        >
                          <input type="radio" name="visibility" value={value} checked={on} onChange={() => setVisibility(value)} className="sr-only" />
                          <Icon className={cn("size-4", on ? "text-foreground" : "text-muted-foreground")} aria-hidden="true" />
                          <span className="text-[13px] font-medium">{VISIBILITY_LABELS[value]}</span>
                          <span aria-hidden="true" className={cn("absolute right-2.5 top-2.5 grid size-3.5 place-items-center rounded-full border transition-colors", on ? "border-foreground bg-foreground" : "border-border-strong")}>
                            <span className={cn("size-1 rounded-full bg-background transition-transform duration-(--dur-2) ease-snap", on ? "scale-100" : "scale-0")} />
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {fieldErrors.visibility ? (
                    <p id="np-visibility-error" role="alert" className="mt-1.5 text-xs text-danger">
                      {fieldErrors.visibility}
                    </p>
                  ) : (
                    <p id="np-visibility-hint" className="mt-1.5 text-xs text-muted-foreground">
                      {VISIBILITY_HINTS[visibility]}.
                    </p>
                  )}
                </fieldset>
                {error ? (
                  <Alert variant="danger" title="Could not create project">
                    {error.message}{" "}
                    {error.quota ? (
                      <Link href="/settings/billing" className="underline">
                        View plans
                      </Link>
                    ) : null}
                  </Alert>
                ) : null}
              </div>
              <div className="flex items-center gap-2 border-t border-border bg-surface/60 px-5 py-3">
                <Link href="/projects" className={buttonClasses("ghost", "sm", "text-muted-foreground")}>
                  Cancel
                </Link>
                <Button type="submit" size="sm" disabled={busy || !selected} className="group/create ml-auto h-9 flex-1 gap-1.5 sm:flex-none sm:px-5">
                  {busy ? "Creating…" : "Create project"}
                  <ArrowRight className="size-4 transition-transform duration-(--dur-3) ease-snap group-hover/create:translate-x-0.5 calm:transition-none" aria-hidden="true" />
                </Button>
              </div>
              {workspace ? (
                <p className="border-t border-border px-5 py-2.5 text-[11.5px] text-foreground-dim">
                  Creates in {workspace.name}. You can rename it and change visibility later.
                </p>
              ) : null}
            </div>
          </aside>
        </form>
      )}
      {launch.element}
    </div>
  );
}

/** A short label on phones, the full one from 640px up (only the visible one is in the accessible name). */
function ResponsiveLabel({ short, long }: { short: string; long: string }) {
  return (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{long}</span>
    </>
  );
}
