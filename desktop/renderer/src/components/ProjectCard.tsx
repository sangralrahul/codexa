import { useState } from "react";
import { Copy, ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { ApiError, projectsApi, type Project } from "../lib/api";
import { frameworkLabel, relativeTime } from "../lib/util";
import { Button, Dialog, Field, Input, Menu, MenuItem, MenuSeparator, toast } from "../ui";
import { useApp } from "../app/state";
import { ProjectThumb } from "./ProjectThumb";

export function ProjectCard({ project: p, live }: { project: Project; live?: string | null }) {
  const { go } = useApp();
  return (
    <article className="group lift card-edge relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card hover:border-border-strong">
      <button type="button" onClick={() => go({ name: "project", id: p.id })} className="text-left" aria-label={`Open ${p.name}`}>
        {/* Browser-frame thumbnail */}
        <div className="border-b border-border bg-surface">
          <div className="flex h-6 items-center gap-1 px-2.5">
            <span className="size-1.5 rounded-full bg-border-strong" />
            <span className="size-1.5 rounded-full bg-border-strong" />
            <span className="size-1.5 rounded-full bg-border-strong" />
            <span className="ml-2 h-3 flex-1 rounded-sm bg-card/70" />
          </div>
          <div className="aspect-[16/9] overflow-hidden">
            <ProjectThumb templateId={p.templateId} name={p.name} big className="h-full w-full transition-transform duration-500 group-hover:scale-[1.02]" />
          </div>
        </div>
        <div className="px-4 pb-4 pt-3">
          <div className="flex items-center gap-2 pr-8">
            <h3 className="min-w-0 flex-1 truncate text-[14.5px] font-semibold tracking-[-0.01em]">{p.name}</h3>
            {live ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-success/10 px-1.5 py-0.5 text-[11px] font-semibold text-success">
                <span className="size-1.5 rounded-full bg-success" /> Live
              </span>
            ) : live === null ? (
              <span className="shrink-0 rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-medium text-dim">Draft</span>
            ) : null}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
            <span className="truncate">{p.description || frameworkLabel(p.framework)}</span>
          </p>
          <p className="mt-1.5 text-[11.5px] text-dim">
            {frameworkLabel(p.framework)} · Edited {relativeTime(p.updatedAt)}
          </p>
        </div>
      </button>
      <div className="absolute bottom-3 right-3">
        <ProjectMenu project={p} />
      </div>
    </article>
  );
}

export function ProjectMenu({ project: p }: { project: Project }) {
  const { go, refreshProjects } = useApp();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(p.name);
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<void>, failTitle: string) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(failTitle, err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Menu
        width={190}
        trigger={(open, toggle) => (
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${p.name}`} aria-expanded={open} onClick={toggle}>
            <MoreHorizontal />
          </Button>
        )}
      >
        {(close) => (
          <>
            <MenuItem icon={<ExternalLink />} onSelect={() => (close(), go({ name: "project", id: p.id }))}>
              Open
            </MenuItem>
            <MenuItem icon={<Pencil />} onSelect={() => (close(), setName(p.name), setRenaming(true))}>
              Rename
            </MenuItem>
            <MenuItem
              icon={<Copy />}
              onSelect={() => {
                close();
                void act(async () => {
                  const r = await projectsApi.duplicate(p.id);
                  await refreshProjects();
                  toast.success("Project duplicated", r.project.name);
                }, "Couldn't duplicate");
              }}
            >
              Duplicate
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Trash2 />} danger onSelect={() => (close(), setDeleting(true))}>
              Delete
            </MenuItem>
          </>
        )}
      </Menu>

      <Dialog open={renaming} onClose={() => setRenaming(false)} title="Rename project">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (!n) return;
            void act(async () => {
              await projectsApi.rename(p.id, n);
              await refreshProjects();
              setRenaming(false);
              toast.success("Project renamed", n);
            }, "Couldn't rename");
          }}
          className="space-y-5"
        >
          <Field label="Project name" htmlFor={`rename-${p.id}`}>
            <Input id={`rename-${p.id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              Save
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={deleting} onClose={() => setDeleting(false)} title={`Delete “${p.name}”?`} description="It's removed from your workspace and can't be opened again from the app.">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={() =>
              void act(async () => {
                await projectsApi.remove(p.id);
                await refreshProjects();
                setDeleting(false);
                toast.success("Project deleted", p.name);
              }, "Couldn't delete")
            }
          >
            Delete project
          </Button>
        </div>
      </Dialog>
    </>
  );
}
