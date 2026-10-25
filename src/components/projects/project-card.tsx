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
import { frameworkLabel, relativeTime } from "./format";

const VisibilityIcon = ({ v }: { v: ProjectListItem["visibility"] }) =>
  v === "public" ? <Globe className="size-3.5" aria-hidden="true" /> : v === "unlisted" ? <Link2 className="size-3.5" aria-hidden="true" /> : <Lock className="size-3.5" aria-hidden="true" />;

export function ProjectCard({ project, layout = "grid", showWorkspace }: { project: ProjectListItem; layout?: "grid" | "list"; showWorkspace?: boolean }) {
  const href = `/projects/${project.id}`;
  const canEdit = project.role === "owner" || project.role === "admin" || project.role === "editor";
  const canDelete = project.role === "owner" || project.role === "admin";
  const list = layout === "list";
  return (
    <article
      className={cn(
        "group relative rounded-xl border border-border bg-card transition-colors hover:border-border-strong",
        list ? "flex items-center gap-3 px-4 py-3" : "flex flex-col p-4",
      )}
      data-testid="project-card"
    >
      <div className={cn("min-w-0", list ? "flex-1" : "")}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-sm font-semibold">
            <Link href={href} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
              {project.name}
            </Link>
          </h3>
          <ProjectMenu project={project} canEdit={canEdit} canDelete={canDelete} />
        </div>
        {!list && project.description ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{project.description}</p> : null}
        <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground", list ? "mt-0.5" : "mt-3")}>
          <Badge variant="outline" className="text-[10px]">
            {frameworkLabel(project.framework)}
          </Badge>
          <span className="inline-flex items-center gap-1 capitalize">
            <VisibilityIcon v={project.visibility} /> {project.visibility}
          </span>
          {showWorkspace ? <span className="truncate">in {project.workspaceName}</span> : null}
          <span>Opened {relativeTime(project.lastOpenedAt ?? project.updatedAt)}</span>
        </div>
      </div>
    </article>
  );
}

function ProjectMenu({ project, canEdit, canDelete }: { project: ProjectListItem; canEdit: boolean; canDelete: boolean }) {
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
            className="relative z-10 -mr-1 -mt-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
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
