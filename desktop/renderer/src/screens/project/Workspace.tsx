import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Code2, ExternalLink, MonitorPlay, Play, Rocket, Square } from "lucide-react";
import { aiApi, ApiError, projectsApi, type AiStatus, type Project, type Role } from "../../lib/api";
import { cn } from "../../lib/util";
import { Badge, Button, Spinner, toast } from "../../ui";
import { useApp } from "../../app/state";
import { Chat } from "./Chat";
import { Preview } from "./Preview";
import { PublishDialog } from "./Publish";
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
  const [chatWidth, setChatWidth] = useState(() => Number(localStorage.getItem(CHAT_KEY)) || 400);
  const runtime = useRuntime(projectId);
  const dragging = useRef(false);

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
      const w = Math.min(640, Math.max(320, e.clientX));
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

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13.5px]">
          <button type="button" onClick={() => go({ name: "projects" })} className="max-w-[180px] truncate text-muted hover:text-fg">
            {workspaceName || "Projects"}
          </button>
          <span className="text-dim">/</span>
          <h1 className="truncate font-semibold tracking-[-0.01em]">{project.name}</h1>
        </nav>
        {!canEdit ? <Badge>View only</Badge> : null}

        <div className="mx-auto flex rounded-lg border border-border bg-surface p-0.5" role="tablist" aria-label="View">
          {(
            [
              ["preview", "Preview", MonitorPlay, "Ctrl P"],
              ["code", "Code", Code2, "Ctrl E"],
            ] as const
          ).map(([id, label, Icon, keys]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              title={`${label} (${keys})`}
              onClick={() => {
                setView(id);
                if (id === "code") setCodeSeen(true);
              }}
              className={cn("flex h-7 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-medium transition-colors [&_svg]:size-3.5", view === id ? "bg-card text-fg shadow-sm" : "text-muted hover:text-fg")}
            >
              <Icon /> {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {running || starting ? (
            <Button size="sm" onClick={() => void runtime.stop()} disabled={runtime.busy} aria-label="Stop preview">
              <span className={cn("size-1.5 rounded-full", running ? "bg-success" : "pulse bg-warning")} />
              {running ? "Running" : "Starting"}
              <Square className="!size-3 fill-current text-muted" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => void runtime.start()} loading={runtime.busy} disabled={runtime.status === "unavailable" || runtime.status === "loading"}>
              <Play /> Run
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" aria-label="Open on the web" title="Open on the web" onClick={() => void window.codexa.openWeb(`/projects/${project.id}`)}>
            <ExternalLink />
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={() => {
              if (!canEdit) return toast.info("View only", "Ask a workspace admin for editor access to publish.");
              setPublishOpen(true);
            }}
          >
            <Rocket /> Publish
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section style={{ width: chatWidth }} className="shrink-0 border-r border-border" aria-label="AI chat">
          <Chat projectId={project.id} initialPrompt={initialPrompt} onFilesChanged={onFilesChanged} />
        </section>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat"
          onMouseDown={() => {
            dragging.current = true;
            document.body.style.cursor = "col-resize";
          }}
          className="-ml-1 w-2 shrink-0 cursor-col-resize hover:bg-ring/30"
        />
        <section className="relative min-w-0 flex-1" aria-label={view === "preview" ? "Preview" : "Code"}>
          <div className={cn("absolute inset-0", view !== "preview" && "invisible")}>
            <Preview runtime={runtime} reloadKey={0} />
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
      </div>

      <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-border bg-sidebar px-3 text-[11.5px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", running ? "bg-success" : starting ? "pulse bg-warning" : runtime.status === "error" ? "bg-danger" : "bg-dim")} />
          {running ? "Preview running" : starting ? "Starting preview" : runtime.status === "error" ? "Preview stopped with an error" : runtime.status === "unavailable" ? "Previews unavailable" : "Preview stopped"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", ai?.configured ? "bg-success" : "bg-dim")} />
          {ai ? (ai.configured ? `AI ready${ai.model ? ` · ${ai.model}` : ""}` : "AI not configured") : "Checking AI"}
        </span>
        <span className="ml-auto">{canEdit ? "Changes save to Codexa automatically" : "View only"}</span>
        <span className="text-dim">Ctrl P preview · Ctrl E code · Ctrl K search</span>
      </footer>

      <PublishDialog projectId={project.id} open={publishOpen} onClose={() => setPublishOpen(false)} canPublish={canEdit} />
    </div>
  );
}
