"use client";

import { Component, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Group, Panel, Separator, type GroupImperativeHandle, type Layout, type PanelImperativeHandle } from "react-resizable-panels";
import {
  ArrowUp,
  Code2,
  Columns2,
  Files,
  FolderGit2,
  History,
  ListChecks,
  MessageSquare,
  MessageSquarePlus,
  Monitor,
  PanelLeftOpen,
  Play,
  Rocket,
  Save,
  Search,
  Sparkles,
  Square,
  TerminalSquare,
  WandSparkles,
  Hash,
  Database,
  RotateCw,
  TriangleAlert, Cloud, MessageSquareText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { emit, on } from "@/lib/client/events";
import { useCalm } from "@/lib/client/motion";
import { projectsApi } from "@/lib/client/workspace/api";
import { useEditorState } from "@/lib/client/workspace/use-editor-state";
import { useMediaQuery } from "@/lib/client/workspace/use-media-query";
import { LAYOUT_KEYS, readLocal, writeLocal, wsKey } from "@/lib/client/workspace/storage";
import { WorkspaceRuntimeProvider, useRuntime } from "@/lib/client/workspace/runtime";
import { AgentProvider, useAgent } from "@/lib/client/workspace/agent";
import { DeploymentsProvider } from "@/lib/client/workspace/deployments";
import { useChanges, useSnapshotCount } from "@/lib/client/workspace/use-changes";
import { useProblems } from "@/lib/client/workspace/use-problems";
import type { FileEntry, ProjectDto, ProjectSettings, ProjectVisibility, WorkspaceRole } from "@/lib/client/workspace/types";
import type { CodeEditorHandle } from "@/components/editor/code-editor";
import { languageForPath } from "@/components/editor/language";
import { ChatPanel } from "@/components/ai/chat-panel";
import { Kbd } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { Tooltip } from "@/components/ui/tooltip";
import { GlideIndicator, useGlide } from "@/components/motion/glide";
import { PreviewPanel, type Device } from "./preview-panel";
import { CloudPanel } from "./cloud-panel";
import { FeedbackPanel } from "./feedback-panel";
import { Dock, type DockTab } from "./dock";
import { GithubPanel } from "./github-panel";
import { DatabasePanel } from "./database-panel";
import { EditorArea } from "./editor-area";
import { FileExplorer } from "./file-explorer";
import { SearchPanel } from "./search-panel";
import { QuickOpen, type PaletteCommand } from "./quick-open";
import { Drawer } from "./drawer";
import { HistoryDrawer } from "./history-drawer";
import { ShareDialog } from "./share-dialog";
import { SettingsDrawer } from "./settings-drawer";
import { ActivityDrawer } from "./activity-drawer";
import { PublishingSheet } from "./publishing-sheet";
import { ProjectOverview, type OverviewAction } from "./project-overview";
import { PresenceProvider } from "./presence";
import { StatusBar } from "./status-bar";
import { WorkspaceHeader, type CanvasView, type RecentProject, type WorkspaceTool } from "./workspace-header";

type MobileTab = "chat" | "files" | "code" | "preview" | "logs";
type SplitLayout = { files: number; editor: number; preview: number };
type DockState = { open: boolean; size: number; tab: DockTab };
type HostId = "chat" | "explorer" | "editor" | "preview" | "dock";
type Hosts = Record<HostId, HTMLDivElement>;

/**
 * One detached DOM node per panel, created once on the client. Each panel is rendered into its
 * node through a portal and the node is moved into whichever layout slot is current (desktop
 * panels or mobile tabs), so crossing the 1024px breakpoint (a rotated tablet, a resized window)
 * never unmounts the chat, its live run, the editor or the terminal.
 */
function useHosts(): Hosts | null {
  const [hosts] = useState<Hosts | null>(() => {
    if (typeof document === "undefined") return null;
    const make = (id: HostId) => {
      const el = document.createElement("div");
      el.className = "ws-host";
      el.dataset.wsHost = id;
      return el;
    };
    return { chat: make("chat"), explorer: make("explorer"), editor: make("editor"), preview: make("preview"), dock: make("dock") };
  });
  return hosts;
}

/**
 * Contains a render error to the one panel that threw, so a bad response in (say) the GitHub
 * panel can never blank the editor and its unsaved work. "Try again" remounts just that panel.
 */
class PanelBoundary extends Component<{ name: string; children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    logger.error("workspace panel failed to render", { panel: this.props.name, error });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="flex size-9 items-center justify-center rounded-xl border border-danger/30 bg-danger/[0.07] text-danger">
          <TriangleAlert className="size-4" aria-hidden="true" />
        </span>
        <p className="text-[13.5px] font-semibold">The {this.props.name} panel hit an error</p>
        <p className="max-w-xs break-words text-[12px] text-muted-foreground">{this.state.error.message || "Something went wrong while rendering it."} The rest of the workspace is unaffected.</p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-border-strong bg-card px-3 text-[12.5px] font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          <RotateCw className="size-3.5" aria-hidden="true" /> Try again
        </button>
      </div>
    );
  }
}

/** Where a panel's host node lives in the current layout (display: contents, so it adds no box). */
function Slot({ host }: { host: HTMLDivElement | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !host) return;
    el.appendChild(host);
    return () => {
      if (host.parentNode === el) el.removeChild(host);
    };
  }, [host]);
  return <div ref={ref} className="contents" />;
}

const VIEWS: CanvasView[] = ["preview", "split", "code"];
const DEVICES: Device[] = ["desktop", "tablet", "mobile"];
/** Default widths: the agent column (380 at ≥1440, else 360), the explorer, and the preview's share of the canvas. */
/** Below 1440 the agent column opens at its minimum so the canvas keeps room for real code. */
const AGENT_PX = 340;
const AGENT_WIDE_PX = 380;
const EXPLORER_PX = 216;
/** In split, the preview takes this share of the canvas left after the explorer. */
const PREVIEW_SHARE = 0.4;
const splitFor = (files: number): SplitLayout => {
  const preview = Math.round((100 - files) * PREVIEW_SHARE * 10) / 10;
  return { files, editor: 100 - files - preview, preview };
};
const DOCK_COLLAPSED_PX = 34;

export type WorkspaceTemplate = { id: string; name: string; category: string } | null;

/**
 * The builder workspace, agent-first: [Agent | Canvas]. The runtime (polling, sync, logs),
 * the agent's live state and deployments live in providers for the whole session, and every
 * panel (chat, preview, terminal) stays mounted; views and tabs only hide them.
 */
export function Workspace(props: {
  project: ProjectDto;
  role: WorkspaceRole;
  files: FileEntry[];
  workspaceName?: string;
  user?: { name: string; email: string; avatarUrl: string | null };
  template?: WorkspaceTemplate;
  recent?: RecentProject[];
}) {
  return (
    <WorkspaceRuntimeProvider projectId={props.project.id} autoStart={props.role !== "viewer"}>
      <AgentProvider projectId={props.project.id}>
        <DeploymentsProvider projectId={props.project.id} role={props.role}>
          <Shell {...props} />
        </DeploymentsProvider>
      </AgentProvider>
    </WorkspaceRuntimeProvider>
  );
}

function Shell({
  project: initial,
  role,
  files,
  user,
  template = null,
  recent = [],
}: {
  project: ProjectDto;
  role: WorkspaceRole;
  files: FileEntry[];
  user?: { name: string; email: string; avatarUrl: string | null };
  template?: WorkspaceTemplate;
  recent?: RecentProject[];
}) {
  const canEdit = role === "owner" || role === "admin" || role === "editor";
  const isAdmin = role === "owner" || role === "admin";
  const projectId = initial.id;
  const [project, setProject] = useState(initial);
  const state = useEditorState(projectId, files, canEdit);
  const rt = useRuntime();
  const agent = useAgent();
  const calm = useCalm();
  const isDesktop = useMediaQuery("(min-width: 1024px)", true);
  const isWide = useMediaQuery("(min-width: 1440px)", false);
  const [mounted, setMounted] = useState(false);
  const hosts = useHosts();

  const [view, setView] = useState<CanvasView>("split");
  const [device, setDevice] = useState<Device>("desktop");
  const [side, setSide] = useState<"files" | "search">("files");
  const [dock, setDock] = useState<DockState>({ open: false, size: 30, tab: "terminal" });
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  // Monaco (~1 MB) loads the first time code is on screen, not while only chat + preview show.
  const codeVisible = isDesktop ? view !== "preview" : mobileTab === "code";
  const [codeSeen, setCodeSeen] = useState(false);
  if (mounted && codeVisible && !codeSeen) setCodeSeen(true);
  const mobileTouched = useRef(false);
  const [palette, setPalette] = useState<false | "files" | "commands">(false);
  const [searchFocus, setSearchFocus] = useState(0);
  const [tool, setTool] = useState<WorkspaceTool | null>(null);
  const [deploySheet, setDeploySheet] = useState(false);
  const [deployTab, setDeployTab] = useState("overview");
  const [publishOpen, setPublishOpen] = useState(false);
  const [changesVersion, setChangesVersion] = useState(0);
  const [cursor, setCursor] = useState<{ line: number; column: number } | null>(null);
  const [agentCollapsed, setAgentCollapsed] = useState(false);
  // The explorer and editor read as one "Code" card (joined by a hairline) while the explorer is open.
  const [filesShown, setFilesShown] = useState(true);
  const editorHandle = useRef<CodeEditorHandle | null>(null);
  const shellGroup = useRef<GroupImperativeHandle | null>(null);
  const canvasGroup = useRef<GroupImperativeHandle | null>(null);
  const agentPanel = useRef<PanelImperativeHandle | null>(null);
  const dockPanel = useRef<PanelImperativeHandle | null>(null);
  const canvasEl = useRef<HTMLDivElement | null>(null);
  const viewFromDrag = useRef(false);
  const savedSplit = useRef<SplitLayout | null>(null);
  const [shellLayout, setShellLayout] = useState<Layout | null>(null);
  const [initialCanvas, setInitialCanvas] = useState<SplitLayout | null>(null);

  const changes = useChanges(projectId, changesVersion);
  const snapshots = useSnapshotCount(projectId, changesVersion);
  const problems = useProblems(rt.logs, state.files);

  // ---- hydrate per-viewer layout (new keys only; the old layout/panels values are never parsed) ----
  useEffect(() => {
    const v = readLocal<string | null>(wsKey(projectId, LAYOUT_KEYS.view), null);
    const d = readLocal<string | null>(wsKey(projectId, LAYOUT_KEYS.device), null);
    const s = readLocal<string | null>(wsKey(projectId, LAYOUT_KEYS.side), null);
    const k = readLocal<Partial<DockState> | null>(wsKey(projectId, LAYOUT_KEYS.dock), null);
    const split = readLocal<Partial<SplitLayout> | null>(wsKey(projectId, LAYOUT_KEYS.split), null);
    const shell = readLocal<Layout | null>(wsKey(projectId, LAYOUT_KEYS.shell), null);
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage after mount (SSR-safe) */
    if (v && VIEWS.includes(v as CanvasView)) setView(v as CanvasView);
    // A project just created from a prompt opens on chat + preview (?view=preview from the composer).
    const fromUrl = new URLSearchParams(window.location.search).get("view");
    const urlView = fromUrl && VIEWS.includes(fromUrl as CanvasView) ? (fromUrl as CanvasView) : null;
    if (urlView) {
      setView(urlView);
      const url = new URL(window.location.href);
      url.searchParams.delete("view");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
    if (d && DEVICES.includes(d as Device)) setDevice(d as Device);
    if (s === "files" || s === "search") setSide(s);
    if (k && typeof k.open === "boolean") setDock({ open: k.open, size: typeof k.size === "number" && k.size > 5 && k.size < 90 ? k.size : 30, tab: k.tab === "problems" ? "problems" : "terminal" });
    if (split && [split.files, split.editor, split.preview].every((x) => typeof x === "number" && x >= 0) && Math.abs((split.files ?? 0) + (split.editor ?? 0) + (split.preview ?? 0) - 100) < 1 && (split.preview ?? 0) > 0 && (split.editor ?? 0) > 0) {
      savedSplit.current = split as SplitLayout;
    }
    if (shell && typeof shell.agent === "number" && typeof shell.canvas === "number") setShellLayout(shell);
    // First canvas layout for the remembered view, estimated from the window (later switches measure the canvas).
    const startView = urlView ?? (v && VIEWS.includes(v as CanvasView) ? (v as CanvasView) : "split");
    const agentPx = shell && typeof shell.agent === "number" ? (shell.agent / 100) * window.innerWidth : window.innerWidth >= 1440 ? AGENT_WIDE_PX : AGENT_PX;
    const canvasPx = Math.max(400, window.innerWidth - agentPx - 18);
    const files = Math.min(40, Math.max(8, (EXPLORER_PX / canvasPx) * 100));
    setInitialCanvas(
      startView === "preview"
        ? { files: 0, editor: 0, preview: 100 }
        : startView === "code"
          ? { files, editor: 100 - files, preview: 0 }
          : (savedSplit.current ?? splitFor(files)),
    );
    setMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [projectId]);

  useEffect(() => {
    if (!mounted) return;
    writeLocal(wsKey(projectId, LAYOUT_KEYS.view), view);
    writeLocal(wsKey(projectId, LAYOUT_KEYS.device), device);
    writeLocal(wsKey(projectId, LAYOUT_KEYS.side), side);
    writeLocal(wsKey(projectId, LAYOUT_KEYS.dock), dock);
  }, [mounted, projectId, view, device, side, dock]);

  // ---- canvas layout per view -------------------------------------------------------------
  const layoutFor = useCallback(
    (v: CanvasView): SplitLayout => {
      const width = canvasEl.current?.offsetWidth || (typeof window !== "undefined" ? window.innerWidth - (isWide ? AGENT_WIDE_PX : AGENT_PX) - 12 : 1000);
      const files = Math.min(40, Math.max(8, (EXPLORER_PX / Math.max(400, width)) * 100));
      if (v === "preview") return { files: 0, editor: 0, preview: 100 };
      if (v === "code") return { files, editor: 100 - files, preview: 0 };
      const saved = savedSplit.current;
      if (saved && saved.preview > 0 && saved.editor > 0) return saved;
      return splitFor(files);
    },
    [isWide],
  );

  const applyView = useCallback(
    (v: CanvasView) => {
      const g = canvasGroup.current;
      const el = canvasEl.current;
      if (!g) return;
      if (el && !calm) {
        el.classList.add("ws-animating");
        setTimeout(() => el.classList.remove("ws-animating"), 360);
      }
      g.setLayout(layoutFor(v));
    },
    [layoutFor, calm],
  );
  const lastApplied = useRef<CanvasView | null>(null);
  useEffect(() => {
    if (!mounted || !isDesktop) return;
    if (lastApplied.current === null) {
      lastApplied.current = view;
      return;
    }
    if (lastApplied.current === view) return;
    lastApplied.current = view;
    if (viewFromDrag.current) {
      viewFromDrag.current = false;
      return;
    }
    applyView(view);
  }, [view, mounted, isDesktop, applyView]);

  // Back on a desktop width (a rotated tablet, a widened window): the canvas Group mounts again
  // with its first layout, so put it back to the view that is current now.
  const wasDesktop = useRef(isDesktop);
  useEffect(() => {
    const returned = isDesktop && !wasDesktop.current;
    wasDesktop.current = isDesktop;
    if (!mounted || !returned) return;
    const raf = requestAnimationFrame(() => canvasGroup.current?.setLayout(layoutFor(view)));
    return () => cancelAnimationFrame(raf);
  }, [isDesktop, mounted, view, layoutFor]);

  const onCanvasLayout = useCallback(
    (layout: Layout, meta: { isUserInteraction: boolean; requestedLayout?: Layout }) => {
      if (!meta.isUserInteraction) return;
      const l = (meta.requestedLayout ?? layout) as SplitLayout;
      const next: CanvasView = l.preview < 1 ? "code" : l.editor < 1 && l.files < 1 ? "preview" : "split";
      if (next === "split") {
        savedSplit.current = { files: l.files, editor: l.editor, preview: l.preview };
        writeLocal(wsKey(projectId, LAYOUT_KEYS.split), savedSplit.current);
      }
      setView((v) => {
        if (v !== next) viewFromDrag.current = true;
        return next;
      });
    },
    [projectId],
  );

  // ---- agent column -------------------------------------------------------------------------
  const agentDefault = isWide ? AGENT_WIDE_PX : AGENT_PX;
  const revealAgent = useCallback(
    (focus = false) => {
      if (!isDesktop) {
        mobileTouched.current = true;
        setMobileTab("chat");
      } else {
        const p = agentPanel.current;
        if (p?.isCollapsed()) p.resize(agentDefault);
      }
      if (focus) emit("codexa:agent-command", { command: "focus" });
    },
    [isDesktop, agentDefault],
  );
  const toggleAgent = useCallback(() => {
    const p = agentPanel.current;
    if (!p) return;
    if (p.isCollapsed()) p.resize(agentDefault);
    else p.collapse();
  }, [agentDefault]);

  // Requests aimed at the agent always reach it: reveal the column (or the Chat tab on phones).
  useEffect(() => {
    const offFix = on("codexa:ai-fix-request", () => revealAgent());
    const offAsk = on("codexa:ai-ask", () => revealAgent());
    return () => {
      offFix();
      offAsk();
    };
  }, [revealAgent]);

  // ---- dock -------------------------------------------------------------------------------
  const setDockOpen = useCallback(
    (open: boolean, tab?: DockTab) => {
      const p = dockPanel.current;
      if (tab) setDock((d) => ({ ...d, tab }));
      if (!isDesktop) {
        mobileTouched.current = true;
        setMobileTab("logs");
        return;
      }
      if (!p) return;
      if (open && p.isCollapsed()) p.resize(`${dock.size}%`);
      else if (!open && !p.isCollapsed()) p.collapse();
    },
    [dock.size, isDesktop],
  );
  const toggleDock = useCallback(() => setDockOpen(!dock.open), [dock.open, setDockOpen]);

  // ---- mobile default tab: Preview when a runtime is already running ------------------------
  useEffect(() => {
    if (isDesktop || mobileTouched.current || rt.status === "unknown") return;
    mobileTouched.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the first real runtime status decides the default tab, once
    if (rt.status === "running") setMobileTab("preview");
  }, [rt.status, isDesktop]);
  useEffect(() => {
    if (!isDesktop && mobileTab === "preview") agent.markSeen();
  }, [isDesktop, mobileTab, agent]);

  // Live build: as each real file_change lands, the tree picks up new files (which then flash) and an
  // open, unedited tab reloads to the agent's version, without waiting for the run to finish.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });
  const touchedSeen = useRef(0);
  useEffect(() => {
    const fresh = Object.values(agent.touched).filter((t) => t.at > touchedSeen.current);
    if (!fresh.length) return;
    const t = setTimeout(() => {
      touchedSeen.current = Math.max(touchedSeen.current, ...fresh.map((f) => f.at));
      const s = stateRef.current;
      void s.refreshFiles();
      for (const f of fresh) if (f.action !== "delete" && s.docs[f.path] && !s.dirtyPaths.includes(f.path)) void s.reloadDoc(f.path);
    }, 250);
    return () => clearTimeout(t);
  }, [agent.touched]);

  // Files opened from other panels surface the editor.
  const openFile = useCallback(
    (path: string, line?: number) => {
      state.openFile(path, line);
      if (!isDesktop) {
        mobileTouched.current = true;
        setMobileTab("code");
      } else if (view === "preview") setView("split");
    },
    [state, isDesktop, view],
  );
  useEffect(
    () =>
      on("codexa:open-file", () => {
        if (!isDesktop) {
          mobileTouched.current = true;
          setMobileTab("code");
        } else setView((v) => (v === "preview" ? "split" : v));
      }),
    [isDesktop],
  );

  const openSearch = useCallback(() => {
    setSide("search");
    setSearchFocus((n) => n + 1);
    if (!isDesktop) {
      mobileTouched.current = true;
      setMobileTab("files");
    } else setView((v) => (v === "preview" ? "split" : v));
  }, [isDesktop]);

  const run = useCallback(() => {
    void state.saveAll().then(() => emit("codexa:run-command", { command: "start" }));
    if (!isDesktop) {
      mobileTouched.current = true;
      setMobileTab("preview");
    } else setView((v) => (v === "code" ? "split" : v));
  }, [state, isDesktop]);

  const openTool = useCallback((t: WorkspaceTool) => {
    if (t === "deploy") setDeploySheet(true);
    else setTool(t);
  }, []);

  const rename = useCallback(
    async (name: string) => {
      const res = await projectsApi.patch(projectId, { name });
      setProject((p) => ({ ...p, name: res.project.name }));
    },
    [projectId],
  );

  // ---- global shortcuts --------------------------------------------------------------------
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "p" && !e.shiftKey) {
        e.preventDefault();
        setPalette("files");
      } else if (k === "p" && e.shiftKey) {
        e.preventDefault();
        setPalette("commands");
      } else if (k === "f" && e.shiftKey) {
        e.preventDefault();
        openSearch();
      } else if (k === "s" && !e.shiftKey) {
        e.preventDefault();
        void state.saveAll();
      } else if (k === "j" && !e.shiftKey) {
        e.preventDefault();
        toggleDock();
      } else if (e.key === "." && !e.shiftKey && isDesktop) {
        e.preventDefault();
        toggleAgent();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [openSearch, state, toggleDock, toggleAgent, isDesktop]);

  // Monaco swallows its own chords (Ctrl/⌘ . is quick fix): register ours inside it too.
  const cmds = useRef({ toggleDock, toggleAgent, commands: () => setPalette("commands") });
  useEffect(() => {
    cmds.current = { toggleDock, toggleAgent, commands: () => setPalette("commands") };
  }, [toggleDock, toggleAgent]);
  const onEditorHandle = useCallback((h: CodeEditorHandle | null) => {
    editorHandle.current = h;
    if (!h) return;
    const { KeyMod: KM, KeyCode: KC } = h.monaco;
    h.editor.addCommand(KM.CtrlCmd | KC.KeyJ, () => cmds.current.toggleDock());
    h.editor.addCommand(KM.CtrlCmd | KC.Period, () => cmds.current.toggleAgent());
    h.editor.addCommand(KM.CtrlCmd | KM.Shift | KC.KeyP, () => cmds.current.commands());
  }, []);

  const runEditorAction = (id: string) => {
    const ed = editorHandle.current?.editor;
    if (!ed) return;
    ed.focus();
    void ed.getAction(id)?.run();
  };

  // ---- palette commands (real handlers only) -------------------------------------------------
  const running = rt.status === "running" || rt.status === "starting";
  const commands: PaletteCommand[] = [
    { id: "run", label: "Run preview", Icon: Play, disabled: !canEdit || running || rt.status === "unavailable", run },
    { id: "stop", label: "Stop preview", Icon: Square, disabled: !canEdit || !running, run: () => emit("codexa:run-command", { command: "stop" }) },
    { id: "publish", label: "Publish…", Icon: Rocket, disabled: !canEdit, run: () => setPublishOpen(true) },
    { id: "new-chat", label: "New chat", Icon: MessageSquarePlus, run: () => {
        revealAgent();
        emit("codexa:agent-command", { command: "new-chat" });
      } },
    { id: "ask", label: "Ask the agent", Icon: Sparkles, run: () => revealAgent(true) },
    ...(isDesktop
      ? [
          { id: "view-preview", label: "View: preview only", Icon: Monitor, run: () => setView("preview") },
          { id: "view-split", label: "View: split", Icon: Columns2, run: () => setView("split") },
          { id: "view-code", label: "View: code only", Icon: Code2, run: () => setView("code") },
          { id: "toggle-agent", label: "Toggle the agent column", Icon: PanelLeftOpen, shortcut: <Kbd mod>.</Kbd>, run: toggleAgent },
        ]
      : []),
    { id: "history", label: "Open version history", Icon: History, run: () => setTool("history") },
    { id: "format", label: "Format document", Icon: WandSparkles, disabled: !canEdit || !state.active, run: () => runEditorAction("editor.action.formatDocument") },
    { id: "goto", label: "Go to line…", Icon: Hash, disabled: !state.active, run: () => runEditorAction("editor.action.gotoLine") },
    { id: "terminal", label: "Toggle terminal", Icon: TerminalSquare, shortcut: <Kbd mod>J</Kbd>, run: toggleDock },
    { id: "problems", label: "Show problems", Icon: ListChecks, run: () => setDockOpen(true, "problems") },
    { id: "search", label: "Search in files", Icon: Search, shortcut: <Kbd mod>⇧F</Kbd>, run: openSearch },
    { id: "save", label: "Save all files", Icon: Save, shortcut: <Kbd mod>S</Kbd>, disabled: !canEdit, run: () => void state.saveAll() },
    { id: "github", label: "Open GitHub", Icon: FolderGit2, run: () => setTool("github") },
    { id: "database", label: "Open Database", Icon: Database, run: () => setTool("database") },
  ];
  const recentFiles = useMemo(() => [...(state.active ? [state.active] : []), ...[...state.tabs].reverse().filter((p) => p !== state.active)], [state.tabs, state.active]);

  // ---- panels (created once, placed by layout) ------------------------------------------------
  const sideSwitch = (
    <Segmented<"files" | "search">
      aria-label="Explorer"
      size="sm"
      value={side}
      onValueChange={(v) => {
        setSide(v);
        if (v === "search") setSearchFocus((n) => n + 1);
      }}
      options={[
        // Icon-only when the explorer is narrow (labels stay for screen readers, titles for pointer users),
        // so the switch never spills over the explorer's action buttons.
        { value: "files", label: <span className="@max-[15.5rem]/explorer:sr-only">Files</span>, icon: <Files />, title: "Files" },
        { value: "search", label: <span className="@max-[15.5rem]/explorer:sr-only">Search</span>, icon: <Search />, title: "Search in files" },
      ]}
    />
  );

  const explorer = (
    <div className="@container/explorer flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1" hidden={side !== "files"}>
        <FileExplorer state={{ ...state, openFile }} canEdit={canEdit} changes={changes.changes} touched={agent.touched} header={sideSwitch} />
      </div>
      <div className="min-h-0 flex-1" hidden={side !== "search"}>
        <SearchPanel projectId={projectId} focusKey={searchFocus} onOpen={(p, l) => openFile(p, l)} header={sideSwitch} />
      </div>
    </div>
  );

  const overview = (
    <ProjectOverview
      projectId={projectId}
      name={project.name}
      description={project.description}
      template={template}
      files={state.files}
      canEdit={canEdit}
      onOpen={(p) => openFile(p)}
      onAction={(a: OverviewAction) => {
        if (a === "run") run();
        else if (a === "agent") revealAgent(true);
        else if (a === "quick-open") setPalette("files");
        else if (a === "search") openSearch();
        else if (a === "history") setTool("history");
        else if (a === "publish") setPublishOpen(true);
      }}
    />
  );

  const editor = <EditorArea mountEditor={codeSeen} state={state} canEdit={canEdit} onQuickOpen={() => setPalette("files")} onSearchAll={openSearch} onCursor={setCursor} onHandle={onEditorHandle} overview={overview} />;

  const chat = (
    <ChatPanel projectId={projectId} projectName={project.name} templateCategory={template?.category ?? null} framework={project.framework} canEdit={canEdit} showOperatorDetails={isAdmin} />
  );

  const preview = <PreviewPanel projectId={projectId} device={isDesktop ? device : "desktop"} onDeviceChange={isDesktop ? setDevice : undefined} canEdit={canEdit} showOperatorDetails={isAdmin} />;

  const dockEl = <Dock open={isDesktop ? dock.open : true} collapsible={isDesktop} onOpenChange={(o) => setDockOpen(o)} tab={dock.tab} onTabChange={(t) => setDock((d) => ({ ...d, tab: t }))} problems={problems} />;

  // The file actually on screen (null while the Project overview tab is showing).
  const language = agent.activeFile ? languageForPath(agent.activeFile) : null;

  return (
    <PresenceProvider projectId={projectId} activeFile={agent.activeFile}>
      <div className="ws-root flex h-dvh min-h-[480px] flex-col overflow-hidden bg-background" data-testid="workspace">
        <h1 className="sr-only">{project.name}</h1>
        <WorkspaceHeader
          name={project.name}
          template={template}
          recent={recent}
          user={user}
          onRename={rename}
          canEdit={canEdit}
          saveStatus={state.status}
          view={view}
          onViewChange={setView}
          onRun={run}
          openTool={openTool}
          projectId={projectId}
          onManageDeployments={(tab?: string) => {
            setDeployTab(tab ?? "overview");
            setDeploySheet(true);
          }}
          historyCount={snapshots.count}
          onRevealAgent={() => revealAgent()}
          isDesktop={isDesktop}
          publishOpen={publishOpen}
          onPublishOpenChange={setPublishOpen}
        />

        <div className="ws-body flex min-h-0 flex-1 flex-col px-1.5">
          {!mounted ? (
            <ShellSkeleton />
          ) : isDesktop ? (
            <Group
              orientation="horizontal"
              id={`ws-shell-${projectId}`}
              groupRef={shellGroup}
              className="min-h-0 flex-1"
              defaultLayout={shellLayout ?? undefined}
              onLayoutChanged={(layout, meta) => {
                if (meta.isUserInteraction) writeLocal(wsKey(projectId, LAYOUT_KEYS.shell), meta.requestedLayout ?? layout);
              }}
            >
              <Panel
                id="agent"
                panelRef={agentPanel}
                defaultSize={agentDefault}
                minSize={340}
                maxSize={560}
                collapsible
                collapsedSize={0}
                onResize={(size) => setAgentCollapsed(size.inPixels < 2)}
              >
                <div
                  className={cn("ws-agent comet-border", agentCollapsed && "invisible")}
                  data-active={agent.running && !calm ? "" : undefined}
                  data-running-calm={agent.running && calm ? "" : undefined}
                  inert={agentCollapsed}
                >
                  <div className="comet-border__inner">
                    <Slot host={hosts?.chat} />
                  </div>
                </div>
              </Panel>
              <Separator className="ws-sep ws-sep--x" aria-label="Resize the agent column" />
              <Panel id="canvas" minSize="30%">
                <div className="relative flex h-full min-h-0 flex-col">
                  {agentCollapsed ? (
                    <Tooltip content="Show the agent (Ctrl/⌘ .)" side="right">
                      <button
                        type="button"
                        onClick={() => revealAgent(true)}
                        className="ws-pill-in glass absolute left-2 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2 rounded-xl border border-border-strong px-1.5 py-3 shadow-lg transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                        aria-label="Show the agent"
                      >
                        <MessageSquare className="size-4" aria-hidden="true" />
                        {agent.running ? <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" /> : null}
                      </button>
                    </Tooltip>
                  ) : null}
                  <Group
                    orientation="vertical"
                    id={`ws-dock-${projectId}`}
                    className="min-h-0 flex-1"
                    defaultLayout={dock.open ? { main: 100 - dock.size, dock: dock.size } : undefined}
                    onLayoutChanged={(layout, meta) => {
                      if (meta.isUserInteraction && layout.dock > 12) setDock((d) => ({ ...d, size: Math.round(layout.dock) }));
                    }}
                  >
                    <Panel id="main" minSize="25%">
                      <div ref={canvasEl} className="h-full min-h-0">
                        <Group
                          orientation="horizontal"
                          id={`ws-canvas-${projectId}`}
                          groupRef={canvasGroup}
                          className="h-full min-h-0"
                          defaultLayout={initialCanvas ?? undefined}
                          onLayoutChanged={onCanvasLayout}
                        >
                          <Panel id="files" minSize="150px" maxSize="40%" collapsible collapsedSize={0} onResize={(size) => setFilesShown(size.inPixels > 1)}>
                            <div className="ws-card ws-code-l h-full" inert={view === "preview"}>
                              <Slot host={hosts?.explorer} />
                            </div>
                          </Panel>
                          <Separator className={cn("ws-sep ws-sep--x", filesShown && "ws-sep--seam")} data-off={view === "preview" ? "" : undefined} disabled={view === "preview"} aria-label="Resize the explorer" />
                          <Panel id="editor" minSize="18%" collapsible collapsedSize={0}>
                            <div className={cn("ws-card h-full", filesShown && "ws-code-r")} inert={view === "preview"}>
                              <Slot host={hosts?.editor} />
                            </div>
                          </Panel>
                          <Separator className="ws-sep ws-sep--x" data-off={view !== "split" ? "" : undefined} disabled={view !== "split"} aria-label="Resize the preview" />
                          <Panel id="preview" minSize="22%" collapsible collapsedSize={0}>
                            <div className="ws-card h-full" inert={view === "code"}>
                              <Slot host={hosts?.preview} />
                            </div>
                          </Panel>
                        </Group>
                      </div>
                    </Panel>
                    <Separator className="ws-sep ws-sep--y" data-off={dock.open ? undefined : ""} aria-label="Resize the dock" />
                    <Panel
                      id="dock"
                      panelRef={dockPanel}
                      defaultSize={dock.open ? `${dock.size}%` : DOCK_COLLAPSED_PX}
                      minSize={140}
                      collapsible
                      collapsedSize={DOCK_COLLAPSED_PX}
                      onResize={(size) => {
                        const open = size.inPixels > DOCK_COLLAPSED_PX + 8;
                        setDock((d) => (d.open === open ? d : { ...d, open }));
                      }}
                    >
                      <div className={cn("h-full", !dock.open && "pt-1.5")}>
                        <Slot host={hosts?.dock} />
                      </div>
                    </Panel>
                  </Group>
                </div>
              </Panel>
            </Group>
          ) : (
            <MobileBody tab={mobileTab} hosts={hosts} aiReady={Boolean(agent.ai?.configured)} running={agent.running} />
          )}
        </div>

        {/* Every panel is rendered exactly once, into its own host node (see useHosts). */}
        {mounted && hosts ? (
          <>
            {createPortal(<PanelBoundary name="agent">{chat}</PanelBoundary>, hosts.chat, "chat")}
            {createPortal(<PanelBoundary name="files">{explorer}</PanelBoundary>, hosts.explorer, "explorer")}
            {createPortal(<PanelBoundary name="editor">{editor}</PanelBoundary>, hosts.editor, "editor")}
            {createPortal(<PanelBoundary name="preview">{preview}</PanelBoundary>, hosts.preview, "preview")}
            {createPortal(<PanelBoundary name="terminal">{dockEl}</PanelBoundary>, hosts.dock, "dock")}
          </>
        ) : null}

        {mounted && isDesktop ? (
          <StatusBar
            branch={project.githubRepo ? (project.githubBranch ?? "main") : null}
            checkpoint={changes.snapshot ? { name: changes.snapshot.name, createdAt: changes.snapshot.createdAt, changed: changes.changes ? changes.changes.length : null, total: snapshots.count } : null}
            problems={problems}
            cursor={cursor}
            language={language}
            onOpenPreview={() => setView((v) => (v === "code" ? "split" : v))}
            onOpenGithub={() => setTool("github")}
            onOpenHistory={() => setTool("history")}
            onOpenProblems={() => setDockOpen(true, "problems")}
            onGoToLine={() => runEditorAction("editor.action.gotoLine")}
            onOpenCommands={() => setPalette("commands")}
            onOpenAgent={() => revealAgent(true)}
          />
        ) : mounted ? (
          <MobileNav
            tab={mobileTab}
            onChange={(t) => {
              mobileTouched.current = true;
              setMobileTab(t);
            }}
            previewBadge={agent.unseen > 0 && mobileTab !== "preview"}
            problems={problems.filter((p) => p.severity === "error").length}
            agentRunning={agent.running}
          />
        ) : null}

        <QuickOpen open={palette !== false} onOpenChange={(o) => !o && setPalette(false)} startInCommands={palette === "commands"} files={state.files} recent={recentFiles} onPick={(p) => openFile(p)} commands={commands} onAsk={(text) => emit("codexa:ai-ask", { text })} />
        <HistoryDrawer
          projectId={projectId}
          open={tool === "history"}
          onOpenChange={(o) => !o && setTool(null)}
          canEdit={canEdit}
          onChanged={() => setChangesVersion((n) => n + 1)}
          changesCount={changes.changes ? changes.changes.length : null}
          changesSince={changes.snapshot?.name ?? null}
        />
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
        <PublishingSheet projectId={projectId} open={deploySheet} onOpenChange={setDeploySheet} initialTab={deployTab} />
        <Drawer open={tool === "github"} onOpenChange={(o) => !o && setTool(null)} title="GitHub" icon={<FolderGit2 aria-hidden="true" />} description="Push to and pull from a repository. The workspace stays usable while this is open." width={560} modal={false}>
          <div className="h-full min-h-[320px]">
            {tool === "github" ? (
              <PanelBoundary name="GitHub">
                <GithubPanel projectId={projectId} />
              </PanelBoundary>
            ) : null}
          </div>
        </Drawer>
        <Drawer open={tool === "cloud"} onOpenChange={(o) => !o && setTool(null)} title="Cloud" icon={<Cloud aria-hidden="true" />} description="A built-in database and user sign-up for this app. No setup, no keys." width={760} modal={false}>
          <div className="h-full min-h-[320px]">
            {tool === "cloud" ? (
              <PanelBoundary name="cloud">
                <CloudPanel projectId={projectId} canEdit={canEdit} />
              </PanelBoundary>
            ) : null}
          </div>
        </Drawer>
        <Drawer open={tool === "feedback"} onOpenChange={(o) => !o && setTool(null)} title="Feedback" icon={<MessageSquareText aria-hidden="true" />} description="Share a review link. Clients click on the app to leave comments; fix them with AI." width={560} modal={false}>
          <div className="h-full min-h-[320px]">
            {tool === "feedback" ? (
              <PanelBoundary name="feedback">
                <FeedbackPanel projectId={projectId} canEdit={canEdit} />
              </PanelBoundary>
            ) : null}
          </div>
        </Drawer>
        <Drawer open={tool === "database"} onOpenChange={(o) => !o && setTool(null)} title="Database" icon={<Database aria-hidden="true" />} description="Browse the schema and run queries. Ask the agent about any error." width={760} modal={false}>
          <div className="h-full min-h-[320px]">
            {tool === "database" ? (
              <PanelBoundary name="database">
                <DatabasePanel projectId={projectId} />
              </PanelBoundary>
            ) : null}
          </div>
        </Drawer>
      </div>
    </PresenceProvider>
  );
}

/** Mirrors the shell while localStorage (view, sizes) is read after mount, so nothing jumps. */
function ShellSkeleton() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[360px_1fr] gap-1.5 pb-1.5 max-lg:grid-cols-1 min-[1440px]:grid-cols-[380px_1fr]" aria-hidden="true">
      <div className="ws-card max-lg:hidden" />
      <div className="grid grid-cols-[minmax(0,1fr)_36%] gap-1.5 max-lg:grid-cols-1">
        <div className="ws-card grid grid-cols-[192px_1fr] max-lg:hidden">
          <div className="border-r border-border" />
        </div>
        <div className="ws-card" />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Mobile: one panel at a time, all mounted; a gliding tab pill and a mini composer
   --------------------------------------------------------------------------- */

function MobileBody({ tab, hosts, aiReady, running }: { tab: MobileTab; hosts: Hosts | null; aiReady: boolean; running: boolean }) {
  const panel = (id: MobileTab, node: React.ReactNode, className?: string) => (
    <div id={`ws-mobile-${id}`} role="tabpanel" aria-labelledby={`ws-mtab-${id}`} className={cn("ws-mobile-panel min-h-0 flex-1", className)} hidden={tab !== id} inert={tab !== id}>
      {node}
    </div>
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col pb-1.5">
      {panel(
        "chat",
        <div className="ws-card h-full">
          <Slot host={hosts?.chat} />
        </div>,
      )}
      {panel(
        "files",
        <div className="ws-card h-full">
          <Slot host={hosts?.explorer} />
        </div>,
      )}
      {panel(
        "code",
        <div className="ws-card h-full">
          <Slot host={hosts?.editor} />
        </div>,
      )}
      {panel(
        "preview",
        <div className="relative flex h-full flex-col gap-1.5">
          <div className="ws-card min-h-0 flex-1">
            <Slot host={hosts?.preview} />
          </div>
          <MiniComposer disabled={!aiReady} running={running} />
        </div>,
      )}
      {panel("logs", <Slot host={hosts?.dock} />)}
    </div>
  );
}

/** Iterate without leaving the preview: the text goes to the agent (queued if a run is active). */
function MiniComposer({ disabled, running }: { disabled: boolean; running: boolean }) {
  const [text, setText] = useState("");
  return (
    <form
      className="glass flex shrink-0 items-center gap-2 rounded-2xl border border-border-strong p-1.5 pl-3.5 shadow-xl"
      onSubmit={(e) => {
        e.preventDefault();
        const t = text.trim();
        if (!t || disabled) return;
        emit("codexa:ai-send", { text: t, mode: "build" });
        setText("");
      }}
    >
      <label htmlFor="mini-composer" className="sr-only">
        Ask the agent to change the app
      </label>
      <input
        id="mini-composer"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        placeholder={disabled ? "Chat turns on once AI is configured" : running ? "Queue the next change…" : "Describe a change…"}
        className="h-9 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        maxLength={8000}
      />
      <button type="submit" disabled={disabled || !text.trim()} aria-label="Send to the agent" className="ws-send inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-25">
        <ArrowUp className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}

function MobileNav({ tab, onChange, previewBadge, problems, agentRunning }: { tab: MobileTab; onChange: (t: MobileTab) => void; previewBadge: boolean; problems: number; agentRunning: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const glide = useGlide(ref, { selector: '[role="tab"][aria-selected="true"]' });
  const items: [MobileTab, string, typeof MessageSquare][] = [
    ["chat", "Agent", MessageSquare],
    ["files", "Files", Files],
    ["code", "Code", Code2],
    ["preview", "Preview", Monitor],
    ["logs", "Terminal", TerminalSquare],
  ];
  // WAI-ARIA tabs: one tab stop; Left/Right (wrapping), Home and End move and select.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = items.findIndex(([id]) => id === tab);
    const next = e.key === "ArrowRight" ? (i + 1) % items.length : e.key === "ArrowLeft" ? (i - 1 + items.length) % items.length : e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    const id = items[next][0];
    onChange(id);
    document.getElementById(`ws-mtab-${id}`)?.focus();
  };
  return (
    <nav className="shrink-0 px-1.5 pb-[max(env(safe-area-inset-bottom),6px)]" aria-label="Workspace panels">
      <div ref={ref} role="tablist" aria-label="Workspace panels" onKeyDown={onKeyDown} className="glass relative flex rounded-2xl border border-border p-1 shadow-lg">
        <GlideIndicator ref={glide} className="inset-y-1 rounded-xl bg-muted shadow-[inset_0_0_0_1px_var(--border)]" />
        {items.map(([id, label, Icon]) => (
          <button
            key={id}
            id={`ws-mtab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`ws-mobile-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => onChange(id)}
            data-no-ripple
            className={cn("relative z-[1] flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", tab === id ? "text-foreground" : "text-muted-foreground")}
          >
            <span className="relative">
              <Icon className="size-[18px]" aria-hidden="true" />
              {id === "preview" && previewBadge ? <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-card" aria-label="New changes" role="img" /> : null}
              {id === "chat" && agentRunning ? <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-card" aria-label="Agent working" role="img" /> : null}
              {id === "logs" && problems ? <span className="absolute -right-1.5 -top-1 rounded-full bg-danger px-1 font-mono text-[9px] leading-[14px] text-background">{problems}</span> : null}
            </span>
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
