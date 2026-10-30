import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, ChevronsUpDown, Compass, FolderKanban, Home, LayoutTemplate, LogOut, Monitor, Moon, Plus, Search, Settings, Sparkles, Sun, ExternalLink } from "lucide-react";
import { cn } from "../lib/util";
import { Avatar, Kbd, Logo, Menu, MenuItem, MenuSeparator } from "../ui";
import { useApp, type Route } from "./state";
import { applyTheme, getThemeMode, type ThemeMode } from "./theme";
import { CommandPalette } from "./CommandPalette";
import { HomeScreen } from "../screens/Home";
import { ProjectsScreen } from "../screens/Projects";
import { TemplatesScreen } from "../screens/Templates";
import { SettingsScreen } from "../screens/Settings";
import { Workspace } from "../screens/project/Workspace";
import { ProjectThumb } from "../components/ProjectThumb";

const NAV: { name: Route["name"]; label: string; icon: typeof Home; keys: string }[] = [
  { name: "home", label: "Home", icon: Home, keys: "Ctrl 1" },
  { name: "projects", label: "Projects", icon: FolderKanban, keys: "Ctrl 2" },
  { name: "templates", label: "Templates", icon: LayoutTemplate, keys: "Ctrl 3" },
];

export function Shell() {
  const app = useApp();
  const { route } = app;
  const [palette, setPalette] = useState(false);
  const inProject = route.name === "project";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const k = e.key.toLowerCase();
      if (k === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      } else if (k === "n" && !e.shiftKey) {
        e.preventDefault();
        app.go({ name: "home" });
        setTimeout(() => document.getElementById("composer")?.focus(), 50);
      } else if (k === "1" || k === "2" || k === "3") {
        e.preventDefault();
        app.go({ name: NAV[Number(k) - 1].name } as Route);
      } else if (k === ",") {
        e.preventDefault();
        app.go({ name: "settings" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [app]);

  return (
    <div className="flex h-full flex-col">
      <TitleBar onSearch={() => setPalette(true)} />
      <div className="flex min-h-0 flex-1">
        {inProject ? null : <Sidebar />}
        <main className="min-w-0 flex-1">
          <div key={route.name === "project" ? `project:${route.id}` : route.name} className="page-enter h-full">
            {route.name === "home" ? <HomeScreen /> : null}
            {route.name === "projects" ? <ProjectsScreen /> : null}
            {route.name === "templates" ? <TemplatesScreen /> : null}
            {route.name === "settings" ? <SettingsScreen tab={route.tab} /> : null}
            {route.name === "project" ? <Workspace projectId={route.id} initialPrompt={route.prompt} /> : null}
          </div>
        </main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}

function TitleBar({ onSearch }: { onSearch: () => void }) {
  const { route, back, canGoBack } = useApp();
  return (
    <header className="drag relative flex h-11 shrink-0 items-center border-b border-border bg-sidebar pl-3 pr-[150px]">
      <div className="flex w-[212px] shrink-0 items-center gap-2 text-fg">
        <Logo size={18} />
        <span className="text-[13.5px] font-semibold tracking-[-0.01em]">Codexa</span>
        {route.name === "project" && canGoBack ? (
          <button type="button" onClick={back} aria-label="Back" className="no-drag ml-2 flex size-7 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-fg">
            <ArrowLeft className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="flex flex-1 justify-center">
        <button
          type="button"
          onClick={onSearch}
          className="no-drag flex h-7 w-full max-w-[420px] items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-[12.5px] text-dim shadow-sm transition-colors hover:border-border-strong hover:text-muted"
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-left">Search projects and commands</span>
          <Kbd>Ctrl K</Kbd>
        </button>
      </div>
    </header>
  );
}

function Sidebar() {
  const app = useApp();
  const { route, go, projects, workspace, workspaces, setWorkspaceId, user, usage } = app;
  const [theme, setTheme] = useState<ThemeMode>(getThemeMode());
  const recent = (projects ?? []).slice(0, 6);
  const pickTheme = (m: ThemeMode) => {
    setTheme(m);
    void applyTheme(m);
  };

  return (
    <aside className="flex w-[224px] shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="px-3 pt-3">
        <Menu
          align="start"
          width={216}
          trigger={(open, toggle) => (
            <button type="button" onClick={toggle} aria-expanded={open} className="flex h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left hover:bg-surface">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-[12px] font-semibold text-primary-fg">{(workspace?.name ?? "W")[0]?.toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{workspace?.name ?? "Workspace"}</span>
                <span className="block truncate text-[11.5px] capitalize text-muted">{workspace?.plan ?? "free"} plan</span>
              </span>
              <ChevronsUpDown className="size-3.5 text-dim" />
            </button>
          )}
        >
          {(close) => (
            <>
              <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium text-dim">Workspaces</p>
              {workspaces.map((w) => (
                <MenuItem
                  key={w.workspace.id}
                  checked={w.workspace.id === workspace?.id}
                  onSelect={() => {
                    setWorkspaceId(w.workspace.id);
                    close();
                  }}
                >
                  {w.workspace.name}
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuItem
                icon={<ExternalLink />}
                onSelect={() => {
                  void window.codexa.openWeb("/settings/workspaces");
                  close();
                }}
              >
                Manage workspaces
              </MenuItem>
            </>
          )}
        </Menu>
        <button
          type="button"
          onClick={() => {
            go({ name: "home" });
            setTimeout(() => document.getElementById("composer")?.focus(), 50);
          }}
          className="mt-2 flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] font-medium shadow-sm transition-colors hover:border-border-strong"
        >
          <Plus className="size-4" /> New project
          <span className="ml-auto">
            <Kbd>Ctrl N</Kbd>
          </span>
        </button>
      </div>

      <nav className="scroll mt-3 min-h-0 flex-1 px-3" aria-label="Main">
        <ul className="space-y-0.5">
          {NAV.map((n) => {
            const active = route.name === n.name;
            return (
              <li key={n.name}>
                <button
                  type="button"
                  onClick={() => go({ name: n.name } as Route)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors",
                    active ? "bg-card font-medium text-fg shadow-sm ring-1 ring-border" : "text-muted hover:bg-surface hover:text-fg",
                  )}
                >
                  {active ? <span className="absolute -left-3 top-1.5 h-5 w-[3px] rounded-r-full bg-accent" /> : null}
                  <n.icon className={cn("size-4", active ? "text-accent" : "")} />
                  <span className="flex-1 text-left">{n.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <ul className="mt-0.5 space-y-0.5">
          {(
            [
              ["/showcase", "Community", Compass],
              ["/docs", "Help & docs", BookOpen],
            ] as const
          ).map(([path, label, Icon]) => (
            <li key={path}>
              <button type="button" onClick={() => void window.codexa.openWeb(path)} className="group flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] text-muted transition-colors hover:bg-surface hover:text-fg">
                <Icon className="size-4" />
                <span className="flex-1 text-left">{label}</span>
                <ArrowUpRight className="size-3.5 text-dim opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            </li>
          ))}
        </ul>

        <p className="mb-1 mt-5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-dim">Recent</p>
        {recent.length ? (
          <ul className="space-y-0.5">
            {recent.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => go({ name: "project", id: p.id })} className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-[13px] text-muted hover:bg-surface hover:text-fg">
                  <ProjectThumb templateId={p.templateId} name={p.name} className="h-[18px] w-[28px] rounded-[4px]" />
                  <span className="min-w-0 flex-1 truncate text-left">{p.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-2.5 text-[12.5px] text-dim">{projects === null ? "Loading…" : "Projects you open show up here."}</p>
        )}
      </nav>

      {usage && usage.limits.projects > 0 ? <UsageCard usage={usage} /> : null}
      <div className="space-y-0.5 border-t border-border p-3">
        <button
          type="button"
          onClick={() => go({ name: "settings" })}
          aria-current={route.name === "settings" ? "page" : undefined}
          className={cn(
            "flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors",
            route.name === "settings" ? "bg-card font-medium text-fg shadow-sm ring-1 ring-border" : "text-muted hover:bg-surface hover:text-fg",
          )}
        >
          <Settings className="size-4" /> Settings
        </button>
        <Menu
          align="start"
          width={216}
          trigger={(open, toggle) => (
            <button type="button" onClick={toggle} aria-expanded={open} className="flex h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left hover:bg-surface">
              <Avatar name={user.name || user.email} size={26} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{user.name || "You"}</span>
                <span className="block truncate text-[11.5px] text-muted">{user.email}</span>
              </span>
            </button>
          )}
        >
          {(close) => (
            <>
              <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium text-dim">Theme</p>
              {(
                [
                  ["system", "System", <Monitor key="m" />],
                  ["light", "Light", <Sun key="s" />],
                  ["dark", "Dark", <Moon key="d" />],
                ] as const
              ).map(([m, label, icon]) => (
                <MenuItem key={m} icon={icon} checked={theme === m} onSelect={() => pickTheme(m)}>
                  {label}
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuItem
                icon={<Settings />}
                onSelect={() => {
                  go({ name: "settings" });
                  close();
                }}
              >
                Settings
              </MenuItem>
              <MenuItem icon={<LogOut />} onSelect={() => void app.signOut()}>
                Sign out
              </MenuItem>
            </>
          )}
        </Menu>
      </div>
    </aside>
  );
}


function UsageCard({ usage }: { usage: NonNullable<ReturnType<typeof useApp>["usage"]> }) {
  const rows = [
    { label: "Projects", used: usage.counts.projects, limit: usage.limits.projects },
    { label: "AI requests", used: usage.used.ai_request ?? 0, limit: usage.limits.aiRequestsPerMonth },
  ].filter((r) => r.limit > 0 && r.limit < 1e9);
  const paid = usage.plan !== "free";
  return (
    <div className="mx-3 mb-3 rounded-xl border border-border bg-card p-3 card-edge">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold capitalize">{usage.plan} plan</span>
        {paid ? null : (
          <button type="button" onClick={() => void window.codexa.openWeb("/settings/billing")} className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent hover:underline">
            <Sparkles className="size-3" /> Upgrade
          </button>
        )}
      </div>
      <div className="mt-2.5 space-y-2.5">
        {rows.map((r) => {
          const pct = Math.min(100, (r.used / r.limit) * 100);
          return (
            <div key={r.label}>
              <div className="flex justify-between text-[11.5px] text-muted">
                <span>{r.label}</span>
                <span className="tabular-nums">
                  {r.used.toLocaleString()} / {r.limit.toLocaleString()}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface">
                <div className={cn("h-full rounded-full", pct > 90 ? "bg-danger" : pct > 70 ? "bg-warning" : "bg-accent")} style={{ width: `${Math.max(pct, 2)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
