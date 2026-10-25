"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, Check, Database, FolderGit2, History, MoreHorizontal, Pencil, Play, Rocket, Settings, Share2, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaveStatus } from "@/lib/client/workspace/use-editor-state";
import type { CodexaEvents } from "@/lib/client/events";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { ChangedFiles } from "./changed-files";

export type WorkspaceTool = "history" | "share" | "settings" | "deploy" | "github" | "database" | "activity";
export type RuntimeStatus = CodexaEvents["codexa:runtime-status"]["status"] | "unknown";

const TOOLS: { id: WorkspaceTool; label: string; Icon: typeof History }[] = [
  { id: "history", label: "Version history", Icon: History },
  { id: "share", label: "Share", Icon: Share2 },
  { id: "settings", label: "Settings", Icon: Settings },
  { id: "deploy", label: "Deploy", Icon: Rocket },
  { id: "github", label: "GitHub", Icon: FolderGit2 },
  { id: "database", label: "Database", Icon: Database },
  { id: "activity", label: "Activity", Icon: Activity },
];

const STATUS_LABEL: Record<SaveStatus, string> = { saved: "Saved", saving: "Saving…", unsaved: "Unsaved", error: "Save failed" };

export function WorkspaceHeader({
  projectId,
  name,
  onRename,
  canEdit,
  saveStatus,
  runtime,
  onRun,
  onStop,
  openTool,
  changesVersion,
  onOpenFile,
}: {
  projectId: string;
  name: string;
  onRename: (name: string) => Promise<void>;
  canEdit: boolean;
  saveStatus: SaveStatus;
  runtime: { status: RuntimeStatus; previewUrl: string | null; error: string | null };
  onRun: () => void;
  onStop: () => void;
  openTool: (t: WorkspaceTool) => void;
  changesVersion: number;
  onOpenFile: (path: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [renameError, setRenameError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = async () => {
    const n = draft.trim();
    if (!n || n === name) {
      setEditing(false);
      setDraft(name);
      return;
    }
    try {
      await onRename(n);
      setEditing(false);
      setRenameError(null);
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : "Could not rename");
    }
  };

  const running = runtime.status === "running" || runtime.status === "starting";
  const runLabel = runtime.status === "starting" ? "Starting…" : runtime.status === "running" ? "Running" : runtime.status === "error" ? "Error" : runtime.status === "unavailable" ? "Runner offline" : "Stopped";

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 sm:px-3" data-testid="workspace-header">
      <Tooltip content="Back to projects">
        <Link href="/projects" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Back to projects">
          <ArrowLeft className="size-4" />
        </Link>
      </Tooltip>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {editing ? (
          <form
            className="flex min-w-0 items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              void commit();
            }}
          >
            <label htmlFor="project-name" className="sr-only">
              Project name
            </label>
            <input
              id="project-name"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => void commit()}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setEditing(false);
                  setDraft(name);
                }
              }}
              maxLength={100}
              className="h-8 w-40 rounded-md border border-ring bg-input px-2 text-sm sm:w-64"
              aria-invalid={Boolean(renameError)}
            />
            <button type="submit" className="rounded-md p-1 text-success" aria-label="Save name">
              <Check className="size-4" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!canEdit) return;
              setDraft(name);
              setEditing(true);
            }}
            disabled={!canEdit}
            className={cn("group flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-semibold", canEdit && "hover:bg-muted")}
            title={canEdit ? "Rename project" : name}
          >
            <span className="truncate">{name}</span>
            {canEdit ? <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" /> : null}
          </button>
        )}
        {renameError ? (
          <span role="alert" className="truncate text-xs text-danger">
            {renameError}
          </span>
        ) : null}
        <span
          role="status"
          aria-live="polite"
          className={cn(
            "hidden shrink-0 items-center gap-1.5 text-xs sm:inline-flex",
            saveStatus === "error" ? "text-danger" : saveStatus === "saved" ? "text-muted-foreground" : "text-warning",
          )}
          data-testid="save-status"
        >
          <span className={cn("size-1.5 rounded-full", saveStatus === "saved" ? "bg-success" : saveStatus === "error" ? "bg-danger" : "bg-warning")} aria-hidden="true" />
          {canEdit ? STATUS_LABEL[saveStatus] : "Read-only"}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <ChangedFiles projectId={projectId} version={changesVersion} onOpenFile={onOpenFile} onOpenHistory={() => openTool("history")} />
        <Tooltip content={runtime.error ?? `Preview: ${runLabel}`}>
          {running ? (
            <Button size="sm" variant="outline" onClick={onStop} aria-label="Stop preview">
              <Square className="size-3.5" /> <span className="hidden sm:inline">Stop</span>
              <span className={cn("size-1.5 rounded-full", runtime.status === "running" ? "bg-success" : "bg-warning animate-pulse")} aria-hidden="true" />
            </Button>
          ) : (
            <Button size="sm" onClick={onRun} disabled={!canEdit} aria-label="Run preview">
              <Play className="size-3.5" /> <span className="hidden sm:inline">Run</span>
            </Button>
          )}
        </Tooltip>
        <div className="hidden items-center gap-0.5 lg:flex" role="toolbar" aria-label="Project tools">
          {TOOLS.map(({ id, label, Icon }) => (
            <Tooltip key={id} content={label}>
              <button type="button" onClick={() => openTool(id)} aria-label={label} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <Icon className="size-4" />
              </button>
            </Tooltip>
          ))}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="More tools" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden">
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled className="text-xs">
              {canEdit ? STATUS_LABEL[saveStatus] : "Read-only"} · Preview {runLabel.toLowerCase()}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {TOOLS.map(({ id, label, Icon }) => (
              <DropdownMenuItem key={id} onSelect={() => openTool(id)}>
                <Icon className="size-4" /> {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
