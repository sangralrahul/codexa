"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, File, FilePlus2, FolderPlus, Folder, FolderOpen, MoreHorizontal, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildTree, joinPath, validateName, type TreeNode } from "@/lib/client/workspace/paths";
import type { EditorState } from "@/lib/client/workspace/use-editor-state";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { ConfirmDialog } from "./confirm-dialog";
import { Alert } from "@/components/ui/misc";

type Pending = { kind: "file" | "folder"; dir: string } | { kind: "rename"; path: string; isFolder: boolean } | null;

export function FileExplorer({ state, canEdit, projectId }: { state: EditorState; canEdit: boolean; projectId: string }) {
  const { files, extraFolders, tabs, active, dirtyPaths, openFile, createFile, createFolder, renamePath, deletePath, refreshFiles, filesError } = state;
  const tree = useMemo(() => buildTree(files, extraFolders), [files, extraFolders]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [pending, setPending] = useState<Pending>(null);
  const [toDelete, setToDelete] = useState<{ path: string; isFolder: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const dirty = useMemo(() => new Set(dirtyPaths), [dirtyPaths]);
  const open = useMemo(() => new Set(tabs), [tabs]);

  const toggle = (path: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(path)) n.delete(path);
      else n.add(path);
      return n;
    });

  const startCreate = (kind: "file" | "folder", dir: string) => {
    setError(null);
    setCollapsed((s) => {
      const n = new Set(s);
      n.delete(dir);
      return n;
    });
    setPending({ kind, dir });
  };

  const submitPending = async (value: string) => {
    if (!pending) return;
    const v = value.trim();
    const err = validateName(v);
    if (err) {
      setError(err);
      return;
    }
    try {
      if (pending.kind === "file") {
        const path = joinPath(pending.dir, v);
        if (files.some((f) => f.path === path)) throw new Error(`${path} already exists`);
        await createFile(path, "");
      } else if (pending.kind === "folder") {
        createFolder(joinPath(pending.dir, v));
      } else if (pending.kind === "rename") {
        const dir = pending.path.includes("/") ? pending.path.slice(0, pending.path.lastIndexOf("/")) : "";
        const to = joinPath(dir, v);
        if (to !== pending.path) await renamePath(pending.path, to, pending.isFolder);
      }
      setPending(null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="file-explorer">
      <div className="flex items-center justify-between gap-1 border-b border-border px-2 py-1.5">
        <span className="truncate px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Files</span>
        <div className="flex items-center">
          {canEdit ? (
            <>
              <IconButton label="New file" onClick={() => startCreate("file", "")}>
                <FilePlus2 className="size-4" />
              </IconButton>
              <IconButton label="New folder" onClick={() => startCreate("folder", "")}>
                <FolderPlus className="size-4" />
              </IconButton>
            </>
          ) : null}
          <IconButton
            label="Refresh"
            onClick={async () => {
              setRefreshing(true);
              await refreshFiles();
              setRefreshing(false);
            }}
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          </IconButton>
        </div>
      </div>
      {filesError ? (
        <div className="p-2">
          <Alert variant="danger" title="Could not load files">
            {filesError}
          </Alert>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mx-2 mt-2 rounded-md bg-danger/10 px-2 py-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto py-1 scrollbar-thin" role="tree" aria-label="Project files">
        {pending && pending.kind !== "rename" && pending.dir === "" ? (
          <NameInput depth={0} placeholder={pending.kind === "file" ? "filename.ts" : "folder-name"} onSubmit={submitPending} onCancel={() => setPending(null)} />
        ) : null}
        {tree.length === 0 && !pending ? <p className="px-3 py-6 text-center text-xs text-muted-foreground">No files yet.</p> : null}
        {tree.map((node) => (
          <Node
            key={node.path}
            node={node}
            depth={0}
            collapsed={collapsed}
            toggle={toggle}
            active={active}
            open={open}
            dirty={dirty}
            canEdit={canEdit}
            pending={pending}
            onOpen={(p) => openFile(p)}
            onCreate={startCreate}
            onRename={(path, isFolder) => {
              setError(null);
              setPending({ kind: "rename", path, isFolder });
            }}
            onDelete={(path, isFolder) => setToDelete({ path, isFolder })}
            submitPending={submitPending}
            cancelPending={() => setPending(null)}
          />
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={toDelete?.isFolder ? `Delete folder "${toDelete.path}"?` : `Delete "${toDelete?.path}"?`}
        description={toDelete?.isFolder ? "All files inside this folder will be deleted. You can restore them from a previous snapshot." : "You can restore it from a previous snapshot."}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (toDelete) await deletePath(toDelete.path, toDelete.isFolder);
        }}
      />
      <span className="sr-only" data-project={projectId} />
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip content={label}>
      <button type="button" onClick={onClick} aria-label={label} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
        {children}
      </button>
    </Tooltip>
  );
}

function NameInput({
  depth,
  placeholder,
  initial = "",
  onSubmit,
  onCancel,
}: {
  depth: number;
  placeholder: string;
  initial?: string;
  onSubmit: (v: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const dot = initial.lastIndexOf(".");
    ref.current?.setSelectionRange(0, dot > 0 ? dot : initial.length);
  }, [initial]);
  return (
    <div style={{ paddingLeft: depth * 12 + 8 }} className="py-0.5 pr-2">
      <input
        ref={ref}
        defaultValue={initial}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-7 w-full rounded border border-ring bg-input px-2 text-xs focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit(e.currentTarget.value);
          if (e.key === "Escape") onCancel();
        }}
        onBlur={(e) => (e.currentTarget.value.trim() ? onSubmit(e.currentTarget.value) : onCancel())}
      />
    </div>
  );
}

function Node({
  node,
  depth,
  collapsed,
  toggle,
  active,
  open,
  dirty,
  canEdit,
  pending,
  onOpen,
  onCreate,
  onRename,
  onDelete,
  submitPending,
  cancelPending,
}: {
  node: TreeNode;
  depth: number;
  collapsed: Set<string>;
  toggle: (p: string) => void;
  active: string | null;
  open: Set<string>;
  dirty: Set<string>;
  canEdit: boolean;
  pending: Pending;
  onOpen: (p: string) => void;
  onCreate: (kind: "file" | "folder", dir: string) => void;
  onRename: (path: string, isFolder: boolean) => void;
  onDelete: (path: string, isFolder: boolean) => void;
  submitPending: (v: string) => void;
  cancelPending: () => void;
}) {
  const isFolder = node.type === "folder";
  const isCollapsed = isFolder && collapsed.has(node.path);
  const isRenaming = pending?.kind === "rename" && pending.path === node.path;
  const isActive = active === node.path;

  if (isRenaming) {
    return <NameInput depth={depth} placeholder="name" initial={node.name} onSubmit={submitPending} onCancel={cancelPending} />;
  }

  return (
    <div role="treeitem" aria-expanded={isFolder ? !isCollapsed : undefined} aria-selected={isActive}>
      <div
        className={cn(
          "group flex items-center gap-1 pr-1 text-[13px] hover:bg-muted",
          isActive && "bg-primary/10 text-foreground",
          !isActive && open.has(node.path) && "text-foreground",
        )}
        style={{ paddingLeft: depth * 12 + 4 }}
      >
        <button
          type="button"
          onClick={() => (isFolder ? toggle(node.path) : onOpen(node.path))}
          onDoubleClick={() => canEdit && !isFolder && onRename(node.path, false)}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left focus-visible:outline-none"
          aria-label={isFolder ? `${isCollapsed ? "Expand" : "Collapse"} folder ${node.name}` : `Open ${node.path}`}
          aria-current={isActive ? "true" : undefined}
        >
          {isFolder ? (
            <>
              {isCollapsed ? <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />}
              {isCollapsed ? <Folder className="size-4 shrink-0 text-muted-foreground" /> : <FolderOpen className="size-4 shrink-0 text-muted-foreground" />}
            </>
          ) : (
            <>
              <span className="w-3.5 shrink-0" />
              <File className="size-4 shrink-0 text-muted-foreground" />
            </>
          )}
          <span className="truncate">{node.name}</span>
          {!isFolder && dirty.has(node.path) ? <span className="ml-auto size-1.5 shrink-0 rounded-full bg-warning" aria-label="Unsaved changes" /> : null}
        </button>
        {canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Actions for ${node.name}`}
                className="rounded p-0.5 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isFolder ? (
                <>
                  <DropdownMenuItem onSelect={() => onCreate("file", node.path)}>
                    <FilePlus2 className="size-4" /> New file
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onCreate("folder", node.path)}>
                    <FolderPlus className="size-4" /> New folder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem onSelect={() => onRename(node.path, isFolder)}>
                <Pencil className="size-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDelete(node.path, isFolder)} className="text-danger">
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      {isFolder && !isCollapsed ? (
        <div role="group">
          {pending && pending.kind !== "rename" && pending.dir === node.path ? (
            <NameInput depth={depth + 1} placeholder={pending.kind === "file" ? "filename.ts" : "folder-name"} onSubmit={submitPending} onCancel={cancelPending} />
          ) : null}
          {node.children.map((child) => (
            <Node
              key={child.path}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              toggle={toggle}
              active={active}
              open={open}
              dirty={dirty}
              canEdit={canEdit}
              pending={pending}
              onOpen={onOpen}
              onCreate={onCreate}
              onRename={onRename}
              onDelete={onDelete}
              submitPending={submitPending}
              cancelPending={cancelPending}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
