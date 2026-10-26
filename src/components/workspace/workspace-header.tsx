"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Activity, Check, ChevronRight, Database, FolderGit2, History, MoreHorizontal, Pencil, Play, Rocket, Settings, Share2, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaveStatus } from "@/lib/client/workspace/use-editor-state";
import type { CodexaEvents } from "@/lib/client/events";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { LogoMark } from "@/components/logo";
import { UserMenu } from "@/components/app/user-menu";
import { ChangedFiles } from "./changed-files";
import { Presence } from "./presence";
import { toolButton } from "./panel-tabs";

export type WorkspaceTool = "history" | "share" | "settings" | "deploy" | "github" | "database" | "activity";
export type RuntimeStatus = CodexaEvents["codexa:runtime-status"]["status"] | "unknown";

/** Every tool, in menu order (the mobile "More" menu lists them all). */
const TOOLS: { id: WorkspaceTool; label: string; Icon: typeof History }[] = [
  { id: "history", label: "Version history", Icon: History },
  { id: "share", label: "Share", Icon: Share2 },
  { id: "settings", label: "Settings", Icon: Settings },
  { id: "deploy", label: "Deploy", Icon: Rocket },
  { id: "github", label: "GitHub", Icon: FolderGit2 },
  { id: "database", label: "Database", Icon: Database },
  { id: "activity", label: "Activity", Icon: Activity },
];
/** Icon toolbar on large screens; Share and Deploy get real buttons next to it. */
const ICON_TOOLS = TOOLS.filter((t) => t.id !== "share" && t.id !== "deploy");

const STATUS_LABEL: Record<SaveStatus, string> = { saved: "Saved", saving: "Saving…", unsaved: "Unsaved", error: "Save failed" };

export function WorkspaceHeader({
  projectId,
  name,
  workspaceName,
  user,
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
  workspaceName?: string;
  user?: { name: string; email: string; avatarUrl: string | null };
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
  const runLabel = runtime.status === "starting" ? "Starting…" : runtime.status === "running" ? "Running" : runtime.status === "error" ? "Error" : runtime.status === "unavailable" ? "Preview unavailable" : "Stopped";

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 sm:px-3" data-testid="workspace-header">
      <Tooltip content="Back to dashboard">
        <Link href="/dashboard" aria-label="Back to dashboard" className="flex size-8 shrink-0 items-center justify-center rounded-md transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-ring">
          <LogoMark size={24} />
        </Link>
      </Tooltip>

      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1 text-[13px]">
        <Link href="/projects" className="hidden max-w-[12rem] truncate rounded-md px-1.5 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:block">
          {workspaceName ?? "Projects"}
        </Link>
        <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground/60 md:block" aria-hidden="true" />
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
              className="h-7 w-40 rounded-md border border-ring bg-input px-2 text-[13px] font-medium sm:w-64"
              aria-invalid={Boolean(renameError)}
            />
            <button type="submit" className="rounded-md p-1 text-success hover:bg-muted" aria-label="Save name">
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
            className={cn("group flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 font-semibold text-foreground", canEdit && "hover:bg-muted")}
            title={canEdit ? "Rename project" : name}
            aria-current="page"
          >
            <span className="truncate">{name}</span>
            {canEdit ? <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" /> : null}
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
            "hidden shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium sm:inline-flex",
            saveStatus === "error" ? "border-danger/40 text-danger" : saveStatus === "saved" || !canEdit ? "border-border text-muted-foreground" : "border-warning/40 text-warning",
          )}
          data-testid="save-status"
        >
          <span className={cn("size-1.5 rounded-full", !canEdit ? "bg-muted-foreground/60" : saveStatus === "saved" ? "bg-success" : saveStatus === "error" ? "bg-danger" : "animate-pulse bg-warning")} aria-hidden="true" />
          {canEdit ? STATUS_LABEL[saveStatus] : "Read-only"}
        </span>
      </nav>

      <div className="flex shrink-0 items-center gap-1.5">
        <div className="hidden md:block">
          <Presence projectId={projectId} compact />
        </div>
        <ChangedFiles projectId={projectId} version={changesVersion} onOpenFile={onOpenFile} onOpenHistory={() => openTool("history")} />

        {running ? (
          <div className="flex h-8 items-center gap-1 rounded-md border border-border bg-background pl-2.5 pr-0.5" aria-live="polite">
            {runtime.status === "starting" ? <Spinner className="size-3.5 text-muted-foreground" /> : <span className="relative flex size-2" aria-hidden="true"><span className="absolute inset-0 animate-ping rounded-full bg-success/60" /><span className="relative size-2 rounded-full bg-success" /></span>}
            <span className="hidden text-xs font-medium sm:inline">{runtime.status === "starting" ? "Starting…" : "Running"}</span>
            <Tooltip content="Stop the preview">
              <button type="button" onClick={onStop} aria-label="Stop preview" className={cn(toolButton, "ml-0.5 size-7")}>
                <Square className="size-3.5 fill-current" />
              </button>
            </Tooltip>
          </div>
        ) : (
          <Tooltip content={runtime.error ?? (runtime.status === "unavailable" ? "Previews aren't available right now" : "Save and start the preview (sandboxed)")}>
            <span className="inline-flex">
              <Button size="sm" variant="outline" onClick={onRun} disabled={!canEdit || runtime.status === "unavailable"} aria-label="Run preview" className="h-8 rounded-md px-3">
                <Play className="size-3.5 fill-current text-success" /> <span className="hidden sm:inline">Run</span>
              </Button>
            </span>
          </Tooltip>
        )}

        <div className="mx-0.5 hidden h-5 w-px bg-border lg:block" aria-hidden="true" />
        <div className="hidden items-center lg:flex" role="toolbar" aria-label="Project tools">
          {ICON_TOOLS.map(({ id, label, Icon }) => (
            <Tooltip key={id} content={label}>
              <button type="button" onClick={() => openTool(id)} aria-label={label} className={toolButton}>
                <Icon className="size-4" />
              </button>
            </Tooltip>
          ))}
        </div>
        <div className="mx-0.5 hidden h-5 w-px bg-border lg:block" aria-hidden="true" />

        <Button size="sm" variant="outline" onClick={() => openTool("share")} className="hidden h-8 rounded-md px-3 sm:inline-flex">
          <Share2 className="size-3.5" /> Share
        </Button>
        <Button size="sm" onClick={() => openTool("deploy")} className="hidden h-8 rounded-md px-3 sm:inline-flex">
          <Rocket className="size-3.5" /> Deploy
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="More tools" className={cn(toolButton, "lg:hidden")}>
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
        {user ? (
          <div className="ml-1">
            <UserMenu user={user} />
          </div>
        ) : null}
      </div>
    </header>
  );
}
