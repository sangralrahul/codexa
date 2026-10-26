"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Globe, Lock, Link2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { projectsApi } from "@/lib/client/workspace/api";
import type { ProjectListItem } from "@/lib/client/workspace/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { TemplateThumb } from "@/components/templates/template-thumb";
import { frameworkLabel, relativeTime } from "./format";

const VisibilityIcon = ({ v }: { v: ProjectListItem["visibility"] }) =>
  v === "public" ? <Globe className="size-3.5" aria-hidden="true" /> : v === "unlisted" ? <Link2 className="size-3.5" aria-hidden="true" /> : <Lock className="size-3.5" aria-hidden="true" />;

/** Thumbnail layout when the project has no known template: by runtime framework. */
const FRAMEWORK_CATEGORY: Record<string, string> = { "node-express": "apis", static: "websites", "vite-react": "web-apps", nextjs: "web-apps" };

/** A stable tint per project so cards built from the same template are still easy to tell apart. */
const TONES = [
  { wash: "bg-signal/[0.08]", chip: "bg-signal text-background" },
  { wash: "bg-success/[0.08]", chip: "bg-success text-background" },
  { wash: "bg-warning/[0.09]", chip: "bg-warning text-background" },
  { wash: "bg-primary/[0.06]", chip: "bg-foreground text-background" },
  { wash: "bg-danger/[0.07]", chip: "bg-danger text-background" },
];
function toneFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

function Monogram({ name, className }: { name: string; className?: string }) {
  const letters = name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "P";
  return (
    <span aria-hidden="true" className={cn("flex size-9 items-center justify-center rounded-lg text-[13px] font-semibold shadow-sm ring-2 ring-card", className)}>
      {letters}
    </span>
  );
}

export function ProjectCard({ project, layout = "grid", showWorkspace }: { project: ProjectListItem; layout?: "grid" | "list"; showWorkspace?: boolean }) {
  const href = `/projects/${project.id}`;
  const canEdit = project.role === "owner" || project.role === "admin" || project.role === "editor";
  const canDelete = project.role === "owner" || project.role === "admin";
  const category = project.category ?? FRAMEWORK_CATEGORY[project.framework] ?? "web-apps";
  const opened = relativeTime(project.lastOpenedAt ?? project.updatedAt);
  const tone = toneFor(project.id);

  if (layout === "list") {
    return (
      <article className="group relative flex items-center gap-4 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-border-strong hover:bg-muted/30" data-testid="project-card">
        <Monogram name={project.name} className={tone.chip} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium">
            <Link href={href} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
              {project.name}
            </Link>
          </h3>
          <p className="truncate text-xs text-muted-foreground">{project.description || frameworkLabel(project.framework)}</p>
        </div>
        <span className="hidden w-32 shrink-0 text-xs text-muted-foreground md:block">{frameworkLabel(project.framework)}</span>
        <span className="hidden w-24 shrink-0 items-center gap-1.5 text-xs capitalize text-muted-foreground sm:inline-flex">
          <VisibilityIcon v={project.visibility} /> {project.visibility}
        </span>
        <span className="hidden w-28 shrink-0 text-right text-xs text-muted-foreground sm:block">{opened}</span>
        <ProjectMenu project={project} canEdit={canEdit} canDelete={canDelete} />
      </article>
    );
  }

  return (
    <article className="glow-card group relative flex flex-col rounded-xl border border-border" data-testid="project-card">
      <div className={cn("relative overflow-hidden rounded-t-xl border-b border-border p-3 pb-0", tone.wash)}>
        <TemplateThumb category={category} className="translate-y-1 rounded-b-none border-b-0 shadow-sm transition-transform duration-500 ease-out group-hover:-translate-y-0.5" />
        <div className="absolute right-2 top-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <ProjectMenu project={project} canEdit={canEdit} canDelete={canDelete} floating />
        </div>
      </div>
      <div className="relative flex flex-1 flex-col p-4 pt-7">
        <Monogram name={project.name} className={cn("absolute -top-[18px] left-4", tone.chip)} />
        <h3 className="truncate text-sm font-semibold tracking-tight">
          <Link href={href} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
            {project.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{project.description || `${frameworkLabel(project.framework)} project`}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            {frameworkLabel(project.framework)}
          </Badge>
          <span className="inline-flex items-center gap-1 capitalize">
            <VisibilityIcon v={project.visibility} /> {project.visibility}
          </span>
          {showWorkspace ? <span className="truncate">in {project.workspaceName}</span> : null}
          <span className="ml-auto">{opened}</span>
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
    setError(null);
    try {
      const res = await projectsApi.duplicate(project.id);
      router.push(`/projects/${res.project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not duplicate");
      setBusy(false);
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
              "relative z-10 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground",
              floating ? "border border-border bg-background/90 shadow-sm backdrop-blur hover:bg-background" : "hover:bg-muted",
            )}
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => router.push(`/projects/${project.id}`)}>
            <ExternalLink className="size-4" /> Open
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
              <DropdownMenuItem className="text-danger" onSelect={() => setDeleting(true)}>
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? (
        <p role="alert" className="absolute left-4 right-4 top-full z-10 mt-1 rounded-md bg-danger/10 px-2 py-1 text-xs text-danger">
          {error}
        </p>
      ) : null}

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
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not rename");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Project name" htmlFor={`rename-${project.id}`} error={error}>
              <Input id={`rename-${project.id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required autoFocus />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
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
          router.refresh();
        }}
      />
    </>
  );
}
