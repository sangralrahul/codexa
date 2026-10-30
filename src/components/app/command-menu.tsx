"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog as RD } from "radix-ui";
import {
  BookOpen,
  CornerDownLeft,
  CreditCard,
  FileText,
  FolderGit2,
  FolderKanban,
  Home,
  KeyRound,
  Keyboard,
  LayoutTemplate,
  LogOut,
  Monitor,
  Moon,
  Plus,
  Receipt,
  Rocket,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  User,
  UserPlus,
  Users,
  Wand2,
} from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { Avatar } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/misc";
import { GlideIndicator, useGlide } from "@/components/motion/glide";
import { useLaunch } from "@/components/motion/launch";
import { relativeTime } from "@/components/projects/format";
import { createFromPrompt, describeCreateError, type CreateError } from "@/components/projects/create-from-prompt";
import { api } from "@/lib/client/api";
import { clampIdea } from "@/lib/client/pending-idea";
import { cn } from "@/lib/utils";
import { COMMAND_MENU_EVENT, openShortcuts } from "./events";
import { KeyHint } from "./hotkeys";
import { ProjectThumb } from "./project-thumb";

export { openCommandMenu } from "./events";

type Icon = typeof Home;
type Item = {
  id: string;
  group: string;
  label: string;
  /** Right-aligned muted text. */
  hint?: string;
  /** Right-aligned shortcut keys. */
  keys?: string[];
  icon?: Icon;
  thumb?: { templateId: string | null; framework?: string };
  keywords?: string;
  tone?: "build";
  run: () => void;
};
type DocResult = { title: string; href: string; type: string };
export type CommandProject = {
  id: string;
  name: string;
  templateId: string | null;
  framework: string;
  workspaceName: string;
  updatedAt: string;
};
export type CommandTemplate = {
  id: string;
  name: string;
  category: string;
  framework: string;
  frameworkName: string;
};
type ApiProject = {
  id: string;
  name: string;
  templateId: string | null;
  framework: string;
  updatedAt: string;
  lastOpenedAt: string | null;
};

/** Every word of the query must appear in the label, keywords or hint. */
function matches(item: { label: string; keywords?: string; hint?: string }, q: string) {
  if (!q) return true;
  const hay = `${item.label} ${item.keywords ?? ""} ${item.hint ?? ""}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

const DIALOG_ID = "command-menu";
const wordCount = (q: string) => q.split(/\s+/).filter(Boolean).length;

/**
 * App-wide command menu (Ctrl/⌘ K, or the `codexa:command-menu` event): jump to pages and
 * projects, start from a template, run actions, switch workspace or theme, search the docs,
 * and, for a sentence (3+ words) or a query with no match, "Build “…” with Codexa": the same
 * create path as the dashboard composer, with the prompt queued for the editor's AI chat.
 * Combobox + listbox semantics with aria-activedescendant; one highlight glides between rows.
 */
export function CommandMenu({
  workspaces,
  currentWorkspaceId,
  recent,
  templates,
  isStaff,
  buildWorkspaceId,
  defaultTemplate,
}: {
  workspaces: { id: string; name: string; plan: string; role?: string }[];
  currentWorkspaceId: string | null;
  recent: CommandProject[];
  templates: CommandTemplate[];
  isStaff: boolean;
  /** The workspace "Build …" creates in (the current one when the user can edit it). */
  buildWorkspaceId: string | null;
  defaultTemplate: { id: string; name: string; fileCount?: number };
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [projects, setProjects] = useState<CommandProject[] | null>(null);
  const [docs, setDocs] = useState<DocResult[]>([]);
  const [buildError, setBuildError] = useState<CreateError | null>(null);
  const [lastBuild, setLastBuild] = useState("");
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);
  /** Viewers everywhere get no create actions (the hub would only show "No workspace with edit access"). */
  const canCreateAny = workspaces.some((w) => !w.role || w.role !== "viewer");

  const {
    start: launchStart,
    update: launchUpdate,
    add: launchAdd,
    fail: launchFail,
    element: launchElement,
  } = useLaunch({
    title: "Building from your prompt",
    onCancel: () => {
      // Back from a failed launch: reopen the menu with the sentence and the error (Enter retries).
      setQuery(lastBuild);
      setOpen(true);
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(COMMAND_MENU_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(COMMAND_MENU_EVENT, onOpen);
    };
  }, []);

  // All projects of the current workspace, loaded the first time the menu opens.
  useEffect(() => {
    if (!open || projects || !currentWorkspaceId) return;
    let cancelled = false;
    const wsName = currentWorkspace?.name ?? "Workspace";
    api<{ projects: ApiProject[] }>(`/api/v1/projects?workspaceId=${encodeURIComponent(currentWorkspaceId)}`)
      .then((r) => {
        if (cancelled) return;
        setProjects(
          r.projects.map((p) => ({
            id: p.id,
            name: p.name,
            templateId: p.templateId,
            framework: p.framework,
            workspaceName: wsName,
            updatedAt: p.lastOpenedAt ?? p.updatedAt,
          })),
        );
      })
      .catch(() => !cancelled && setProjects([]));
    return () => {
      cancelled = true;
    };
  }, [open, projects, currentWorkspaceId, currentWorkspace?.name]);

  // Documentation results for longer queries (debounced).
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search?${new URLSearchParams({ q })}`, { signal: ctrl.signal });
        if (res.ok) setDocs(((await res.json()) as { results: DocResult[] }).results.slice(0, 5));
      } catch {
        /* aborted or offline: keep the other groups */
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open]);

  const go = useCallback(
    (href: string) => () => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const build = useCallback(
    async (sentence: string) => {
      const text = clampIdea(sentence);
      if (!text || !buildWorkspaceId) return;
      setLastBuild(text);
      setBuildError(null);
      launchStart(document.getElementById(DIALOG_ID), [{ id: "create", label: "Creating project", state: "active" }]);
      setOpen(false);
      try {
        const project = await createFromPrompt({
          workspaceId: buildWorkspaceId,
          text,
          templateId: defaultTemplate.id,
        });
        launchUpdate("create", "done");
        if (typeof defaultTemplate.fileCount === "number")
          launchAdd({
            id: "copy",
            label: `Copied ${defaultTemplate.fileCount} files from ${defaultTemplate.name}`,
            state: "done",
          });
        launchAdd({
          id: "open",
          label: "Opening the editor",
          detail: "Your prompt is waiting in the AI chat",
        });
        router.push(`/projects/${project.id}`);
      } catch (err) {
        const e = describeCreateError(err);
        setBuildError(e);
        launchFail("create", e.message);
      }
    },
    [buildWorkspaceId, defaultTemplate, launchStart, launchUpdate, launchAdd, launchFail, router],
  );

  const items = useMemo<Item[]>(() => {
    const q = query.trim();
    const pool = new Map<string, CommandProject>();
    for (const p of projects ?? []) pool.set(p.id, p);
    for (const p of recent) if (!pool.has(p.id)) pool.set(p.id, p);
    const projectList = q ? [...pool.values()].filter((p) => matches({ label: p.name, keywords: p.workspaceName }, q)).slice(0, 6) : recent.slice(0, 5);
    const projectItems: Item[] = projectList.map((p) => ({
      id: `p-${p.id}`,
      group: q ? "Projects" : "Recent projects",
      label: p.name,
      hint: `${p.workspaceName} · edited ${relativeTime(p.updatedAt)}`,
      thumb: { templateId: p.templateId, framework: p.framework },
      run: go(`/projects/${p.id}`),
    }));

    const templateList = q
      ? templates
          .filter((t) =>
            matches(
              {
                label: t.name,
                keywords: `${t.category} ${t.frameworkName} template starter`,
              },
              q,
            ),
          )
          .slice(0, 4)
      : templates.slice(0, 3);
    const templateItems: Item[] = (canCreateAny ? templateList : []).map((t) => ({
      id: `t-${t.id}`,
      group: "Start from template",
      label: t.name,
      hint: t.frameworkName,
      thumb: { templateId: t.id, framework: t.framework },
      run: go(`/new-project?template=${encodeURIComponent(t.id)}`),
    }));

    const base: Item[] = [
      ...(canCreateAny
        ? [
            {
              id: "new",
              group: "Actions",
              label: "Create new project",
              icon: Plus,
              keys: ["N"],
              keywords: "add start build new",
              run: go("/new-project"),
            },
            {
              id: "import",
              group: "Actions",
              label: "Import from GitHub",
              icon: FolderGit2,
              keywords: "repository clone",
              run: go("/import-project"),
            },
          ]
        : []),
      {
        id: "shortcuts",
        group: "Actions",
        label: "Keyboard shortcuts",
        icon: Keyboard,
        keys: ["?"],
        keywords: "hotkeys keys help",
        run: () => {
          setOpen(false);
          openShortcuts();
        },
      },
      {
        id: "home",
        group: "Go to",
        label: "Home",
        icon: Home,
        keys: ["G", "H"],
        keywords: "dashboard",
        run: go("/dashboard"),
      },
      {
        id: "projects",
        group: "Go to",
        label: "Projects",
        icon: FolderKanban,
        keys: ["G", "P"],
        run: go("/projects"),
      },
      {
        id: "templates",
        group: "Go to",
        label: "Templates",
        icon: LayoutTemplate,
        keys: ["G", "T"],
        keywords: "starter gallery",
        run: go("/dashboard/templates"),
      },
      {
        id: "shared",
        group: "Go to",
        label: "Shared with me",
        icon: Users,
        run: go("/dashboard/shared"),
      },
      {
        id: "github",
        group: "Go to",
        label: "GitHub repositories",
        icon: FolderGit2,
        run: go("/dashboard/github"),
      },
      {
        id: "billing",
        group: "Go to",
        label: "Usage & billing",
        icon: CreditCard,
        keywords: "plan limits",
        run: go("/settings/billing"),
      },
      {
        id: "settings",
        group: "Go to",
        label: "Settings",
        icon: Settings,
        keywords: "workspace preferences",
        run: go("/settings"),
      },
      {
        id: "docs",
        group: "Go to",
        label: "Documentation",
        icon: BookOpen,
        keywords: "help guides",
        run: go("/docs"),
      },
      ...(isStaff
        ? [
            {
              id: "admin",
              group: "Go to",
              label: "Admin",
              icon: Shield,
              keywords: "staff",
              run: go("/admin"),
            },
          ]
        : []),
      {
        id: "s-profile",
        group: "Settings",
        label: "Profile",
        icon: User,
        keywords: "name photo avatar timezone",
        run: go("/settings/profile"),
      },
      {
        id: "s-password",
        group: "Settings",
        label: "Change password",
        icon: KeyRound,
        keywords: "security password",
        run: go("/settings/security#password"),
      },
      {
        id: "s-sessions",
        group: "Settings",
        label: "Signed-in devices",
        icon: Shield,
        keywords: "security sessions sign out devices",
        run: go("/settings/security#sessions"),
      },
      {
        id: "s-members",
        group: "Settings",
        label: "Invite teammate",
        icon: UserPlus,
        keywords: "members team seats share invite",
        run: go("/settings/members#invite"),
      },
      {
        id: "s-invoices",
        group: "Settings",
        label: "Invoices",
        icon: Receipt,
        keywords: "billing receipts payments",
        run: go("/settings/billing#invoices"),
      },
      {
        id: "s-upgrade",
        group: "Settings",
        label: "Upgrade plan",
        icon: Rocket,
        keywords: "billing pro team pricing plan",
        run: go("/settings/billing#plan"),
      },
      ...workspaces
        .filter((w) => w.id !== currentWorkspaceId)
        .map((w) => ({
          id: `ws-${w.id}`,
          group: "Switch workspace",
          label: w.name,
          hint: `${w.role ? `${w.role.charAt(0).toUpperCase()}${w.role.slice(1)} · ` : ""}${w.plan.charAt(0).toUpperCase()}${w.plan.slice(1)}`,
          keywords: "workspace switch team",
          run: () => {
            document.cookie = `codexa_workspace=${w.id}; path=/; max-age=31536000; samesite=lax`;
            setOpen(false);
            router.push("/dashboard");
            router.refresh();
          },
        })),
      ...(["light", "dark", "system"] as const).map((t) => ({
        id: `theme-${t}`,
        group: "Theme",
        label: `${t === "system" ? "Use system" : t === "light" ? "Light" : "Dark"} theme`,
        icon: t === "light" ? Sun : t === "dark" ? Moon : Monitor,
        keywords: "appearance mode colour color",
        run: () => {
          setTheme(t);
          setOpen(false);
        },
      })),
      {
        id: "signout",
        group: "Account",
        label: "Sign out",
        icon: LogOut,
        keywords: "log out logout",
        run: async () => {
          setOpen(false);
          await api("/api/auth/logout", { method: "POST" });
          router.push("/");
          router.refresh();
        },
      },
    ];
    const filtered = base.filter((i) => matches(i, q));
    const docItems: Item[] =
      q.length >= 2
        ? docs.map((d) => ({
            id: `d-${d.href}`,
            group: "Documentation",
            label: d.title,
            hint: d.type,
            icon: FileText,
            run: go(d.href),
          }))
        : [];
    // Without a query: recent projects, a few starters, actions and pages (theme, workspaces, settings and account stay one word away).
    const visible = q ? filtered : filtered.filter((i) => i.group === "Actions" || i.group === "Go to");
    const rest = [...projectItems, ...templateItems.slice(0, q ? 4 : 0), ...visible, ...(q ? [] : templateItems), ...docItems];
    const offerBuild = Boolean(buildWorkspaceId) && q.length >= 3 && (wordCount(q) >= 3 || rest.length === 0);
    const buildItem: Item[] = offerBuild
      ? [
          {
            id: "build",
            group: "Build with AI",
            label: `Build “${q.length > 80 ? `${q.slice(0, 80)}…` : q}” with Codexa`,
            hint: "New project",
            icon: Wand2,
            tone: "build",
            run: () => void build(q),
          },
        ]
      : [];
    return [...buildItem, ...rest];
  }, [query, projects, recent, templates, docs, workspaces, currentWorkspaceId, isStaff, go, router, setTheme, buildWorkspaceId, build, canCreateAny]);

  // Where the highlight starts. "Build" is always the first row when offered; it is pre-selected for a
  // sentence (3+ words) unless a project, template or command matched it, and when nothing else matched.
  // Documentation hits are full-text and loose, so they never win over a sentence.
  const strongMatch = items.some((i) => i.tone !== "build" && i.group !== "Documentation");
  const firstIndex = items[0]?.tone === "build" && items.length > 1 && (strongMatch || wordCount(query.trim()) < 3) ? 1 : 0;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep the highlight inside the new result list
    setActive(firstIndex);
  }, [query, firstIndex]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Home" && e.ctrlKey) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && e.ctrlKey) {
      e.preventDefault();
      setActive(items.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[active]?.run();
    }
  };

  // Group consecutive items under one heading.
  const groups: { name: string; items: { item: Item; index: number }[] }[] = [];
  items.forEach((item, index) => {
    const last = groups.at(-1);
    if (last && last.name === item.group) last.items.push({ item, index });
    else groups.push({ name: item.group, items: [{ item, index }] });
  });

  return (
    <>
      <RD.Root
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setQuery("");
            setBuildError(null);
          }
        }}
      >
        <RD.Portal>
          <RD.Overlay className="cx-overlay fixed inset-0 z-[90] bg-background/50 backdrop-blur-[3px]" />
          <RD.Content
            id={DIALOG_ID}
            aria-describedby={undefined}
            className="cx-dialog e2 fixed left-1/2 top-[12vh] z-[91] flex max-h-[76vh] w-[min(660px,calc(100vw-24px))] -translate-x-1/2 flex-col overflow-hidden rounded-lg shadow-xl"
            onKeyDown={onKeyDown}
          >
            <RD.Title className="sr-only">Command menu</RD.Title>
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search, jump to a page, or describe an app to build…"
                className="h-14 min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-muted-foreground/70 focus:outline-none"
                role="combobox"
                aria-expanded="true"
                aria-controls="command-list"
                aria-autocomplete="list"
                aria-activedescendant={items[active] ? `cmd-${items[active].id}` : undefined}
                aria-label="Command"
                maxLength={2000}
              />
              <Kbd className="border border-border bg-muted">Esc</Kbd>
            </div>
            {buildError ? (
              <div role="alert" className="flex items-start gap-2 border-b border-border bg-danger/[0.06] px-4 py-2.5 text-[13px]">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" aria-hidden="true" />
                <span className="min-w-0 flex-1 text-foreground">
                  {buildError.message}{" "}
                  {buildError.quota ? (
                    <Link href="/settings/billing" onClick={() => setOpen(false)} className="font-medium underline underline-offset-2">
                      View plans
                    </Link>
                  ) : null}
                </span>
              </div>
            ) : null}
            <ResultsViewport active={active}>
              {items.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <p className="text-sm text-muted-foreground">No results for “{query.trim()}”.</p>
                  {!buildWorkspaceId ? <p className="mt-1 text-xs text-foreground-dim">You need a workspace with edit access to build a new project.</p> : null}
                </div>
              ) : (
                groups.map((g) => (
                  <div key={`${g.name}-${g.items[0].index}`} role="group" aria-labelledby={`cmd-g-${g.items[0].index}`}>
                    <p id={`cmd-g-${g.items[0].index}`} className="sticky top-0 z-[2] -mx-2 bg-card/95 px-5 pb-1.5 pt-3 text-xs font-medium text-foreground-dim backdrop-blur-md">
                      {g.name}
                    </p>
                    {g.items.map(({ item: it, index: i }) => {
                      const on = i === active;
                      return (
                        <div
                          key={it.id}
                          id={`cmd-${it.id}`}
                          role="option"
                          aria-selected={on}
                          data-index={i}
                          onMouseMove={() => i !== active && setActive(i)}
                          onClick={() => it.run()}
                          className={cn(
                            "relative z-[1] flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-(--dur-1)",
                            on ? "text-foreground" : "text-foreground/85",
                            it.tone === "build" && "py-2.5",
                          )}
                        >
                          {it.thumb ? (
                            <ProjectThumb templateId={it.thumb.templateId} framework={it.thumb.framework} size="sm" />
                          ) : it.tone === "build" ? (
                            <span
                              aria-hidden="true"
                              className="flex h-7 w-8 shrink-0 items-center justify-center rounded-[8px] bg-primary text-primary-foreground shadow-[0_4px_14px_-6px_var(--brand-glow)]"
                            >
                              <Sparkles className="size-3.5" />
                            </span>
                          ) : it.id.startsWith("ws-") ? (
                            <span className="flex w-8 shrink-0 justify-center">
                              <Avatar name={it.label} seed={it.id.slice(3)} shape="square" size="sm" />
                            </span>
                          ) : it.icon ? (
                            <span className={cn("flex h-7 w-8 shrink-0 items-center justify-center rounded-[8px] border bg-surface transition-colors", on ? "border-border-strong" : "border-border")}>
                              <it.icon className="size-3.5" aria-hidden="true" />
                            </span>
                          ) : null}
                          <span className={cn("min-w-0 flex-1 truncate", it.tone === "build" && "font-medium")}>{it.label}</span>
                          {it.keys ? (
                            <KeyHint keys={it.keys} className="shrink-0" />
                          ) : it.hint ? (
                            <span className="hidden shrink-0 truncate text-xs text-muted-foreground sm:block sm:max-w-[45%]">{it.hint}</span>
                          ) : null}
                          <CornerDownLeft className={cn("size-3.5 shrink-0 text-muted-foreground transition-opacity duration-(--dur-2)", on ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </ResultsViewport>
            <div className="flex items-center gap-4 border-t border-border bg-surface/60 px-4 py-2.5 text-[11.5px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <KeyHint keys={["↑", "↓"]} /> to move
              </span>
              <span className="flex items-center gap-1.5">
                <KeyHint keys={["↵"]} /> to open
              </span>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openShortcuts();
                }}
                className="ml-auto flex items-center gap-1.5 rounded-md px-1 transition-colors hover:text-foreground"
              >
                <KeyHint keys={["?"]} /> Shortcuts
              </button>
            </div>
          </RD.Content>
        </RD.Portal>
      </RD.Root>
      {launchElement}
    </>
  );
}

/**
 * The scrolling result list. Mounted with the dialog, so the glide highlight and the height
 * observer attach to the real element: one highlight moves between rows (M12) and the list
 * height animates as results change (instant when calm).
 */
function ResultsViewport({ active, children }: { active: number; children: React.ReactNode }) {
  const listRef = useRef<HTMLDivElement>(null);
  const glide = useGlide(listRef, {
    selector: '[role="option"][aria-selected="true"]',
    axis: "y",
  });
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);
  return (
    <div className="min-h-0 overflow-hidden transition-[height] duration-(--dur-3) ease-out calm:transition-none" style={height === null ? undefined : { height }}>
      <div ref={listRef} id="command-list" role="listbox" aria-label="Results" className="scrollbar-thin relative max-h-[min(56vh,480px)] overflow-y-auto overscroll-contain px-2 pb-2">
        <GlideIndicator
          ref={glide}
          className="inset-x-2 rounded-md bg-foreground/[0.07] shadow-none before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:rounded-full before:bg-accent before:content-['']"
        />
        {children}
      </div>
    </div>
  );
}
