"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronRight, Home, Replace, Search, WandSparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { on } from "@/lib/client/events";
import { useAgent } from "@/lib/client/workspace/agent";
import { isCalm } from "@/lib/client/motion";
import { CodeEditor, type CodeEditorHandle } from "@/components/editor/code-editor";
import { canFormat, languageForPath } from "@/components/editor/language";
import type { EditorState } from "@/lib/client/workspace/use-editor-state";
import { basename } from "@/lib/client/workspace/paths";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { ConfirmDialog } from "./confirm-dialog";
import { FileIcon } from "./file-icon";
import { toolButton } from "./panel-tabs";

// ":" is rejected in file names (validateName), so this id can never collide with a path, and unlike
// a NUL sentinel it survives CSS.escape() in the roving-focus lookups.
const OVERVIEW = ":overview";

/**
 * Tabs (a "Project overview" start tab plus open files) and the Monaco editor. Tabs grow in
 * when opened and collapse when closed; Left/Right/Home/End move between them, Delete closes.
 * Files the AI touched carry an ember dot; its added/modified lines get gutter marks until the
 * file has been looked at once. After a restore the open file gets the diff sweep (M9).
 */
export function EditorArea({
  mountEditor = true,
  state,
  canEdit,
  onQuickOpen,
  onSearchAll,
  onCursor,
  onHandle,
  overview,
}: {
  /** False until code is first on screen: Monaco is only downloaded when it is needed. */
  mountEditor?: boolean;
  state: EditorState;
  canEdit: boolean;
  onQuickOpen: () => void;
  onSearchAll: () => void;
  onCursor?: (pos: { line: number; column: number } | null) => void;
  onHandle?: (h: CodeEditorHandle | null) => void;
  /** The Project overview start tab. */
  overview: React.ReactNode;
}) {
  const { tabs, active, setActive, docs, closeTab, updateDraft, saveFile, reveal, resolveConflict, reloadDoc, dirtyPaths } = state;
  const agent = useAgent();
  const { gutter, markViewed, touched, setActiveFile } = agent;
  const handle = useRef<CodeEditorHandle | null>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<Set<string>>(() => new Set());
  const [showOverview, setShowOverview] = useState(false);
  const [wipe, setWipe] = useState(0);
  const [known, setKnown] = useState<Set<string> | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const viewing = showOverview || !active ? OVERVIEW : active;
  const doc = active ? docs[active] : undefined;
  const language = active ? languageForPath(active) : "plaintext";

  // Tabs that existed when the editor hydrated do not animate in; tabs opened later grow in.
  if (known === null && state.hydrated) setKnown(new Set(tabs));

  // Opening a file (from anywhere) leaves the overview.
  const [lastActive, setLastActive] = useState(active);
  if (lastActive !== active) {
    setLastActive(active);
    if (active) setShowOverview(false);
  }

  // Share the open file (composer @-chip, presence) and clear gutter marks after a file was viewed.
  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    const file = viewing === OVERVIEW ? null : viewing;
    setActiveFile(file);
    const prev = viewedRef.current;
    if (prev && prev !== file) markViewed(prev);
    viewedRef.current = file;
  }, [viewing, setActiveFile, markViewed]);

  useEffect(() => {
    if (viewing === OVERVIEW) onCursor?.(null);
  }, [viewing, onCursor]);

  // Diff sweep over the open file after a restore/revert touched it.
  useEffect(
    () =>
      on("codexa:restored", (d) => {
        if (isCalm()) return;
        if (active && (d.paths.includes(active) || !d.paths.length)) setWipe((n) => n + 1);
      }),
    [active],
  );
  useEffect(() => {
    if (!wipe) return;
    const t = setTimeout(() => setWipe(0), 700);
    return () => clearTimeout(t);
  }, [wipe]);

  const finishClose = useCallback(
    (path: string) => {
      if (isCalm()) {
        closeTab(path);
        return;
      }
      setLeaving((s) => new Set(s).add(path));
      setTimeout(() => {
        closeTab(path);
        setLeaving((s) => {
          const n = new Set(s);
          n.delete(path);
          return n;
        });
      }, 170);
    },
    [closeTab],
  );

  const requestClose = (path: string) => {
    if (dirtyPaths.includes(path)) setClosing(path);
    else finishClose(path);
  };

  const runAction = useCallback((id: string) => {
    const ed = handle.current?.editor;
    if (!ed) return;
    ed.focus();
    void ed.getAction(id)?.run();
  }, []);

  const order = [OVERVIEW, ...tabs];
  const focusTab = (id: string) => requestAnimationFrame(() => stripRef.current?.querySelector<HTMLElement>(`[role="tab"][data-tab="${CSS.escape(id)}"]`)?.focus());
  const select = (id: string) => {
    if (id === OVERVIEW) setShowOverview(true);
    else {
      setShowOverview(false);
      setActive(id);
    }
  };
  const onTabKey = (e: React.KeyboardEvent, id: string) => {
    const i = order.indexOf(id);
    let next: string | undefined;
    if (e.key === "ArrowRight") next = order[(i + 1) % order.length];
    else if (e.key === "ArrowLeft") next = order[(i - 1 + order.length) % order.length];
    else if (e.key === "Home") next = order[0];
    else if (e.key === "End") next = order[order.length - 1];
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(id);
      return;
    } else if ((e.key === "Delete" || e.key === "Backspace") && id !== OVERVIEW) {
      e.preventDefault();
      const after = order[i + 1] ?? order[i - 1];
      requestClose(id);
      if (after) focusTab(after);
      return;
    }
    if (!next) return;
    e.preventDefault();
    select(next);
    focusTab(next);
  };

  const marks = active ? (gutter[active] ?? null) : null;

  return (
    <div className="@container flex h-full min-h-0 flex-col" data-testid="editor-area">
      <div className="flex h-10 shrink-0 items-stretch border-b border-border">
        <div ref={stripRef} className="flex min-w-0 flex-1 [scrollbar-width:none] items-end gap-0.5 overflow-x-auto px-1.5 pt-1.5" role="tablist" aria-label="Open files">
          <div
            role="tab"
            data-tab={OVERVIEW}
            aria-selected={viewing === OVERVIEW}
            tabIndex={viewing === OVERVIEW ? 0 : -1}
            onClick={() => select(OVERVIEW)}
            onKeyDown={(e) => onTabKey(e, OVERVIEW)}
            title="Project overview"
            aria-label="Project overview"
            className={cn(
              "relative flex h-[33px] shrink-0 cursor-default items-center gap-1.5 rounded-t-lg px-2.5 text-[12.5px] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
              viewing === OVERVIEW ? "bg-background text-foreground shadow-[inset_0_1px_0_var(--border),inset_1px_0_0_var(--border),inset_-1px_0_0_var(--border)]" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Home className="size-3.5" aria-hidden="true" />
          </div>
          {tabs.map((path) => {
            const isActive = path === viewing;
            const isDirty = dirtyPaths.includes(path);
            const isNew = known !== null && !known.has(path);
            const ai = Boolean(touched[path]);
            return (
              <div
                key={path}
                role="tab"
                data-tab={path}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => select(path)}
                onKeyDown={(e) => onTabKey(e, path)}
                onAuxClick={(e) => e.button === 1 && requestClose(path)}
                title={path}
                aria-label={`${basename(path)}${isDirty ? ", unsaved changes" : ""}${ai ? ", changed by the AI" : ""}`}
                aria-keyshortcuts="Delete"
                className={cn(
                  "ws-tab group relative flex h-[33px] shrink-0 cursor-default items-center gap-1.5 overflow-hidden rounded-t-lg pl-2.5 pr-1 text-[12.5px] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  isActive ? "bg-background text-foreground shadow-[inset_0_1px_0_var(--border),inset_1px_0_0_var(--border),inset_-1px_0_0_var(--border)]" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  isNew && "ws-tab-in",
                  leaving.has(path) && "ws-tab-out",
                )}
              >
                {isActive ? <span className="absolute inset-x-2 top-0 h-[2px] rounded-b-full bg-signal" aria-hidden="true" /> : null}
                <FileIcon name={basename(path)} className="size-3.5" />
                <span className={cn("truncate", isDirty && "italic")}>{basename(path)}</span>
                {ai ? <span className="ws-ai-dot" title="Changed by the AI" aria-hidden="true" /> : null}
                {/* The pointer's close target. It is not a nested control: keyboard and screen-reader users
                    close the focused tab with Delete (announced through aria-keyshortcuts on the tab). */}
                <span
                  aria-hidden="true"
                  title={`Close ${basename(path)} (Delete)`}
                  onClick={(e) => {
                    e.stopPropagation();
                    requestClose(path);
                  }}
                  className={cn("ml-0.5 flex size-5 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground", !isActive && !isDirty && "opacity-0 group-hover:opacity-100")}
                >
                  {isDirty ? <span className="size-2 rounded-full bg-warning group-hover:hidden" /> : null}
                  <X className={cn("size-3.5", isDirty && "hidden group-hover:block")} />
                </span>
              </div>
            );
          })}
        </div>
        {viewing !== OVERVIEW ? (
          // Narrow editors give the room to the tabs (Monaco's own Ctrl/⌘ F, H and Shift+Alt+F still work).
          <div className="hidden shrink-0 items-center gap-0.5 px-1.5 @[340px]:flex">
            <Tooltip content="Find (Ctrl/⌘ F)">
              <button type="button" aria-label="Find in file" onClick={() => runAction("actions.find")} className={cn(toolButton, "size-7")}>
                <Search className="size-4" aria-hidden="true" />
              </button>
            </Tooltip>
            {canEdit ? (
              <>
                <Tooltip content="Find and replace (Ctrl/⌘ H)">
                  <button type="button" aria-label="Find and replace" onClick={() => runAction("editor.action.startFindReplaceAction")} className={cn(toolButton, "size-7")}>
                    <Replace className="size-4" aria-hidden="true" />
                  </button>
                </Tooltip>
                <Tooltip content={canFormat(language) ? "Format document (Shift+Alt+F)" : "Formatting is not available for this file type"}>
                  <button type="button" aria-label="Format document" disabled={!canFormat(language)} onClick={() => runAction("editor.action.formatDocument")} className={cn(toolButton, "size-7")}>
                    <WandSparkles className="size-4" aria-hidden="true" />
                  </button>
                </Tooltip>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {viewing !== OVERVIEW && active ? (
        <nav aria-label="File path" className="flex h-7 shrink-0 items-center gap-1 overflow-hidden px-3 font-mono text-[11.5px] text-muted-foreground">
          {active.split("/").map((seg, i, arr) => (
            <span key={i} className="flex min-w-0 items-center gap-1">
              {i ? <ChevronRight className="size-3 shrink-0 opacity-60" aria-hidden="true" /> : null}
              {i === arr.length - 1 ? <FileIcon name={seg} className="size-3.5" /> : null}
              <span className={cn("truncate", i === arr.length - 1 && "text-foreground/85")}>{seg}</span>
            </span>
          ))}
          {marks && (marks.added.length || marks.modified.length) ? (
            <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2 py-px font-sans text-[11px]">
              <span className="ws-ai-dot" aria-hidden="true" />
              AI changed {marks.added.length + marks.modified.length} line{marks.added.length + marks.modified.length === 1 ? "" : "s"}
            </span>
          ) : null}
          {!canEdit ? <span className={cn("shrink-0 rounded-full border border-border px-2 py-px font-sans text-[11px]", !(marks && (marks.added.length || marks.modified.length)) && "ml-auto")}>Read-only</span> : null}
        </nav>
      ) : null}

      {viewing !== OVERVIEW && active && doc?.conflict ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 border-y border-warning/40 bg-warning/10 px-3 py-2 text-xs">
          <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
          <span className="flex-1">{doc.conflict.remote === "" ? "This file was deleted elsewhere while you had unsaved edits." : "This file changed elsewhere (AI, GitHub or another tab) while you had unsaved edits."}</span>
          <Button size="sm" variant="outline" appearance="app" onClick={() => resolveConflict(active, "remote")}>
            {doc.conflict.remote === "" ? "Discard my edits" : "Load their version"}
          </Button>
          <Button size="sm" appearance="app" onClick={() => resolveConflict(active, "mine")}>
            Keep mine
          </Button>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        {viewing === OVERVIEW ? (
          overview
        ) : doc?.error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm">
            <p className="text-danger">{doc.error}</p>
            <Button size="sm" variant="outline" appearance="app" onClick={() => active && reloadDoc(active)}>
              Retry
            </Button>
          </div>
        ) : active && !mountEditor ? (
          <div className="h-full" aria-hidden="true" />
        ) : active ? (
          <CodeEditor
            key="editor"
            path={active}
            language={language}
            value={doc?.draft ?? ""}
            revision={doc?.rev ?? 0}
            readOnly={!canEdit || !doc || doc.loading}
            onChange={(v) => updateDraft(active, v)}
            onMount={(h) => {
              handle.current = h;
              onHandle?.(h);
            }}
            onSave={() => void saveFile(active)}
            onQuickOpen={onQuickOpen}
            onSearchAll={onSearchAll}
            revealLine={reveal && reveal.path === active ? reveal.line : null}
            marks={marks}
            onCursor={onCursor}
          />
        ) : null}
        {wipe ? <div key={wipe} className="ws-wipe diff-sweep" aria-hidden="true" /> : null}
      </div>

      <ConfirmDialog
        open={Boolean(closing)}
        onOpenChange={(o) => !o && setClosing(null)}
        title={`Close ${closing ? basename(closing) : ""} without saving?`}
        description="Your unsaved changes will be lost. Press Ctrl/⌘ S to save first."
        confirmLabel="Close without saving"
        destructive
        onConfirm={() => {
          if (closing) closeTab(closing);
        }}
      />
    </div>
  );
}
