"use client";

import { useCallback, useRef, useState } from "react";
import { AlertTriangle, FileCode2, Replace, Search, WandSparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeEditor, type CodeEditorHandle } from "@/components/editor/code-editor";
import { canFormat, languageForPath, languageLabel } from "@/components/editor/language";
import type { EditorState } from "@/lib/client/workspace/use-editor-state";
import { basename } from "@/lib/client/workspace/paths";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/misc";
import { ConfirmDialog } from "./confirm-dialog";

export function EditorArea({
  state,
  canEdit,
  onQuickOpen,
  onSearchAll,
}: {
  state: EditorState;
  canEdit: boolean;
  onQuickOpen: () => void;
  onSearchAll: () => void;
}) {
  const { tabs, active, setActive, docs, closeTab, updateDraft, saveFile, reveal, resolveConflict, reloadDoc, dirtyPaths } = state;
  const handle = useRef<CodeEditorHandle | null>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const doc = active ? docs[active] : undefined;
  const language = active ? languageForPath(active) : "plaintext";

  const requestClose = (path: string) => {
    if (dirtyPaths.includes(path)) setClosing(path);
    else closeTab(path);
  };

  const runAction = useCallback((id: string) => {
    const ed = handle.current?.editor;
    if (!ed) return;
    ed.focus();
    void ed.getAction(id)?.run();
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background" data-testid="editor-area">
      <div className="flex items-stretch border-b border-border bg-surface" role="tablist" aria-label="Open files">
        <div className="flex min-w-0 flex-1 overflow-x-auto scrollbar-thin">
          {tabs.map((path) => {
            const isActive = path === active;
            const isDirty = dirtyPaths.includes(path);
            return (
              <div
                key={path}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActive(path)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setActive(path);
                  if (e.key === "Delete" || e.key === "Backspace") requestClose(path);
                }}
                onAuxClick={(e) => e.button === 1 && requestClose(path)}
                title={path}
                className={cn(
                  "group flex max-w-[220px] shrink-0 cursor-default items-center gap-1.5 border-r border-border px-3 py-2 text-[13px]",
                  isActive ? "bg-background text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <span className="truncate">{basename(path)}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    requestClose(path);
                  }}
                  aria-label={`Close ${basename(path)}${isDirty ? " (unsaved changes)" : ""}`}
                  className="ml-1 flex size-4 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {isDirty ? <span className="size-2 rounded-full bg-warning group-hover:hidden" aria-hidden="true" /> : null}
                  <X className={cn("size-3.5", isDirty && "hidden group-hover:block")} />
                </button>
              </div>
            );
          })}
        </div>
        {active ? (
          <div className="flex shrink-0 items-center gap-0.5 px-1">
            <Tooltip content="Find (Ctrl/Cmd+F)">
              <button type="button" aria-label="Find in file" onClick={() => runAction("actions.find")} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <Search className="size-4" />
              </button>
            </Tooltip>
            {canEdit ? (
              <>
                <Tooltip content="Find and replace (Ctrl/Cmd+H)">
                  <button type="button" aria-label="Find and replace" onClick={() => runAction("editor.action.startFindReplaceAction")} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <Replace className="size-4" />
                  </button>
                </Tooltip>
                <Tooltip content={canFormat(language) ? "Format document (Shift+Alt+F)" : "Formatting is not available for this file type"}>
                  <button
                    type="button"
                    aria-label="Format document"
                    disabled={!canFormat(language)}
                    onClick={() => runAction("editor.action.formatDocument")}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                  >
                    <WandSparkles className="size-4" />
                  </button>
                </Tooltip>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {active && doc?.conflict ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 border-b border-warning/40 bg-warning/10 px-3 py-2 text-xs">
          <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
          <span className="flex-1">
            {doc.conflict.remote === "" ? "This file was deleted elsewhere while you had unsaved edits." : "This file changed elsewhere (AI, GitHub or another tab) while you had unsaved edits."}
          </span>
          <Button size="sm" variant="outline" onClick={() => resolveConflict(active, "remote")}>
            {doc.conflict.remote === "" ? "Discard my edits" : "Load their version"}
          </Button>
          <Button size="sm" onClick={() => resolveConflict(active, "mine")}>
            Keep mine
          </Button>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        {!active ? (
          <EmptyEditor onQuickOpen={onQuickOpen} />
        ) : doc?.error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm">
            <p className="text-danger">{doc.error}</p>
            <Button size="sm" variant="outline" onClick={() => reloadDoc(active)}>
              Retry
            </Button>
          </div>
        ) : (
          <CodeEditor
            key="editor"
            path={active}
            language={language}
            value={doc?.draft ?? ""}
            readOnly={!canEdit || !doc || doc.loading}
            onChange={(v) => updateDraft(active, v)}
            onMount={(h) => {
              handle.current = h;
            }}
            onSave={() => void saveFile(active)}
            onQuickOpen={onQuickOpen}
            onSearchAll={onSearchAll}
            revealLine={reveal && reveal.path === active ? reveal.line : null}
          />
        )}
      </div>

      {active ? (
        <div className="flex h-6 shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-3 text-[11px] text-muted-foreground">
          <span className="truncate">{active}</span>
          <span className="flex shrink-0 items-center gap-3">
            {doc?.loading ? <span>Loading…</span> : null}
            {doc?.error ? <span className="text-danger">{doc.error}</span> : null}
            <span>{languageLabel(language)}</span>
            {!canEdit ? <span>Read-only</span> : null}
          </span>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(closing)}
        onOpenChange={(o) => !o && setClosing(null)}
        title={`Close ${closing ? basename(closing) : ""} without saving?`}
        description="Your unsaved changes will be lost. Press Ctrl/Cmd+S to save first."
        confirmLabel="Close without saving"
        destructive
        onConfirm={() => {
          if (closing) closeTab(closing);
        }}
      />
    </div>
  );
}

function EmptyEditor({ onQuickOpen }: { onQuickOpen: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <FileCode2 className="size-8 text-muted-foreground/60" aria-hidden="true" />
      <p className="text-sm font-medium">No file open</p>
      <p className="max-w-xs text-xs text-muted-foreground">Pick a file from the explorer or use quick open.</p>
      <Button size="sm" variant="outline" onClick={onQuickOpen}>
        Quick open <Kbd>Ctrl/⌘ P</Kbd>
      </Button>
    </div>
  );
}
