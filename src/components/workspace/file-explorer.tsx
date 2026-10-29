"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronRight, FilePlus2, Folder, FolderOpen, FolderPlus, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildTree, dirname, joinPath, validateName, type TreeNode } from "@/lib/client/workspace/paths";
import type { EditorState } from "@/lib/client/workspace/use-editor-state";
import type { AgentFileChange } from "@/lib/client/workspace/agent";
import type { ChangeSummary } from "@/lib/client/workspace/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { Alert } from "@/components/ui/misc";
import { ConfirmDialog } from "./confirm-dialog";
import { FileIcon } from "./file-icon";
import { toolButton } from "./panel-tabs";

type Pending = { kind: "file" | "folder"; dir: string } | { kind: "rename"; path: string; isFolder: boolean } | null;
type Row = { node: TreeNode; depth: number; parent: string | null };

const CHANGE_LETTER: Record<ChangeSummary["action"], { letter: string; tone: string; label: string }> = {
  create: { letter: "A", tone: "text-success", label: "Added since the last checkpoint" },
  update: { letter: "M", tone: "text-warning", label: "Modified since the last checkpoint" },
  delete: { letter: "D", tone: "text-danger", label: "Deleted since the last checkpoint" },
};

/**
 * The project tree, built to the WAI-ARIA tree pattern: one tab stop (roving tabindex),
 * Up/Down, Right to expand or enter, Left to collapse or go to the parent, Home/End,
 * Enter/Space to open, type-ahead, F2 rename, Delete, Shift+F10 for the row menu.
 * Rows the AI just touched flash; A/M letters come from GET /changes.
 */
export function FileExplorer({
  state,
  canEdit,
  changes,
  touched,
  header,
}: {
  state: EditorState;
  canEdit: boolean;
  changes?: ChangeSummary[] | null;
  touched?: Record<string, AgentFileChange>;
  /** Rendered at the left of the toolbar (the Files/Search switch). */
  header?: React.ReactNode;
}) {
  const { files, extraFolders, tabs, active, dirtyPaths, openFile, createFile, createFolder, renamePath, deletePath, refreshFiles, filesError } = state;
  const tree = useMemo(() => buildTree(files, extraFolders), [files, extraFolders]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [pending, setPending] = useState<Pending>(null);
  const [toDelete, setToDelete] = useState<{ path: string; isFolder: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [focusPath, setFocusPath] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [flash, setFlash] = useState<Record<string, number>>({});
  const treeRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ text: "", at: 0 });
  const seenTouch = useRef(0);
  const dirty = useMemo(() => new Set(dirtyPaths), [dirtyPaths]);
  const open = useMemo(() => new Set(tabs), [tabs]);
  const changeMap = useMemo(() => new Map((changes ?? []).map((c) => [c.path, c.action])), [changes]);
  const changedDirs = useMemo(() => {
    const s = new Set<string>();
    for (const c of changes ?? []) {
      let d = dirname(c.path);
      while (d) {
        s.add(d);
        d = dirname(d);
      }
    }
    return s;
  }, [changes]);

  // Flash rows the agent just wrote (once per real file_change).
  useEffect(() => {
    if (!touched) return;
    const fresh = Object.values(touched).filter((t) => t.at > seenTouch.current);
    if (!fresh.length) return;
    seenTouch.current = Math.max(...fresh.map((t) => t.at));
    // Folders on the way open so the flash is visible.
    setCollapsed((s) => {
      let changed = false;
      const n = new Set(s);
      for (const t of fresh) {
        let d = dirname(t.path);
        while (d) {
          if (n.delete(d)) changed = true;
          d = dirname(d);
        }
      }
      return changed ? n : s;
    });
    setFlash((f) => ({ ...f, ...Object.fromEntries(fresh.map((t) => [t.path, t.at])) }));
    const upTo = seenTouch.current;
    const t = setTimeout(() => setFlash((f) => Object.fromEntries(Object.entries(f).filter(([, at]) => at > upTo))), 1800);
    return () => clearTimeout(t);
  }, [touched]);

  // Visible rows in order (collapsed folders hide their children).
  const rows = useMemo(() => {
    const out: Row[] = [];
    const walk = (nodes: TreeNode[], depth: number, parent: string | null) => {
      for (const n of nodes) {
        out.push({ node: n, depth, parent });
        if (n.type === "folder" && !collapsed.has(n.path)) walk(n.children, depth + 1, n.path);
      }
    };
    walk(tree, 0, null);
    return out;
  }, [tree, collapsed]);

  const tabStop = focusPath && rows.some((r) => r.node.path === focusPath) ? focusPath : active && rows.some((r) => r.node.path === active) ? active : (rows[0]?.node.path ?? null);

  const focusRow = useCallback((path: string | null) => {
    if (!path) return;
    setFocusPath(path);
    requestAnimationFrame(() => treeRef.current?.querySelector<HTMLElement>(`[role="treeitem"][data-path="${CSS.escape(path)}"]`)?.focus());
  }, []);

  const toggle = useCallback(
    (path: string, force?: boolean) =>
      setCollapsed((s) => {
        const n = new Set(s);
        const shouldCollapse = force === undefined ? !n.has(path) : !force;
        if (shouldCollapse) n.add(path);
        else n.delete(path);
        return n;
      }),
    [],
  );

  const startCreate = (kind: "file" | "folder", dir: string) => {
    setError(null);
    if (dir) toggle(dir, true);
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
        focusRow(path);
      } else if (pending.kind === "folder") {
        createFolder(joinPath(pending.dir, v));
      } else if (pending.kind === "rename") {
        const to = joinPath(dirname(pending.path), v);
        if (to !== pending.path) await renamePath(pending.path, to, pending.isFolder);
        focusRow(to);
      }
      setPending(null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.getAttribute("role") !== "treeitem") return;
    const path = target.dataset.path ?? "";
    const i = rows.findIndex((r) => r.node.path === path);
    const row = rows[i];
    if (!row) return;
    const isFolder = row.node.type === "folder";
    const expanded = isFolder && !collapsed.has(path);
    const go = (j: number) => {
      const r = rows[Math.max(0, Math.min(rows.length - 1, j))];
      if (r) focusRow(r.node.path);
    };
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        go(i + 1);
        return;
      case "ArrowUp":
        e.preventDefault();
        go(i - 1);
        return;
      case "Home":
        e.preventDefault();
        go(0);
        return;
      case "End":
        e.preventDefault();
        go(rows.length - 1);
        return;
      case "ArrowRight":
        e.preventDefault();
        if (isFolder && !expanded) toggle(path, true);
        else if (isFolder && expanded && rows[i + 1]?.parent === path) go(i + 1);
        return;
      case "ArrowLeft":
        e.preventDefault();
        if (isFolder && expanded) toggle(path, false);
        else if (row.parent) focusRow(row.parent);
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        if (isFolder) toggle(path);
        else openFile(path);
        return;
      case "F2":
        if (canEdit) {
          e.preventDefault();
          setPending({ kind: "rename", path, isFolder });
        }
        return;
      case "Delete":
        if (canEdit) {
          e.preventDefault();
          setToDelete({ path, isFolder });
        }
        return;
      case "ContextMenu":
        if (canEdit) {
          e.preventDefault();
          setMenuFor(path);
        }
        return;
      case "F10":
        if (e.shiftKey && canEdit) {
          e.preventDefault();
          setMenuFor(path);
        }
        return;
    }
    // Type-ahead: jump to the next visible row whose name starts with what was typed.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = performance.now();
      const ta = typeahead.current;
      ta.text = now - ta.at > 600 ? e.key.toLowerCase() : ta.text + e.key.toLowerCase();
      ta.at = now;
      const order = [...rows.slice(i + (ta.text.length === 1 ? 1 : 0)), ...rows.slice(0, i + (ta.text.length === 1 ? 1 : 0))];
      const hit = order.find((r) => r.node.name.toLowerCase().startsWith(ta.text));
      if (hit) {
        e.preventDefault();
        focusRow(hit.node.path);
      }
    }
  };

  const ctx: NodeCtx = {
    collapsed,
    toggle,
    active,
    open,
    dirty,
    canEdit,
    pending,
    tabStop,
    changeMap,
    changedDirs,
    touched: touched ?? {},
    flash,
    menuFor,
    setMenuFor,
    onActivate: (node) => {
      setFocusPath(node.path);
      if (node.type === "folder") toggle(node.path);
      else openFile(node.path);
    },
    onCreate: startCreate,
    onRename: (path, isFolder) => {
      setError(null);
      setPending({ kind: "rename", path, isFolder });
    },
    onDelete: (path, isFolder) => setToDelete({ path, isFolder }),
    submitPending,
    cancelPending: () => setPending(null),
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Same 40px + hairline as the editor's tab strip, so the joined Code card has one top bar. The header slot
          clips (with room for focus rings) so it can never spill over the action buttons. */}
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border pl-2 pr-1.5">
        <div className="-my-1 min-w-0 flex-1 overflow-hidden py-1 pl-0.5 -ml-0.5">{header}</div>
        {canEdit ? (
          <DropdownMenu>
            <Tooltip content="New file or folder">
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="New file or folder" className={cn(toolButton, "size-7")}>
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => startCreate("file", "")}>
                <FilePlus2 /> New file
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => startCreate("folder", "")}>
                <FolderPlus /> New folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <IconButton
          label="Refresh"
          onClick={async () => {
            setRefreshing(true);
            await refreshFiles();
            setRefreshing(false);
          }}
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} aria-hidden="true" />
        </IconButton>
      </div>
      {filesError ? (
        <div className="px-2 py-2">
          <Alert variant="danger" title="Could not load files">
            {filesError}
          </Alert>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mx-2 mb-1 mt-2 rounded-lg bg-danger/10 px-2 py-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
      <div ref={treeRef} className="scrollbar-thin min-h-0 flex-1 overflow-auto pb-2 pt-1.5" role="tree" aria-label="Project files" onKeyDown={onKeyDown} data-testid="file-explorer">
        {pending && pending.kind !== "rename" && pending.dir === "" ? <NameInput depth={0} placeholder={pending.kind === "file" ? "filename.ts" : "folder-name"} onSubmit={submitPending} onCancel={() => setPending(null)} /> : null}
        {tree.length === 0 && !pending ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[13px] font-medium">No files yet</p>
            <p className="mt-1 text-xs text-muted-foreground">{canEdit ? "Create a file, or ask the agent to scaffold the project." : "This project has no files."}</p>
          </div>
        ) : null}
        {tree.map((node, i) => (
          <Node key={node.path} node={node} depth={0} index={i + 1} setSize={tree.length} ctx={ctx} />
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
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip content={label}>
      <button type="button" onClick={onClick} aria-label={label} className={cn(toolButton, "size-7")}>
        {children}
      </button>
    </Tooltip>
  );
}

function NameInput({ depth, placeholder, initial = "", onSubmit, onCancel }: { depth: number; placeholder: string; initial?: string; onSubmit: (v: string) => void; onCancel: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const dot = initial.lastIndexOf(".");
    ref.current?.setSelectionRange(0, dot > 0 ? dot : initial.length);
  }, [initial]);
  return (
    <div style={{ paddingLeft: depth * 12 + 24 }} className="py-0.5 pr-2">
      <input
        ref={ref}
        defaultValue={initial}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-7 w-full rounded-md border border-ring bg-input px-2 font-mono text-[12px] shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_18%,transparent)] focus:outline-none"
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") onSubmit(e.currentTarget.value);
          if (e.key === "Escape") onCancel();
        }}
        onBlur={(e) => (e.currentTarget.value.trim() ? onSubmit(e.currentTarget.value) : onCancel())}
      />
    </div>
  );
}

type NodeCtx = {
  collapsed: Set<string>;
  toggle: (p: string, force?: boolean) => void;
  active: string | null;
  open: Set<string>;
  dirty: Set<string>;
  canEdit: boolean;
  pending: Pending;
  tabStop: string | null;
  changeMap: Map<string, ChangeSummary["action"]>;
  changedDirs: Set<string>;
  touched: Record<string, AgentFileChange>;
  flash: Record<string, number>;
  menuFor: string | null;
  setMenuFor: (p: string | null) => void;
  onActivate: (node: TreeNode) => void;
  onCreate: (kind: "file" | "folder", dir: string) => void;
  onRename: (path: string, isFolder: boolean) => void;
  onDelete: (path: string, isFolder: boolean) => void;
  submitPending: (v: string) => void;
  cancelPending: () => void;
};

let measureCtx: CanvasRenderingContext2D | null | undefined;
function textWidth(text: string, font: string) {
  if (measureCtx === undefined) measureCtx = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * 7;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

/** Fit `name` into `width` px by dropping characters from the middle, keeping the extension plus a little of the stem. */
function middleEllipsis(name: string, width: number, font: string) {
  if (width <= 0 || textWidth(name, font) <= width) return name;
  const dot = name.lastIndexOf(".");
  const tailLen = Math.min(name.length - 1, dot > 0 ? name.length - dot + 3 : 4);
  const tail = name.slice(name.length - tailLen);
  let lo = 0;
  let hi = name.length - tailLen;
  // Largest head that still fits with the ellipsis and tail.
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (textWidth(name.slice(0, mid) + "…" + tail, font) <= width) lo = mid;
    else hi = mid - 1;
  }
  return name.slice(0, Math.max(lo, 1)) + "…" + tail;
}

/**
 * A file name that, when it does not fit, loses characters from the middle so the extension stays
 * visible ("useLocalSt…rage.ts"). It is measured with a cached canvas and rendered as one string, so
 * there is never a gap between the ellipsis and the tail. Before measuring (SSR) it falls back to CSS truncate.
 */
function MiddleTruncate({ id, name, className }: { id: string; name: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(name);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const cs = getComputedStyle(el);
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      setShown(middleEllipsis(name, el.clientWidth, font));
    };
    fit();
    // The canvas measures with whatever font is loaded now; measure again once the web font is in,
    // or the first pass (fallback font) clips the extension ("c…exa." for "codexa.ts").
    let alive = true;
    void document.fonts?.ready.then(() => alive && fit());
    if (typeof ResizeObserver === "undefined") return () => void (alive = false);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [name, className]);
  if (shown === name) {
    return (
      <span ref={ref} id={id} className={cn("min-w-0 flex-1 truncate", className)}>
        {name}
      </span>
    );
  }
  return (
    <span ref={ref} id={id} className={cn("min-w-0 flex-1 overflow-hidden whitespace-nowrap", className)}>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{name}</span>
    </span>
  );
}

function Node({ node, depth, index, setSize, ctx }: { node: TreeNode; depth: number; index: number; setSize: number; ctx: NodeCtx }) {
  const isFolder = node.type === "folder";
  const isCollapsed = isFolder && ctx.collapsed.has(node.path);
  const isRenaming = ctx.pending?.kind === "rename" && ctx.pending.path === node.path;
  const isActive = ctx.active === node.path;
  const change = !isFolder ? ctx.changeMap.get(node.path) : undefined;
  const aiTouched = !isFolder && ctx.touched[node.path];
  const flashAt = ctx.flash[node.path];
  const nameId = useId();

  if (isRenaming) return <NameInput depth={depth} placeholder="name" initial={node.name} onSubmit={ctx.submitPending} onCancel={ctx.cancelPending} />;

  return (
    <div
      role="treeitem"
      aria-level={depth + 1}
      aria-setsize={setSize}
      aria-posinset={index}
      aria-expanded={isFolder ? !isCollapsed : undefined}
      aria-selected={isActive}
      // A folder is named by its own label (never its whole subtree); a file's name carries the states
      // its dots and letters show, which are therefore hidden from assistive tech below.
      aria-labelledby={isFolder ? nameId : undefined}
      aria-label={
        isFolder
          ? undefined
          : [node.path, ctx.dirty.has(node.path) ? "unsaved changes" : null, aiTouched ? "changed by the AI" : null, change ? CHANGE_LETTER[change].label.toLowerCase() : null].filter(Boolean).join(", ")
      }
      tabIndex={ctx.tabStop === node.path ? 0 : -1}
      data-path={node.path}
      className="outline-none [&:focus-visible>div:first-child]:outline-2 [&:focus-visible>div:first-child]:-outline-offset-2 [&:focus-visible>div:first-child]:outline-ring"
    >
      <div
        onClick={() => ctx.onActivate(node)}
        onDoubleClick={() => ctx.canEdit && !isFolder && ctx.onRename(node.path, false)}
        title={node.path}
        className={cn(
          "group relative mx-1.5 flex h-7 cursor-pointer items-center gap-1.5 rounded-lg pr-1 text-[13px] transition-colors duration-150",
          isActive ? "bg-muted font-medium text-foreground shadow-[inset_0_0_0_1px_var(--border)]" : ctx.open.has(node.path) ? "text-foreground hover:bg-muted/70" : "text-foreground/80 hover:bg-muted/70 hover:text-foreground",
        )}
        style={{ paddingLeft: depth * 12 + 6 }}
      >
        {flashAt ? <span key={flashAt} className="ws-ai-flash pointer-events-none absolute inset-0 rounded-lg" aria-hidden="true" /> : null}
        {Array.from({ length: depth }, (_, i) => (
          <span key={i} aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-border" style={{ left: i * 12 + 13 }} />
        ))}
        {isFolder ? (
          <>
            <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-out calm:transition-none", !isCollapsed && "rotate-90")} aria-hidden="true" />
            {isCollapsed ? <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : <FolderOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" />
            <FileIcon name={node.name} />
          </>
        )}
        <MiddleTruncate id={nameId} name={node.name} className={cn(isActive && "font-medium", change === "create" && "text-success", change === "update" && "text-warning")} />
        <span className="ml-auto flex shrink-0 items-center gap-1.5 pl-1">
          {aiTouched ? <span className="ws-ai-dot" title="Changed by the AI in this session" aria-hidden="true" /> : null}
          {!isFolder && ctx.dirty.has(node.path) ? <span className="size-1.5 rounded-full bg-warning" title="Unsaved changes" aria-hidden="true" /> : null}
          {isFolder && isCollapsed && ctx.changedDirs.has(node.path) ? <span className="size-1.5 rounded-full bg-warning/70" aria-hidden="true" /> : null}
          {change ? (
            <span className={cn("w-3 text-center font-mono text-[10.5px] font-semibold", CHANGE_LETTER[change].tone)} title={CHANGE_LETTER[change].label} aria-hidden="true">
              {CHANGE_LETTER[change].letter}
            </span>
          ) : null}
          {ctx.canEdit ? (
            <DropdownMenu open={ctx.menuFor === node.path} onOpenChange={(o) => ctx.setMenuFor(o ? node.path : null)}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Actions for ${node.name}`}
                  className="absolute right-1 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-md bg-muted text-muted-foreground opacity-0 shadow-[-8px_0_8px_-2px_var(--muted)] transition-opacity hover:bg-background hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
                >
                  <MoreHorizontal className="size-3.5" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                {isFolder ? (
                  <>
                    <DropdownMenuItem onSelect={() => ctx.onCreate("file", node.path)}>
                      <FilePlus2 /> New file
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => ctx.onCreate("folder", node.path)}>
                      <FolderPlus /> New folder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                ) : null}
                <DropdownMenuItem onSelect={() => ctx.onRename(node.path, isFolder)}>
                  <Pencil /> Rename <DropdownMenuShortcut>F2</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => ctx.onDelete(node.path, isFolder)} className="text-danger">
                  <Trash2 /> Delete <DropdownMenuShortcut>Del</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </span>
      </div>
      {isFolder ? (
        <div role="group" className="ws-tree-group" data-collapsed={isCollapsed ? "" : undefined} inert={isCollapsed}>
          <div>
            {ctx.pending && ctx.pending.kind !== "rename" && ctx.pending.dir === node.path ? (
              <NameInput depth={depth + 1} placeholder={ctx.pending.kind === "file" ? "filename.ts" : "folder-name"} onSubmit={ctx.submitPending} onCancel={ctx.cancelPending} />
            ) : null}
            {node.children.map((child, i) => (
              <Node key={child.path} node={child} depth={depth + 1} index={i + 1} setSize={node.children.length} ctx={ctx} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
