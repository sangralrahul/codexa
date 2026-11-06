import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Code2, ExternalLink, History as HistoryIcon, MessageSquare, MonitorPlay, Play, Rocket, SlidersHorizontal, Square, Terminal } from "lucide-react";
import { aiApi, ApiError, deployApi, projectsApi, type AiStatus, type Deployment, type Project, type Role } from "../../lib/api";
import { cn, relativeTime } from "../../lib/util";
import { Badge, Button, Spinner, Tip, toast } from "../../ui";
import { ProjectThumb } from "../../components/ProjectThumb";
import { useApp } from "../../app/state";
import { Chat } from "./Chat";
import { Preview } from "./Preview";
import { PublishDialog } from "./Publish";
import { HistoryPanel } from "./History";
import { ProjectSettingsPanel } from "./ProjectSettings";
import { ConsolePanel } from "./Console";
import { useRuntime } from "./useRuntime";

// Monaco is large: load it the first time the Code view opens.
const CodeView = lazy(() => import("./CodeView").then((m) => ({ default: m.CodeView })));

const CHAT_KEY = "codexa:chat-width";

export function Workspace({ projectId, initialPrompt }: { projectId: string; initialPrompt?: string }) {
  const { refreshProjects, go } = useApp();
  const [workspaceName, setWorkspaceName] = useState<string>("");
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"preview" | "code">("preview");
  const [codeSeen, setCodeSeen] = useState(false);
  const [filesVersion, setFilesVersion] = useState(0);
  const [publishOpen, setPublishOpen] = useState(false);
  const [panel, setPanel] = useState<"chat" | "history" | "settings">("chat");
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(() => Number(localStorage.getItem(CHAT_KEY)) || 400);
  const [live, setLive] = useState<Deployment | null>(null);
  const runtime = useRuntime(projectId);
  const dragging = useRef(false);

  const refreshLive = useCallback(() => {
    deployApi
      .list(projectId)
      .then((r) => setLive(r.deployments.find((d) => d.status === "live" && d.url) ?? null))
      .catch(() => setLive(null));
  }, [projectId]);
  useEffect(() => {
    refreshLive();
  }, [refreshLive]);

  useEffect(() => {
    projectsApi
      .get(projectId)
      .then((r) => {
        setProject(r.project);
        setRole(r.role);
        setWorkspaceName(r.workspace.name);
        void refreshProjects();
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't open the project"));
  }, [projectId, refreshProjects]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey) return;
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setView("preview");
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        setView("code");
        setCodeSeen(true);
      } else if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        setConsoleOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    aiApi
      .status(projectId)
      .then(setAi)
      .catch(() => setAi(null));
  }, [projectId]);

  const onFilesChanged = useCallback(() => setFilesVersion((v) => v + 1), []);

  // Resizable chat panel.
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      const w = Math.min(640, Math.max(320, e.clientX - 48));
      setChatWidth(w);
    };
    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      setChatWidth((w) => (localStorage.setItem(CHAT_KEY, String(w)), w));
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-[15px] font-semibold">This project couldn&apos;t be opened</p>
          <p className="mt-1 text-[13px] text-muted">{error}</p>
        </div>
      </div>
    );
  }
  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-5" />
      </div>
    );
  }

  const canEdit = role === "owner" || role === "admin" || role === "editor";
  const running = runtime.status === "running";
  const starting = runtime.status === "starting" || (runtime.status === "stopped" && runtime.busy);

  const runtimeDot = running ? "bg-success" : starting ? "pulse bg-warning" : runtime.status === "error" ? "bg-danger" : "bg-dim";
  const runtimeLabel = running ? "Preview running" : starting ? "Starting preview" : runtime.status === "error" ? "Preview stopped with an error" : runtime.status === "unavailable" ? "Previews unavailable" : runtime.status === "loading" ? "Checking preview" : "Preview stopped";
  const openView = (id: "preview" | "code") => {
    setView(id);
    if (id === "code") setCodeSeen(true);
  };

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="relative z-20 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-bg pl-3 pr-3">
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-2 text-[13px]">
          <ProjectThumb templateId={project.templateId} name={project.name} className="h-5 w-8 rounded-[4px] border border-border-strong" />
          <button type="button" onClick={() => go({ name: "projects" })} className="max-w-[180px] shrink truncate rounded-md px-1 py-0.5 text-muted transition-colors hover:text-fg">
            {workspaceName || "Projects"}
          </button>
          <span aria-hidden="true" className="-mx-0.5 text-[15px] font-light text-border-strong">/</span>
          <h1 className="min-w-0 truncate px-1 text-[13.5px] font-semibold tracking-[-0.01em]">{project.name}</h1>
          {!canEdit ? <Badge>View only</Badge> : null}
        </nav>

        <div className="ws-seg shrink-0" role="tablist" aria-label="View">
          {(
            [
              ["preview", "Preview", MonitorPlay, "Ctrl P"],
              ["code", "Code", Code2, "Ctrl E"],
            ] as const
          ).map(([id, label, Icon, keys]) => (
            <Tip key={id} label={`Show ${label.toLowerCase()}`} keys={keys}>
              <button type="button" role="tab" aria-selected={view === id} aria-keyshortcuts={keys.replace(" ", "+")} onClick={() => openView(id)} className="ws-seg__btn min-w-[84px]">
                <Icon /> {label}
              </button>
            </Tip>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
          {running || starting ? (
            <Tip label="Stop the preview">
              <Button size="sm" onClick={() => void runtime.stop()} disabled={runtime.busy} aria-label="Stop preview" className="min-w-[96px]">
                <span className={cn("ws-dot", running ? "bg-success" : "pulse bg-warning")} />
                {running ? "Running" : "Starting"}
                <Square className="!size-3 fill-current text-muted" />
              </Button>
            </Tip>
          ) : (
            <Tip label={runtime.status === "unavailable" ? "Previews are unavailable" : "Start a live preview"}>
              <Button size="sm" onClick={() => void runtime.start()} loading={runtime.busy} disabled={runtime.status === "unavailable" || runtime.status === "loading"} className="min-w-[72px]">
                {runtime.busy ? null : <Play className="!size-3.5" />} Run
              </Button>
            </Tip>
          )}
          <Tip label="Open on the web">
            <button type="button" className="ws-icon" aria-label="Open on the web" onClick={() => void window.codexa.openWeb(`/projects/${project.id}`)}>
              <ExternalLink />
            </button>
          </Tip>
          {live ? (
            <Tip label={`Open ${live.url!.replace(/^https?:\/\//, "")}`} align="end">
              <button
                type="button"
                onClick={() => void window.codexa.openExternal(live.url!)}
                className="hidden h-8 items-center gap-2 rounded-md border border-border px-2.5 text-[12.5px] text-muted transition-colors hover:border-border-strong hover:text-fg lg:inline-flex"
              >
                <span className="ws-dot bg-success" />
                <span className="font-medium text-fg">Live</span>
                <span className="mono text-[11px] text-dim">{relativeTime(live.createdAt)}</span>
              </button>
            </Tip>
          ) : null}
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
          <Button
            variant="accent"
            size="sm"
            className="px-3.5"
            onClick={() => {
              if (!canEdit) return toast.info("View only", "Ask a workspace admin for editor access to publish.");
              setPublishOpen(true);
            }}
          >
            <Rocket className="!size-3.5" /> Publish
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav aria-label="Project tools" className="ws-rail relative z-10">
          {(
            [
              ["chat", "AI chat", MessageSquare],
              ["history", "History", HistoryIcon],
              ["settings", "Project settings", SlidersHorizontal],
            ] as const
          ).map(([id, label, Icon]) => (
            <Tip key={id} label={label} side="right">
              <button type="button" aria-label={label} aria-pressed={panel === id} onClick={() => setPanel(id)} className="ws-rail__btn">
                <Icon />
              </button>
            </Tip>
          ))}
          <span className="mt-auto" />
          <span aria-hidden="true" className="ws-rail__sep" />
          <Tip label="Console" keys="Ctrl J" side="right">
            <button type="button" aria-label="Console" aria-keyshortcuts="Control+J" aria-pressed={consoleOpen} onClick={() => setConsoleOpen((o) => !o)} className="ws-rail__btn">
              <Terminal />
            </button>
          </Tip>
        </nav>
        <section style={{ width: chatWidth }} className="relative shrink-0 border-r border-border bg-card" aria-label="Side panel">
          <div className={cn("absolute inset-0", panel !== "chat" && "invisible")}>
            <Chat projectId={project.id} initialPrompt={initialPrompt} onFilesChanged={onFilesChanged} onOpenHistory={() => setPanel("history")} />
          </div>
          {panel === "history" ? (
            <div className="absolute inset-0">
              <HistoryPanel projectId={project.id} canEdit={canEdit} onRestored={onFilesChanged} />
            </div>
          ) : null}
          {panel === "settings" ? (
            <div className="absolute inset-0">
              <ProjectSettingsPanel projectId={project.id} canEdit={canEdit} onSaved={(p) => (setProject((cur) => (cur ? { ...cur, ...p } : cur)), void refreshProjects())} />
            </div>
          ) : null}
        </section>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat"
          onMouseDown={() => {
            dragging.current = true;
            document.body.style.cursor = "col-resize";
          }}
          className="group relative z-10 -ml-[3px] w-[5px] shrink-0 cursor-col-resize"
        >
          <span aria-hidden="true" className="absolute inset-y-0 left-[2px] w-px transition-colors group-hover:bg-border-strong group-active:bg-fg" />
        </div>
        <div className="-ml-[2px] flex min-w-0 flex-1 flex-col">
          <section className="relative min-h-0 min-w-0 flex-1" aria-label={view === "preview" ? "Preview" : "Code"}>
            <div className={cn("absolute inset-0", view !== "preview" && "invisible")}>
              <Preview projectId={project.id} framework={project.framework} canEdit={canEdit} runtime={runtime} reloadKey={0} onOpenConsole={() => setConsoleOpen(true)} />
            </div>
            {codeSeen ? (
              <div className={cn("absolute inset-0", view !== "code" && "invisible")}>
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center">
                      <Spinner />
                    </div>
                  }
                >
                  <CodeView projectId={project.id} filesVersion={filesVersion} readOnly={!canEdit} />
                </Suspense>
              </div>
            ) : null}
          </section>
          {consoleOpen ? (
            <div className="h-[240px] shrink-0">
              <ConsolePanel projectId={project.id} onClose={() => setConsoleOpen(false)} />
            </div>
          ) : null}
        </div>
      </div>

      <footer className="ws-status" aria-label="Status">
        <button type="button" onClick={() => setConsoleOpen((o) => !o)} className="ws-status__item rounded-sm transition-colors hover:text-fg" aria-label={`${runtimeLabel}. Toggle console`}>
          <span className={cn("ws-dot", runtimeDot)} />
          {runtimeLabel}
        </button>
        <span className="ws-status__item">
          <span className={cn("ws-dot", ai?.configured ? "bg-success" : "bg-dim")} />
          {ai ? (ai.configured ? "AI ready" : "AI not configured") : "Checking AI"}
          {ai?.configured && ai.model ? <span className="mono text-[10.5px] text-dim">{ai.model}</span> : null}
        </span>
        <span className="ws-status__item">{canEdit ? "Changes save to Codexa automatically" : "View only"}</span>
        <span className="ml-auto hidden items-center gap-3 px-2 text-dim xl:flex">
          {(
            [
              ["Ctrl P", "preview"],
              ["Ctrl E", "code"],
              ["Ctrl J", "console"],
              ["Ctrl K", "search"],
            ] as const
          ).map(([k, l]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="mono text-[10.5px] text-muted">{k}</span> {l}
            </span>
          ))}
        </span>
      </footer>

      <PublishDialog projectId={project.id} framework={project.framework} open={publishOpen} onClose={() => setPublishOpen(false)} canPublish={canEdit} onChanged={refreshLive} />
    </div>
  );
}
