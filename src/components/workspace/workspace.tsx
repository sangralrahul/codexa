"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Code2, Files, MessageSquare, Monitor, Search, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { emit, on } from "@/lib/client/events";
import { projectsApi } from "@/lib/client/workspace/api";
import { useEditorState } from "@/lib/client/workspace/use-editor-state";
import { useMediaQuery } from "@/lib/client/workspace/use-media-query";
import { readLocal, writeLocal, wsKey } from "@/lib/client/workspace/storage";
import type { FileEntry, ProjectDto, ProjectSettings, ProjectVisibility, WorkspaceRole } from "@/lib/client/workspace/types";
import { ChatPanel } from "@/components/ai/chat-panel";
import { PreviewPanel } from "./preview-panel";
import { LogsPanel } from "./logs-panel";
import { DeployPanel } from "./deploy-panel";
import { GithubPanel } from "./github-panel";
import { DatabasePanel } from "./database-panel";
import { EditorArea } from "./editor-area";
import { FileExplorer } from "./file-explorer";
import { SearchPanel } from "./search-panel";
import { QuickOpen } from "./quick-open";
import { Drawer } from "./drawer";
import { HistoryDrawer } from "./history-drawer";
import { ShareDialog } from "./share-dialog";
import { SettingsDrawer } from "./settings-drawer";
import { ActivityDrawer } from "./activity-drawer";
import { WorkspaceHeader, type RuntimeStatus, type WorkspaceTool } from "./workspace-header";
import { PanelTabs } from "./panel-tabs";

type LeftTab = "chat" | "files" | "search";
type RightTab = "preview" | "logs";
type MobileTab = "chat" | "files" | "editor" | "preview";
type Layout = Record<string, number>;

const DEFAULT_LAYOUT: Layout = { left: 24, center: 46, right: 30 };

const LEFT_TABS = [
  ["chat", "Chat", MessageSquare],
  ["files", "Files", Files],
  ["search", "Search", Search],
] as const;
const RIGHT_TABS = [
  ["preview", "Preview", Monitor],
  ["logs", "Logs", Terminal],
] as const;

export function Workspace({
  project: initial,
  role,
  files,
  workspaceName,
  user,
}: {
  project: ProjectDto;
  role: WorkspaceRole;
  files: FileEntry[];
  workspaceName?: string;
  user?: { name: string; email: string; avatarUrl: string | null };
}) {
  const canEdit = role === "owner" || role === "admin" || role === "editor";
  const projectId = initial.id;
  const [project, setProject] = useState(initial);
  const state = useEditorState(projectId, files, canEdit);
  const isDesktop = useMediaQuery("(min-width: 1024px)", true);

  const [leftTab, setLeftTab] = useState<LeftTab>("files");
  const [rightTab, setRightTab] = useState<RightTab>("preview");
  const [mobileTab, setMobileTab] = useState<MobileTab>("editor");
  const [quickOpen, setQuickOpen] = useState(false);
  const [searchFocus, setSearchFocus] = useState(0);
  const [tool, setTool] = useState<WorkspaceTool | null>(null);
  const [changesVersion, setChangesVersion] = useState(0);
  const [runtime, setRuntime] = useState<{ status: RuntimeStatus; previewUrl: string | null; error: string | null }>({ status: "unknown", previewUrl: null, error: null });
  const [layout, setLayout] = useState<Layout | null>(null);
  // ---- persisted panel sizes / tabs ----------------------------------------
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage after mount (SSR-safe)
    setLayout(readLocal<Layout>(wsKey(projectId, "layout"), DEFAULT_LAYOUT));
    const t = readLocal<{ left?: LeftTab; right?: RightTab }>(wsKey(projectId, "panels"), {});
    if (t.left) setLeftTab(t.left);
    if (t.right) setRightTab(t.right);
  }, [projectId]);
  useEffect(() => {
    writeLocal(wsKey(projectId, "panels"), { left: leftTab, right: rightTab });
  }, [projectId, leftTab, rightTab]);

  // ---- runtime status from the runner owner ---------------------------------
  useEffect(
    () =>
      on("codexa:runtime-status", (d) => {
        setRuntime({ status: d.status, previewUrl: d.previewUrl ?? null, error: d.error ?? null });
      }),
    [],
  );

  // Files opened by other panels (AI chat, search results) should also surface the editor on mobile.
  useEffect(() => on("codexa:open-file", () => setMobileTab("editor")), []);

  // ---- global shortcuts ------------------------------------------------------
  const openSearch = useCallback(() => {
    setLeftTab("search");
    setMobileTab("files");
    setSearchFocus((n) => n + 1);
  }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "p" && !e.shiftKey) {
        e.preventDefault();
        setQuickOpen(true);
      } else if (k === "f" && e.shiftKey) {
        e.preventDefault();
        openSearch();
      } else if (k === "s" && !e.shiftKey) {
        e.preventDefault();
        void state.saveAll();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [openSearch, state]);

  const openFile = useCallback(
    (path: string, line?: number) => {
      state.openFile(path, line);
      setMobileTab("editor");
    },
    [state],
  );

  const rename = useCallback(
    async (name: string) => {
      const res = await projectsApi.patch(projectId, { name });
      setProject((p) => ({ ...p, name: res.project.name }));
    },
    [projectId],
  );

  const run = useCallback(() => {
    void state.saveAll().then(() => emit("codexa:run-command", { command: "start" }));
    setRightTab("preview");
    setMobileTab("preview");
  }, [state]);
  const stop = useCallback(() => emit("codexa:run-command", { command: "stop" }), []);

  // ---- panels ---------------------------------------------------------------
  const left = (
    <section className="flex h-full min-h-0 flex-col bg-surface" aria-label="Sidebar">
      <PanelTabs
        tabs={LEFT_TABS}
        value={leftTab}
        onChange={(id) => {
          setLeftTab(id);
          if (id === "search") setSearchFocus((n) => n + 1);
        }}
        label="Sidebar panels"
        idPrefix="left"
      />
      <div id={`left-${leftTab}`} role="tabpanel" className="min-h-0 flex-1">
        {leftTab === "chat" ? (
          <ChatPanel projectId={projectId} />
        ) : leftTab === "files" ? (
          <FileExplorer state={{ ...state, openFile }} canEdit={canEdit} projectId={projectId} />
        ) : (
          <SearchPanel projectId={projectId} focusKey={searchFocus} onOpen={(p, l) => openFile(p, l)} />
        )}
      </div>
    </section>
  );

  const editor = <EditorArea state={state} canEdit={canEdit} onQuickOpen={() => setQuickOpen(true)} onSearchAll={openSearch} />;

  const right = (
    <section className="flex h-full min-h-0 flex-col bg-surface" aria-label="Preview and logs">
      <PanelTabs tabs={RIGHT_TABS} value={rightTab} onChange={setRightTab} label="Output panels" idPrefix="right" />
      <div id={`right-${rightTab}`} role="tabpanel" className="min-h-0 flex-1 overflow-auto">
        {rightTab === "preview" ? <PreviewPanel projectId={projectId} /> : <LogsPanel projectId={projectId} />}
      </div>
    </section>
  );

  const toolDrawer = useMemo(() => {
    if (tool === "deploy") return { title: "Deploy", node: <DeployPanel projectId={projectId} /> };
    if (tool === "github") return { title: "GitHub", node: <GithubPanel projectId={projectId} /> };
    if (tool === "database") return { title: "Database", node: <DatabasePanel projectId={projectId} /> };
    return null;
  }, [tool, projectId]);

  return (
    <div className="flex h-dvh min-h-[480px] flex-col overflow-hidden bg-background" data-testid="workspace">
      <WorkspaceHeader
        projectId={projectId}
        name={project.name}
        workspaceName={workspaceName}
        user={user}
        onRename={rename}
        canEdit={canEdit}
        saveStatus={state.status}
        runtime={runtime}
        onRun={run}
        onStop={stop}
        openTool={setTool}
        changesVersion={changesVersion}
        onOpenFile={(p) => openFile(p)}
      />

      {isDesktop ? (
        layout ? (
          <Group orientation="horizontal" className="min-h-0 flex-1" defaultLayout={layout} onLayoutChanged={(l) => writeLocal(wsKey(projectId, "layout"), l)}>
            <Panel id="left" minSize="200px" defaultSize={layout.left ?? DEFAULT_LAYOUT.left} collapsible collapsedSize={0}>
              {left}
            </Panel>
            <Separator className="relative w-px bg-border outline-none transition-colors after:absolute after:inset-y-0 after:-left-1 after:-right-1 after:content-[''] hover:bg-signal/70 data-[resize-handle-active]:bg-signal" aria-label="Resize sidebar" />
            <Panel id="center" minSize="30%" defaultSize={layout.center ?? DEFAULT_LAYOUT.center}>
              {editor}
            </Panel>
            <Separator className="relative w-px bg-border outline-none transition-colors after:absolute after:inset-y-0 after:-left-1 after:-right-1 after:content-[''] hover:bg-signal/70 data-[resize-handle-active]:bg-signal" aria-label="Resize preview" />
            <Panel id="right" minSize="220px" defaultSize={layout.right ?? DEFAULT_LAYOUT.right} collapsible collapsedSize={0}>
              {right}
            </Panel>
          </Group>
        ) : (
          <div className="flex-1" />
        )
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            {mobileTab === "chat" ? <ChatPanel projectId={projectId} /> : mobileTab === "files" ? left : mobileTab === "editor" ? editor : right}
          </div>
          <nav className="flex shrink-0 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]" aria-label="Workspace panels">
            {(
              [
                ["chat", "Chat", MessageSquare],
                ["files", "Files", Files],
                ["editor", "Editor", Code2],
                ["preview", "Preview", Monitor],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMobileTab(id)}
                aria-current={mobileTab === id ? "page" : undefined}
                className={cn("relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors", mobileTab === id ? "text-foreground" : "text-muted-foreground")}
              >
                {mobileTab === id ? <span className="pop-in absolute inset-x-6 top-0 h-0.5 rounded-full bg-foreground" aria-hidden="true" /> : null}
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      )}

      <QuickOpen open={quickOpen} onOpenChange={setQuickOpen} files={state.files} onPick={(p) => openFile(p)} />
      <HistoryDrawer projectId={projectId} open={tool === "history"} onOpenChange={(o) => !o && setTool(null)} canEdit={canEdit} onChanged={() => setChangesVersion((n) => n + 1)} />
      <ShareDialog
        projectId={projectId}
        open={tool === "share"}
        onOpenChange={(o) => !o && setTool(null)}
        visibility={project.visibility}
        onVisibilityChange={(v: ProjectVisibility) => setProject((p) => ({ ...p, visibility: v }))}
        canEdit={canEdit}
      />
      <SettingsDrawer
        projectId={projectId}
        open={tool === "settings"}
        onOpenChange={(o) => !o && setTool(null)}
        settings={project.settings}
        onSettingsSaved={(s: ProjectSettings) => setProject((p) => ({ ...p, settings: s }))}
        canEdit={canEdit}
      />
      <ActivityDrawer projectId={projectId} open={tool === "activity"} onOpenChange={(o) => !o && setTool(null)} />
      <Drawer open={Boolean(toolDrawer)} onOpenChange={(o) => !o && setTool(null)} title={toolDrawer?.title ?? ""} wide>
        <div className="h-full min-h-[320px]">{toolDrawer?.node}</div>
      </Drawer>
    </div>
  );
}
