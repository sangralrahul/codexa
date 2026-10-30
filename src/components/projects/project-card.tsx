"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Copy, ExternalLink, Globe, Link2, Lock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { projectsApi } from "@/lib/client/workspace/api";
import type { ProjectListItem } from "@/lib/client/workspace/types";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { TemplatePreview } from "@/components/templates/template-preview";
import { needsTemplateCaption, ProjectThumb } from "@/components/app/project-thumb";
import { absoluteTime, frameworkLabel, lastTouch, relativeTime, VISIBILITY_HINTS, VISIBILITY_LABELS } from "./format";
import { StatusPills, type ProjectStatusDto } from "./status";

/** A project row for lists, with its live state from the database when the page loaded it. */
export type ProjectCardItem = ProjectListItem & { status?: ProjectStatusDto | null };

const VisibilityIcon = ({ v, className }: { v: ProjectListItem["visibility"]; className?: string }) =>
  v === "public" ? <Globe className={className} aria-hidden="true" /> : v === "unlisted" ? <Link2 className={className} aria-hidden="true" /> : <Lock className={className} aria-hidden="true" />;

/** Thumbnail layout when the project has no known template: by runtime framework. */
const FRAMEWORK_CATEGORY: Record<string, string> = { "node-express": "apis", static: "websites", "vite-react": "web-apps", nextjs: "web-apps" };

function Visibility({ v }: { v: ProjectListItem["visibility"] }) {
  return (
    <Tooltip content={`${VISIBILITY_LABELS[v]} · ${VISIBILITY_HINTS[v]}`}>
      <span className="relative z-[2] inline-flex items-center gap-1">
        <VisibilityIcon v={v} className="size-3.5" />
        <span className="sr-only">{VISIBILITY_LABELS[v]}</span>
      </span>
    </Tooltip>
  );
}

/**
 * Project card. Grid: an edge-to-edge 16:10 picture (the screenshot of the template the project
 * started from; a tooltip and an sr-only note say so, so it is never presented as the user's app), the
 * name, a real description, status pills from DB rows, and a footer with framework, visibility
 * and "Edited 2h ago" (absolute time on hover). Hover or focus lifts it 2px, slowly pans the
 * picture and slides up a quick-action bar (always visible on touch).
 * List: one row of the projects table (role=row; the browser renders the header).
 * Both carry data-testid="project-card".
 */
export function ProjectCard({ project, layout = "grid", showWorkspace, priority }: { project: ProjectCardItem; layout?: "grid" | "list"; showWorkspace?: boolean; priority?: boolean }) {
  const href = `/projects/${project.id}`;
  const canEdit = project.role === "owner" || project.role === "admin" || project.role === "editor";
  const canDelete = project.role === "owner" || project.role === "admin";
  const category = project.category ?? FRAMEWORK_CATEGORY[project.framework] ?? "web-apps";
  const touch = lastTouch(project);
  const when = touch.iso;
  const status = project.status ?? null;

  if (layout === "list") {
    return (
      <article
        role="row"
        data-testid="project-card"
        data-project-row
        className="group/row relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-3 py-2.5 transition-colors last:border-b-0 hover:bg-surface focus-within:bg-surface md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)_40px] md:px-4"
        style={{ viewTransitionName: `proj-${project.id}` }}
      >
        <div role="cell" className="flex min-w-0 items-center gap-3">
          <ProjectThumb templateId={project.templateId} framework={project.framework} size="md" />
          <div className="min-w-0">
            <h3 className="truncate text-[13.5px] font-semibold">
              <Link
                href={href}
                data-row-link
                className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-[6px] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
              >
                {project.name}
              </Link>
            </h3>
            <p className="truncate text-[11.5px] text-muted-foreground">
              {project.description || (showWorkspace ? project.workspaceName : frameworkLabel(project.framework))}
              {showWorkspace && project.description ? ` · ${project.workspaceName}` : ""}
            </p>
            <StatusPills status={status} compact className="mt-1.5 md:hidden" />
          </div>
        </div>
        <div role="cell" className="hidden min-w-0 md:block">
          {status ? <StatusPills status={status} compact /> : <span className="text-[11.5px] text-foreground-dim">Idle</span>}
        </div>
        <div role="cell" className="hidden truncate text-xs text-muted-foreground md:block">
          {frameworkLabel(project.framework)}
        </div>
        <div role="cell" className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
          <VisibilityIcon v={project.visibility} className="size-3.5" /> {VISIBILITY_LABELS[project.visibility]}
        </div>
        <div role="cell" className="hidden text-meta text-muted-foreground md:block">
          <time dateTime={when} title={absoluteTime(when)} suppressHydrationWarning>
            {relativeTime(when)}
          </time>
        </div>
        <div role="cell" className="relative z-[2] flex justify-end">
          <ProjectMenu project={project} canEdit={canEdit} canDelete={canDelete} />
        </div>
      </article>
    );
  }

  return (
    <article
      data-testid="project-card"
      className="proj-card card-premium shot-pan group/card relative flex h-full flex-col overflow-hidden"
      style={{ viewTransitionName: `proj-${project.id}` }}
    >
      {/* Browser chrome: three dots, the address pill (the real live host, or "Not published"), and a Live / Draft chip. */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-surface px-3" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-border-strong" />
          <span className="size-2 rounded-full bg-border-strong" />
          <span className="size-2 rounded-full bg-border-strong" />
        </span>
        <span className="flex h-5 min-w-0 flex-1 items-center rounded-md bg-card px-2 font-mono text-[10.5px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">
          <span className="truncate">{status?.live ? status.live.host : "Not published"}</span>
        </span>
        {status?.live ? (
          <span className="inline-flex h-5 items-center gap-1 rounded-full bg-success/10 px-2 text-[10.5px] font-semibold text-success shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--success)_30%,transparent)]">
            <span className="size-1.5 rounded-full bg-success" /> Live
          </span>
        ) : (
          <span className="inline-flex h-5 items-center rounded-full bg-foreground/[0.05] px-2 text-[10.5px] font-semibold text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">Draft</span>
        )}
      </div>
      <span className="sr-only">{status?.live ? `Live at ${status.live.host}` : "Draft, not published"}</span>
      {/* The picture is the starting template's screenshot, never the user's app: said in the tooltip and to
          assistive tech, not as a visible label on every card. */}
      <div className="relative aspect-[16/10] overflow-hidden border-b border-border bg-surface-2" title={needsTemplateCaption(project.templateId) ? "Starter image: a screenshot of the template this project began from" : undefined}>
        <TemplatePreview
          id={project.templateId ?? ""}
          category={category}
          priority={priority}
          sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
          className="h-full rounded-none border-0 shadow-none"
        />
        {needsTemplateCaption(project.templateId) ? <span className="sr-only">Starter image: a screenshot of the template this project began from.</span> : null}
        <div className="proj-card__actions absolute inset-x-2.5 bottom-2.5 z-[3] flex items-center justify-end gap-1.5">
          <Link href={href} className={buttonClasses("primary", "sm", "h-7 px-2.5 text-xs shadow-md")} tabIndex={-1} aria-hidden="true">
            Open editor
          </Link>
          {status?.live ? (
            <a href={status.live.url} target="_blank" rel="noopener noreferrer" className={buttonClasses("outline", "sm", "h-7 gap-1 bg-card/90 px-2.5 text-xs backdrop-blur-md")}>
              Visit <ArrowUpRight className="size-3.5" aria-hidden="true" />
              <span className="sr-only"> {project.name} live site (opens in a new tab)</span>
            </a>
          ) : null}
          <ProjectMenu project={project} canEdit={canEdit} canDelete={canDelete} floating />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em]">
          <Link
            href={href}
            className="outline-none after:absolute after:inset-0 after:z-[1] after:rounded-2xl after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
          >
            {project.name}
          </Link>
        </h3>
        {project.description ? <p className="mt-1 line-clamp-1 text-[13px] text-muted-foreground">{project.description}</p> : null}
        {status?.preview || status?.deploy ? <StatusPills status={{ ...status, live: null }} className="mt-2.5" /> : null}
        <div className="mt-auto flex items-center gap-2.5 pt-3 text-meta text-muted-foreground">
          <span className="shrink-0">{frameworkLabel(project.framework)}</span>
          <span aria-hidden="true" className="text-border-strong">
            ·
          </span>
          <Visibility v={project.visibility} />
          {showWorkspace ? <span className="truncate text-foreground-dim">{project.workspaceName}</span> : null}
          <time dateTime={when} title={absoluteTime(when)} className="relative z-[2] ml-auto min-w-0 truncate" suppressHydrationWarning>
            {touch.label}
          </time>
        </div>
      </div>
    </article>
  );
}

function ProjectMenu({ project, canEdit, canDelete, floating }: { project: ProjectListItem; canEdit: boolean; canDelete: boolean; floating?: boolean }) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(project.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duplicate = async () => {
    setBusy(true);
    try {
      const res = await projectsApi.duplicate(project.id);
      toast.success("Project duplicated", `Opening ${res.project.name}`);
      router.push(`/projects/${res.project.id}`);
    } catch (e) {
      toast.error("Could not duplicate", e instanceof Error ? e.message : undefined);
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(new URL(`/projects/${project.id}`, window.location.origin).toString());
      toast.success("Link copied", project.name);
    } catch {
      toast.error("Could not copy the link", "Your browser blocked clipboard access.");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${project.name}`}
            className={cn(
              "relative z-[2] flex size-7 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring data-[state=open]:text-foreground",
              floating ? "bg-card/90 shadow-[inset_0_0_0_1px_var(--border-strong),var(--shadow-sm)] backdrop-blur-md hover:bg-card" : "hover:bg-muted data-[state=open]:bg-muted",
            )}
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => router.push(`/projects/${project.id}`)}>
            <ExternalLink className="size-4" /> Open
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void copyLink()}>
            <Copy className="size-4" /> Copy link
          </DropdownMenuItem>
          {canEdit ? (
            <>
              <DropdownMenuItem onSelect={() => setRenaming(true)}>
                <Pencil className="size-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void duplicate()} disabled={busy}>
                <Copy className="size-4" /> Duplicate
              </DropdownMenuItem>
            </>
          ) : null}
          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-danger data-[highlighted]:text-danger [&_svg]:text-danger" onSelect={() => setDeleting(true)}>
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renaming} onOpenChange={(o) => !busy && setRenaming(o)}>
        <DialogContent title="Rename project">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const n = name.trim();
              if (!n) return;
              setBusy(true);
              setError(null);
              try {
                await projectsApi.patch(project.id, { name: n });
                setRenaming(false);
                toast.success("Project renamed", n);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not rename");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Project name" htmlFor={`rename-${project.id}`} error={error}>
              <Input id={`rename-${project.id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required autoFocus onFocus={(e) => e.currentTarget.select()} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" appearance="app" onClick={() => setRenaming(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" appearance="app" loading={busy}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete "${project.name}"?`}
        description="The project is removed from your workspace lists and the editor. This is a soft delete: its files and snapshots are retained in the database but are no longer accessible from the app."
        confirmLabel="Delete project"
        destructive
        onConfirm={async () => {
          await projectsApi.remove(project.id);
          toast.success("Project deleted", project.name);
          router.refresh();
        }}
      />
    </>
  );
}
