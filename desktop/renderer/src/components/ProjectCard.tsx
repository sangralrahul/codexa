import { useState } from "react";
import { Copy, ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { ApiError, projectsApi, type Project } from "../lib/api";
import { cn, frameworkLabel, relativeTime } from "../lib/util";
import { Avatar, Button, Dialog, Field, Input, Menu, MenuItem, MenuSeparator, toast } from "../ui";
import { useApp } from "../app/state";
import { ProjectThumb } from "./ProjectThumb";

export function ProjectCard({ project: p, live, checkpoints, members }: { project: Project; live?: string | null; checkpoints?: number; members?: { userId?: string; id?: string; name?: string | null; email?: string; user?: { name?: string | null; email?: string } }[] }) {
  const { go } = useApp();
  return (
    <article className="group lift relative flex flex-col overflow-hidden rounded-lg border border-border bg-bg hover:bg-card">
      <button type="button" onClick={() => go({ name: "project", id: p.id })} className="text-left" aria-label={`Open ${p.name}`}>
        {/* Browser-frame thumbnail */}
        <div className="border-b border-border bg-card">
          <div className="flex h-6 items-center gap-1 px-2.5">
            <span className="size-1.5 rounded-full border border-border-strong" />
            <span className="size-1.5 rounded-full border border-border-strong" />
            <span className="size-1.5 rounded-full border border-border-strong" />
            <span className="mono ml-2 truncate text-[10px] text-dim">{p.slug}</span>
          </div>
          <div className="aspect-[16/9] overflow-hidden">
            <ProjectThumb templateId={p.templateId} name={p.name} big className="h-full w-full transition-transform duration-500 group-hover:scale-[1.02]" />
          </div>
        </div>
        <div className="px-4 pb-4 pt-3">
          <div className="flex items-center gap-2 pr-8">
            <h3 className="min-w-0 flex-1 truncate text-[14px] font-medium tracking-[-0.01em]">{p.name}</h3>
            {live ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-fg">
                <span className="size-2 rounded-full bg-success" /> Live
              </span>
            ) : live === null ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-muted">
                <span className="size-2 rounded-full bg-dim" /> Draft
              </span>
            ) : null}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
            <span className="truncate">{p.description || frameworkLabel(p.framework)}</span>
          </p>
          <p className="mono mt-1.5 flex items-center gap-1.5 text-[11px] text-dim">
            <span className="truncate">
              {frameworkLabel(p.framework)} · Edited {relativeTime(p.updatedAt)}
              {checkpoints ? ` · ${checkpoints} checkpoint${checkpoints === 1 ? "" : "s"}` : ""}
            </span>
            {members && members.length > 0 ? (
              <span className="ml-auto flex shrink-0 items-center pr-7">
                {members.slice(0, 3).map((m, i) => (
                  <span key={m.userId ?? m.id ?? i} className={cn("rounded-full ring-2 ring-bg", i > 0 && "-ml-1")}>
                    <Avatar name={m.name || m.user?.name || m.email || m.user?.email || "?"} size={18} />
                  </span>
                ))}
              </span>
            ) : null}
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
