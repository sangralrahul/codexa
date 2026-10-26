"use client";

import { useCallback, useRef, useState } from "react";
import { AlertTriangle, Code2, Replace, Search, WandSparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeEditor, type CodeEditorHandle } from "@/components/editor/code-editor";
import { canFormat, languageForPath, languageLabel } from "@/components/editor/language";
import type { EditorState } from "@/lib/client/workspace/use-editor-state";
import { basename } from "@/lib/client/workspace/paths";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/misc";
import { ConfirmDialog } from "./confirm-dialog";
import { FileIcon } from "./file-icon";
import { toolButton } from "./panel-tabs";

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
      <div className="flex h-9 shrink-0 items-stretch border-b border-border bg-surface" role="tablist" aria-label="Open files">
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
                  "group relative flex max-w-[220px] shrink-0 cursor-default items-center gap-1.5 border-r border-border pl-3 pr-1.5 text-[12.5px] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  isActive ? "bg-background text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {isActive ? <span className="absolute inset-x-0 top-0 h-0.5 bg-signal" aria-hidden="true" /> : null}
                {isActive ? <span className="absolute inset-x-0 -bottom-px h-px bg-background" aria-hidden="true" /> : null}
                <FileIcon name={basename(path)} className="size-3.5" />
                <span className={cn("truncate", isDirty && "italic")}>{basename(path)}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    requestClose(path);
                  }}
                  aria-label={`Close ${basename(path)}${isDirty ? " (unsaved changes)" : ""}`}
                  className={cn("ml-1 flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground", !isActive && !isDirty && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100")}
                >
                  {isDirty ? <span className="size-2 rounded-full bg-warning group-hover:hidden" aria-hidden="true" /> : null}
                  <X className={cn("size-3.5", isDirty && "hidden group-hover:block")} />
                </button>
              </div>
            );
          })}
        </div>
        {active ? (
          <div className="flex shrink-0 items-center gap-0.5 border-l border-border px-1">
            <Tooltip content="Find (Ctrl/Cmd+F)">
              <button type="button" aria-label="Find in file" onClick={() => runAction("actions.find")} className={cn(toolButton, "size-7")}>
                <Search className="size-4" />
              </button>
            </Tooltip>
            {canEdit ? (
              <>
                <Tooltip content="Find and replace (Ctrl/Cmd+H)">
                  <button type="button" aria-label="Find and replace" onClick={() => runAction("editor.action.startFindReplaceAction")} className={cn(toolButton, "size-7")}>
                    <Replace className="size-4" />
                  </button>
                </Tooltip>
                <Tooltip content={canFormat(language) ? "Format document (Shift+Alt+F)" : "Formatting is not available for this file type"}>
                  <button
                    type="button"
                    aria-label="Format document"
                    disabled={!canFormat(language)}
                    onClick={() => runAction("editor.action.formatDocument")}
                    className={cn(toolButton, "size-7")}
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
            revision={doc?.rev ?? 0}
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
        <div className="flex h-6 shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-3 font-mono text-[11px] text-muted-foreground">
          <span className="truncate">{active.split("/").join(" › ")}</span>
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

/** Shortcuts wired in workspace.tsx (Ctrl/Cmd P, Ctrl/Cmd Shift F, Ctrl/Cmd S) and Monaco (find, replace). */
const SHORTCUTS: { label: string; keys: string[] }[] = [
  { label: "Quick open a file", keys: ["Ctrl/⌘", "P"] },
  { label: "Search in all files", keys: ["Ctrl/⌘", "Shift", "F"] },
  { label: "Save all files", keys: ["Ctrl/⌘", "S"] },
  { label: "Find in the open file", keys: ["Ctrl/⌘", "F"] },
];

function EmptyEditor({ onQuickOpen }: { onQuickOpen: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <div className="pop-in flex w-full max-w-sm flex-col items-center">
        <span className="flex size-12 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground shadow-sm">
          <Code2 className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-4 text-sm font-semibold">No file open</p>
        <p className="mt-1 text-xs text-muted-foreground">Pick a file in the explorer, or ask the AI in the Chat tab to build something.</p>
        <Button size="sm" variant="outline" onClick={onQuickOpen} className="mt-4 h-8 rounded-md">
          <Search className="size-3.5" aria-hidden="true" /> Quick open
        </Button>
        <dl className="mt-8 w-full divide-y divide-border rounded-lg border border-border text-left text-xs">
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-3 px-3 py-2">
              <dt className="text-muted-foreground">{s.label}</dt>
              <dd className="flex shrink-0 items-center gap-1">
                {s.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
