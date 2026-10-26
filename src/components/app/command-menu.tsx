"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog as RD } from "radix-ui";
import {
  ArrowRight,
  BookOpen,
  CornerDownLeft,
  CreditCard,
  FileText,
  FolderGit2,
  FolderKanban,
  FolderOpen,
  Home,
  LayoutTemplate,
  LogOut,
  Monitor,
  Moon,
  Plus,
  Search,
  Settings,
  Shield,
  Sun,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/utils";

const OPEN_EVENT = "codexa:command-menu";
export function openCommandMenu() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

type Item = { id: string; group: string; label: string; hint?: string; icon: typeof Home; keywords?: string; run: () => void };
type DocResult = { title: string; href: string; type: string };

/** Every word of the query must appear in the label or keywords. */
function matches(item: Pick<Item, "label" | "keywords" | "hint">, q: string) {
  if (!q) return true;
  const hay = `${item.label} ${item.keywords ?? ""} ${item.hint ?? ""}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

/**
 * App-wide command menu (Ctrl/⌘ K): jump to pages and projects, run actions,
 * switch workspace or theme, and search the docs, all from the keyboard.
 */
export function CommandMenu({
  workspaces,
  currentWorkspaceId,
  recent,
  isStaff,
}: {
  workspaces: { id: string; name: string; plan: string }[];
  currentWorkspaceId: string | null;
  recent: { id: string; name: string }[];
  isStaff: boolean;
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [projects, setProjects] = useState<{ id: string; name: string }[] | null>(null);
  const [docs, setDocs] = useState<DocResult[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  // All projects of the current workspace, loaded the first time the menu opens.
  useEffect(() => {
    if (!open || projects || !currentWorkspaceId) return;
    let cancelled = false;
    api<{ projects: { id: string; name: string }[] }>(`/api/v1/projects?workspaceId=${encodeURIComponent(currentWorkspaceId)}`)
      .then((r) => !cancelled && setProjects(r.projects.map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => !cancelled && setProjects([]));
    return () => {
      cancelled = true;
    };
  }, [open, projects, currentWorkspaceId]);

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

  const items = useMemo<Item[]>(() => {
    const q = query.trim();
    const projectList = (projects ?? recent).filter((p) => matches({ label: p.name }, q)).slice(0, q ? 8 : 5);
    const base: Item[] = [
      { id: "new", group: "Actions", label: "Create new project", icon: Plus, keywords: "add start build", run: go("/new-project") },
      { id: "import", group: "Actions", label: "Import from GitHub", icon: FolderGit2, keywords: "repository clone", run: go("/import-project") },
      { id: "invite", group: "Actions", label: "Invite a teammate", icon: UserPlus, keywords: "members team share", run: go("/settings/members") },
      { id: "home", group: "Go to", label: "Home", icon: Home, keywords: "dashboard", run: go("/dashboard") },
      { id: "projects", group: "Go to", label: "Projects", icon: FolderKanban, run: go("/projects") },
      { id: "templates", group: "Go to", label: "Templates", icon: LayoutTemplate, keywords: "starter gallery", run: go("/dashboard/templates") },
      { id: "shared", group: "Go to", label: "Shared with me", icon: Users, run: go("/dashboard/shared") },
      { id: "github", group: "Go to", label: "GitHub repositories", icon: FolderGit2, run: go("/dashboard/github") },
      { id: "billing", group: "Go to", label: "Usage & billing", icon: CreditCard, keywords: "plan upgrade invoices limits", run: go("/settings/billing") },
      { id: "settings", group: "Go to", label: "Settings", icon: Settings, keywords: "workspace preferences", run: go("/settings") },
      { id: "profile", group: "Go to", label: "Profile", icon: User, keywords: "name photo avatar timezone", run: go("/settings/profile") },
      { id: "security", group: "Go to", label: "Security", icon: Shield, keywords: "password sessions delete account", run: go("/settings/security") },
      { id: "docs", group: "Go to", label: "Documentation", icon: BookOpen, keywords: "help guides", run: go("/docs") },
      ...(isStaff ? [{ id: "admin", group: "Go to", label: "Admin", icon: Shield, keywords: "staff", run: go("/admin") }] : []),
      ...workspaces
        .filter((w) => w.id !== currentWorkspaceId)
        .map((w) => ({
          id: `ws-${w.id}`,
          group: "Switch workspace",
          label: w.name,
          hint: `${w.plan} plan`,
          icon: FolderOpen,
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
    const projectItems: Item[] = projectList.map((p) => ({ id: `p-${p.id}`, group: q ? "Projects" : "Recent projects", label: p.name, hint: "Open", icon: FolderKanban, run: go(`/projects/${p.id}`) }));
    const docItems: Item[] = q.length >= 2 ? docs.map((d) => ({ id: `d-${d.href}`, group: "Documentation", label: d.title, hint: d.type, icon: FileText, run: go(d.href) })) : [];
    // Without a query: recent projects, actions and pages only (theme, workspaces and account stay one word away).
    const visible = q ? filtered : filtered.filter((i) => i.group === "Actions" || i.group === "Go to");
    return [...projectItems, ...visible, ...docItems];
  }, [query, projects, recent, docs, workspaces, currentWorkspaceId, isStaff, go, router, setTheme]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep the highlight inside the new result list
    setActive(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[active]?.run();
    }
  };

  let lastGroup = "";
  return (
    <RD.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <RD.Portal>
        <RD.Overlay className="animate-fade-in fixed inset-0 z-[90] bg-black/50 backdrop-blur-[3px]" />
        <RD.Content
          aria-describedby={undefined}
          className="glass animate-pop fixed left-1/2 top-[14vh] z-[91] flex max-h-[70vh] w-[min(640px,calc(100vw-24px))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-border shadow-[0_40px_120px_-30px_rgba(0,0,0,0.6)]"
          onKeyDown={onKeyDown}
        >
          <RD.Title className="sr-only">Command menu</RD.Title>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, pages and docs, or type a command…"
              className="h-14 flex-1 bg-transparent text-[15px] placeholder:text-muted-foreground/70 focus:outline-none"
              role="combobox"
              aria-expanded="true"
              aria-controls="command-list"
              aria-activedescendant={items[active] ? `cmd-${items[active].id}` : undefined}
              aria-label="Command"
            />
            <kbd className="text-[10px]">Esc</kbd>
          </div>
          <div ref={listRef} id="command-list" role="listbox" aria-label="Results" className="flex-1 overflow-y-auto p-2 scrollbar-thin">
            {items.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-muted-foreground">No results for “{query.trim()}”.</p>
            ) : (
              items.map((it, i) => {
                const heading = it.group !== lastGroup ? it.group : null;
                lastGroup = it.group;
                return (
                  <div key={it.id}>
                    {heading ? <p className="px-3 pb-1.5 pt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80 first:pt-1">{heading}</p> : null}
                    <div
                      id={`cmd-${it.id}`}
                      role="option"
                      aria-selected={i === active}
                      data-index={i}
                      onMouseMove={() => i !== active && setActive(i)}
                      onClick={() => it.run()}
                      className={cn(
                        "group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150",
                        i === active ? "bg-foreground/[0.07] text-foreground" : "text-foreground/85",
                      )}
                    >
                      <span aria-hidden="true" className={cn("absolute inset-y-2 left-0 w-0.5 rounded-full bg-signal transition-opacity", i === active ? "opacity-100" : "opacity-0")} />
                      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface transition-colors", i === active && "border-border-strong")}>
                        <it.icon className="size-3.5" aria-hidden="true" />
                      </span>
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.hint ? <span className="shrink-0 text-xs capitalize text-muted-foreground">{it.hint}</span> : null}
                      {i === active ? <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : <ArrowRight className="size-3.5 shrink-0 opacity-0" aria-hidden="true" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex items-center gap-4 border-t border-border bg-surface/60 px-4 py-2.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <kbd>↑</kbd>
              <kbd>↓</kbd> to move
            </span>
            <span className="flex items-center gap-1.5">
              <kbd>↵</kbd> to open
            </span>
            <span className="ml-auto">Type “theme”, “workspace” or a project name</span>
          </div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
