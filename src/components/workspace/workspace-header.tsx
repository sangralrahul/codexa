"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Check,
  ChevronDown,
  Code2,
  Columns2,
  Database,
  FolderGit2,
  History,
  LayoutGrid,
  Loader2,
  Monitor,
  Pencil,
  Play,
  RotateCw,
  Settings,
  Share2,
  Smartphone,
  Square,
  Tablet,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaveStatus } from "@/lib/client/workspace/use-editor-state";
import type { CodexaEvents } from "@/lib/client/events";
import { useRuntime, useNow, formatElapsed } from "@/lib/client/workspace/runtime";
import { useAgent } from "@/lib/client/workspace/agent";
import { useCalm } from "@/lib/client/motion";
import { Tooltip } from "@/components/ui/tooltip";
import { Segmented } from "@/components/ui/segmented";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { LiveDot } from "@/components/ui/misc";
import { LogoMark } from "@/components/logo";
import { UserMenu } from "@/components/app/user-menu";
import { TemplatePreview } from "@/components/templates/template-preview";
import { PresenceAvatars } from "./presence";
import { PublishPopover } from "./publish-popover";
import { stageLabel } from "@/components/ai/message-parts";
import type { Device } from "./preview-panel";

export type WorkspaceTool = "history" | "share" | "settings" | "deploy" | "github" | "database" | "activity";
export type RuntimeStatus = CodexaEvents["codexa:runtime-status"]["status"] | "unknown";
export type CanvasView = "preview" | "split" | "code";

const STATUS_LABEL: Record<SaveStatus, string> = { saved: "Saved", saving: "Saving…", unsaved: "Unsaved", error: "Save failed" };

const TOOLS: { id: WorkspaceTool; label: string; hint: string; Icon: typeof History }[] = [
  { id: "github", label: "GitHub", hint: "Push and pull a repository", Icon: FolderGit2 },
  { id: "database", label: "Database", hint: "Browse and query a connection", Icon: Database },
  { id: "settings", label: "Settings", hint: "Commands and environment", Icon: Settings },
  { id: "activity", label: "Activity", hint: "Who changed what", Icon: Activity },
];

export type RecentProject = { id: string; name: string; templateId: string | null; category: string | null };

/**
 * The 52px workspace header. Left: logo, project switcher, the save pill. Centre: the canvas
 * view and device toggles. Right: the agent status (real elapsed time), Run (a state machine
 * bound to the real runtime status), presence (only when connected), History, Share, Publish
 * and a labelled Tools menu.
 */
export function WorkspaceHeader({
  name,
  template,
  recent,
  user,
  onRename,
  canEdit,
  saveStatus,
  view,
  onViewChange,
  device,
  onDeviceChange,
  onRun,
  openTool,
  onManageDeployments,
  historyCount,
  onRevealAgent,
  isDesktop,
  publishOpen,
  onPublishOpenChange,
}: {
  name: string;
  template?: { id: string; name: string; category: string } | null;
  recent: RecentProject[];
  user?: { name: string; email: string; avatarUrl: string | null };
  onRename: (name: string) => Promise<void>;
  canEdit: boolean;
  saveStatus: SaveStatus;
  view: CanvasView;
  onViewChange: (v: CanvasView) => void;
  device: Device;
  onDeviceChange: (d: Device) => void;
  onRun: () => void;
  openTool: (t: WorkspaceTool) => void;
  onManageDeployments: () => void;
  historyCount: number | null;
  onRevealAgent: () => void;
  isDesktop: boolean;
  publishOpen?: boolean;
  onPublishOpenChange?: (o: boolean) => void;
}) {
  const agent = useAgent();
  const calm = useCalm();
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

  // The header mark is the agent's heartbeat: running → comet ring, then a success settle or an error notch.
  const run = agent.run;
  const logoState = agent.running ? (calm ? "idle" : "running") : run?.finishedAt && run.status === "succeeded" ? "success" : run?.finishedAt && run.status === "failed" ? "error" : "idle";

  return (
    <header className="relative z-20 grid h-[52px] shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2.5 sm:px-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(max-content,1fr)]" data-testid="workspace-header">
      <div className="flex min-w-0 items-center gap-2">
      <Tooltip content="Back to dashboard">
        <Link href="/dashboard" aria-label="Back to dashboard" className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-ring">
          <LogoMark size={26} state={logoState} key={`${logoState}-${run?.key ?? ""}`} />
        </Link>
      </Tooltip>

      {/* Project switcher + save pill */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
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
              className="h-8 w-40 rounded-lg border border-ring bg-input px-2.5 text-[14px] font-semibold shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_18%,transparent)] outline-none sm:w-64"
              aria-invalid={Boolean(renameError)}
            />
            <button type="submit" className="rounded-md p-1.5 text-success hover:bg-muted" aria-label="Save name">
              <Check className="size-4" aria-hidden="true" />
            </button>
          </form>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="group flex min-w-0 items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring data-[state=open]:bg-muted" aria-label={`${name}: project menu`}>
                {template ? (
                  <span className="relative h-5 w-8 shrink-0 overflow-hidden rounded-[5px] shadow-[0_0_0_1px_var(--border-strong)]" aria-hidden="true">
                    <TemplatePreview id={template.id} category={template.category} sizes="32px" className="size-full rounded-none border-0 shadow-none" imgClassName="size-full aspect-auto" />
                  </span>
                ) : (
                  <span className="flex h-5 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted text-muted-foreground shadow-[0_0_0_1px_var(--border)]" aria-hidden="true">
                    <LayoutGrid className="size-3" />
                  </span>
                )}
                <span className="truncate text-[14px] font-semibold tracking-tight">{name}</span>
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              {canEdit ? (
                <DropdownMenuItem
                  onSelect={() => {
                    setDraft(name);
                    setEditing(true);
                  }}
                >
                  <Pencil /> Rename project
                </DropdownMenuItem>
              ) : null}
              {recent.length ? (
                <>
                  {canEdit ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuLabel>Recent projects</DropdownMenuLabel>
                  {recent.map((p) => (
                    <DropdownMenuItem key={p.id} asChild>
                      <Link href={`/projects/${p.id}`}>
                        <span className="relative h-4 w-6 shrink-0 overflow-hidden rounded-[4px] shadow-[0_0_0_1px_var(--border)]" aria-hidden="true">
                          {p.templateId ? <TemplatePreview id={p.templateId} category={p.category ?? "web-apps"} sizes="24px" className="size-full rounded-none border-0 shadow-none" imgClassName="size-full aspect-auto" /> : null}
                        </span>
                        <span className="truncate">{p.name}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/projects">
                  <LayoutGrid /> All projects
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard">
                  <ArrowLeft /> Back to dashboard
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {renameError ? (
          <span role="alert" className="truncate text-xs text-danger">
            {renameError}
          </span>
        ) : null}
        <SavePill status={saveStatus} canEdit={canEdit} />
      </div>
      </div>

      {/* Canvas view + device (desktop) */}
      {isDesktop ? (
        <div className="hidden items-center justify-center gap-1.5 xl:flex">
          <ViewSwitch view={view} onViewChange={onViewChange} />
          {view !== "code" ? (
            <div className="hidden min-[1360px]:block">
              <DeviceSwitch device={device} onDeviceChange={onDeviceChange} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex shrink-0 items-center justify-end gap-1.5">
        {isDesktop ? (
          <div className="flex items-center gap-1.5 xl:hidden">
            <ViewSwitch view={view} onViewChange={onViewChange} compact />
          </div>
        ) : null}
        <AgentPill onReveal={onRevealAgent} />
        <RunButton canEdit={canEdit} onRun={onRun} />
        <div className="hidden md:block">
          <PresenceAvatars />
        </div>
        <Tooltip content="Version history">
          <button
            type="button"
            onClick={() => openTool("history")}
            className="hidden h-8 items-center gap-1.5 rounded-[10px] px-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring sm:inline-flex"
            aria-label={`Version history${historyCount ? `, ${historyCount} checkpoint${historyCount === 1 ? "" : "s"}` : ""}`}
          >
            <History className="size-4" aria-hidden="true" />
            {historyCount ? <span className="font-mono text-[11.5px] tabular-nums">{historyCount}</span> : null}
          </button>
        </Tooltip>
        <button
          type="button"
          onClick={() => openTool("share")}
          className="hidden h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-medium text-foreground/85 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring lg:inline-flex"
        >
          <Share2 className="size-3.5" aria-hidden="true" /> Share
        </button>
        <PublishPopover onManage={onManageDeployments} compact={!isDesktop} open={publishOpen} onOpenChange={onPublishOpenChange} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-[10px] px-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring data-[state=open]:bg-muted data-[state=open]:text-foreground"
              aria-label="Tools"
            >
              <Wrench className="size-4 lg:hidden" aria-hidden="true" />
              <span className="hidden lg:inline">Tools</span>
              <ChevronDown className="hidden size-3.5 lg:block" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Tools</DropdownMenuLabel>
            {TOOLS.map(({ id, label, hint, Icon }) => (
              <DropdownMenuItem key={id} onSelect={() => openTool(id)}>
                <Icon />
                <span className="flex min-w-0 flex-col">
                  <span>{label}</span>
                  <span className="truncate text-[11.5px] text-muted-foreground">{hint}</span>
                </span>
              </DropdownMenuItem>
            ))}
            <div className="lg:hidden">
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => openTool("history")}>
                <History /> Version history
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openTool("share")}>
                <Share2 /> Share
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onManageDeployments}>
                <Play /> Manage deployments
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        {user ? (
          <div className="ml-0.5">
            <UserMenu user={user} />
          </div>
        ) : null}
      </div>
    </header>
  );
}

/** "Saved" pill that morphs: spinner while saving → a check that pops → a quiet dot. */
function SavePill({ status, canEdit }: { status: SaveStatus; canEdit: boolean }) {
  const [justSaved, setJustSaved] = useState(false);
  const [prev, setPrev] = useState(status);
  if (prev !== status) {
    setPrev(status);
    if (status === "saved" && prev === "saving") setJustSaved(true);
  }
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 1400);
    return () => clearTimeout(t);
  }, [justSaved]);
  const label = canEdit ? STATUS_LABEL[status] : "Read-only";
  const icon = !canEdit ? (
    <span className="size-1.5 rounded-full bg-muted-foreground/60" />
  ) : status === "saving" ? (
    <Loader2 className="size-3 animate-spin" />
  ) : status === "saved" && justSaved ? (
    <Check className="size-3 text-success" strokeWidth={3} />
  ) : status === "saved" ? (
    <span className="size-1.5 rounded-full bg-success/80" />
  ) : status === "error" ? (
    <span className="size-1.5 rounded-full bg-danger" />
  ) : (
    <span className="size-1.5 rounded-full bg-warning" />
  );
  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="save-status"
      className={cn(
        "ws-save inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-1.5 text-[11.5px] font-medium sm:px-2",
        !canEdit ? "bg-muted text-muted-foreground" : status === "error" ? "bg-danger/10 text-danger" : status === "unsaved" ? "ws-warn-ink bg-warning/10" : "text-muted-foreground",
      )}
    >
      <span key={`${status}-${justSaved}`} className="ws-save__icon size-3 items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      {/* Phones keep the morphing icon; the word stays readable to screen readers. */}
      <span className="max-sm:sr-only">{label}</span>
    </span>
  );
}

function ViewSwitch({ view, onViewChange, compact }: { view: CanvasView; onViewChange: (v: CanvasView) => void; compact?: boolean }) {
  return (
    <Segmented<CanvasView>
      aria-label="Canvas view"
      size="sm"
      value={view}
      onValueChange={onViewChange}
      options={[
        { value: "preview", label: compact ? <span className="sr-only">Preview</span> : "Preview", icon: <Monitor />, title: "Preview only" },
        { value: "split", label: compact ? <span className="sr-only">Split</span> : "Split", icon: <Columns2 />, title: "Code and preview" },
        { value: "code", label: compact ? <span className="sr-only">Code</span> : "Code", icon: <Code2 />, title: "Code only" },
      ]}
    />
  );
}

function DeviceSwitch({ device, onDeviceChange }: { device: Device; onDeviceChange: (d: Device) => void }) {
  return (
    <Segmented<Device>
      aria-label="Preview device"
      size="sm"
      value={device}
      onValueChange={onDeviceChange}
      options={[
        { value: "desktop", label: <span className="sr-only">Desktop</span>, icon: <Monitor />, title: "Desktop (full width)" },
        { value: "tablet", label: <span className="sr-only">Tablet</span>, icon: <Tablet />, title: "Tablet (820px)" },
        { value: "mobile", label: <span className="sr-only">Mobile</span>, icon: <Smartphone />, title: "Mobile (390px)" },
      ]}
    />
  );
}

/** While the agent runs: its live stage and the real elapsed time ("Building · 0:42"). */
function AgentPill({ onReveal }: { onReveal: () => void }) {
  const agent = useAgent();
  const run = agent.run;
  const now = useNow(1000, agent.running);
  if (!agent.running || !run) return null;
  const label = run.mode === "ask" ? "Answering" : run.stage === "queued" || run.stage === "loading_context" ? "Starting" : run.stage === "working" ? "Building" : stageLabel(run.stage);
  return (
    <button
      type="button"
      onClick={onReveal}
      className="ws-pill-in hidden h-8 items-center gap-2 rounded-full border border-signal/30 bg-signal/[0.07] px-3 text-[12.5px] font-medium transition-colors hover:bg-signal/12 focus-visible:outline-2 focus-visible:outline-ring md:inline-flex"
      aria-label={`Agent: ${label}, ${formatElapsed(now - run.startedAt)} elapsed. Show the agent`}
    >
      <Loader2 className="size-3.5 animate-spin text-signal" aria-hidden="true" />
      <span className="text-shimmer">{label}</span>
      <span className="font-mono text-[11.5px] tabular-nums text-muted-foreground">{formatElapsed(now - run.startedAt)}</span>
    </button>
  );
}

/**
 * Run, bound to the real runtime status: Run → Starting… → Running (live dot; hover offers Stop)
 * → Retry on error. Idle keeps the accessible name "Run preview".
 */
function RunButton({ canEdit, onRun }: { canEdit: boolean; onRun: () => void }) {
  const rt = useRuntime();
  const { status, busy } = rt;
  const base =
    "ws-run inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] calm:active:scale-100 disabled:pointer-events-none disabled:opacity-50";

  if (status === "running" || status === "starting") {
    const starting = status === "starting";
    return (
      <button
        type="button"
        onClick={() => void rt.run("stop")}
        disabled={!canEdit || busy !== null}
        data-running=""
        aria-label={starting ? "Starting preview. Stop preview" : "Preview running. Stop preview"}
        className={cn(base, "bg-success/10 text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--success)_35%,transparent)] hover:bg-danger/10 hover:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--danger)_35%,transparent)]")}
      >
        <span data-when="idle" className="inline-flex items-center gap-1.5">
          {starting || busy === "stop" ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <LiveDot />}
          <span className="hidden sm:inline">{starting ? "Starting…" : "Running"}</span>
        </span>
        <span data-when="hover" className="items-center gap-1.5 text-danger">
          <Square className="size-3 fill-current" aria-hidden="true" />
          <span className="hidden sm:inline">Stop</span>
        </span>
      </button>
    );
  }

  if (status === "error") {
    return (
      <Tooltip content={rt.session?.error ?? "The preview failed. Start it again."}>
        <button type="button" onClick={onRun} disabled={!canEdit || busy !== null} aria-label="Retry preview" className={cn(base, "bg-danger/10 text-danger shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--danger)_35%,transparent)] hover:bg-danger/15")}>
          {busy === "start" ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <RotateCw className="size-3.5" aria-hidden="true" />}
          <span className="hidden sm:inline">Retry</span>
        </button>
      </Tooltip>
    );
  }

  const unavailable = status === "unavailable";
  return (
    <Tooltip content={unavailable ? (rt.configured ? "Previews aren't available right now" : "Previews are not available on this deployment") : !canEdit ? "You have view access" : "Save and start the preview (sandboxed)"}>
      <span className="inline-flex">
        <button
          type="button"
          onClick={onRun}
          disabled={!canEdit || unavailable || busy !== null}
          aria-label="Run preview"
          className={cn(base, "bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border-strong),var(--shadow-sm)] hover:bg-muted")}
        >
          {busy === "start" ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Play className="size-3.5 fill-current text-success" aria-hidden="true" />}
          <span className="hidden sm:inline">Run</span>
        </button>
      </span>
    </Tooltip>
  );
}
