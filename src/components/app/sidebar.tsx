"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BookOpen, CreditCard, FolderGit2, FolderKanban, Home, LayoutTemplate, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, Shield, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo";
import { Tooltip } from "@/components/ui/tooltip";
import { openSearch } from "@/components/search/search-dialog";
import { WorkspaceSwitcher, WorkspaceAvatar } from "./workspace-switcher";
import { UserMenu } from "./user-menu";

export type SidebarWorkspace = { id: string; name: string; slug: string; role: string; plan: string };
export type SidebarUsage = { plan: string; projects: number; projectLimit: number };
export type SidebarUser = { name: string; email: string; avatarUrl: string | null };
export type SidebarProject = { id: string; name: string };
/** What the next plan up adds, shown on the upgrade card (from the plan config, never invented). */
export type SidebarUpsell = { plan: string; points: string[] } | null;

const MAIN = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/dashboard/shared", label: "Shared with me", icon: Users },
  { href: "/dashboard/github", label: "GitHub", icon: FolderGit2 },
];
const FOOT = [
  { href: "/settings/billing", label: "Usage & billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings, except: "/settings/billing" },
];

/** Stable colour per project for the small squares in the Recent list. */
const DOTS = ["bg-signal", "bg-success", "bg-warning", "bg-info", "bg-danger", "bg-foreground"];
function dotFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return DOTS[h % DOTS.length];
}

function Row({
  href,
  label,
  icon: Icon,
  current,
  collapsed,
  onNavigate,
  trailing,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  current: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
  trailing?: React.ReactNode;
}) {
  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={current ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        "nav-item group/row flex h-8 items-center gap-2.5 rounded-lg text-[13px] text-muted-foreground transition-colors duration-200 hover:bg-foreground/[0.05] hover:text-foreground",
        collapsed ? "w-9 justify-center" : "px-2.5",
        current && "bg-foreground/[0.07] font-medium text-foreground shadow-[inset_0_0_0_1px_var(--border)]",
      )}
    >
      <Icon className={cn("size-4 shrink-0 transition-transform duration-300 group-hover/row:scale-110", current && "text-foreground")} aria-hidden="true" />
      {collapsed ? null : <span className="flex-1 truncate">{label}</span>}
      {collapsed ? null : trailing}
    </Link>
  );
  return collapsed ? (
    <Tooltip content={label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function Label({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  return collapsed ? <div className="mx-auto my-2 h-px w-6 bg-border" aria-hidden="true" /> : <p className="mb-1 mt-5 px-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">{children}</p>;
}

export function AppSidebar({
  workspaces,
  currentId,
  isStaff,
  user,
  usage,
  recent,
  upsell,
  collapsed = false,
  onToggle,
  onNavigate,
}: {
  workspaces: SidebarWorkspace[];
  currentId: string | null;
  isStaff: boolean;
  user: SidebarUser;
  usage: SidebarUsage | null;
  recent: SidebarProject[];
  upsell: SidebarUpsell;
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean, except?: string) =>
    !(except && (pathname === except || pathname.startsWith(except + "/"))) && (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  const workspace = workspaces.find((w) => w.id === currentId) ?? workspaces[0];
  const limited = usage && usage.projectLimit > 0;
  const pct = limited ? Math.min(100, Math.round((usage.projects / usage.projectLimit) * 100)) : 0;

  return (
    <div className="relative flex h-full flex-col">
      {/* Soft light at the top of the rail. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_oklab,var(--signal)_10%,transparent),transparent_70%)]" />

      <div className={cn("relative flex h-14 items-center", collapsed ? "justify-center" : "justify-between px-3.5")}>
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 rounded-md transition-opacity hover:opacity-85" aria-label="Codexa home">
          <LogoMark size={26} />
          {collapsed ? null : <span className="text-[13px] font-semibold uppercase tracking-[0.2em]">Codexa</span>}
        </Link>
        {onToggle && !collapsed ? (
          <Tooltip content="Collapse sidebar" side="right">
            <button type="button" onClick={onToggle} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground" aria-label="Collapse sidebar">
              <PanelLeftClose className="size-4" />
            </button>
          </Tooltip>
        ) : null}
      </div>

      <div className={cn("relative space-y-1.5", collapsed ? "flex flex-col items-center px-2" : "px-3")}>
        {collapsed ? (
          <>
            {workspace ? (
              <Tooltip content={`${workspace.name} · ${workspace.plan} plan`} side="right">
                <Link href="/settings/workspace" aria-label={`Workspace: ${workspace.name}`} className="rounded-lg p-1.5 hover:bg-foreground/[0.06]">
                  <WorkspaceAvatar name={workspace.name} className="size-7" />
                </Link>
              </Tooltip>
            ) : null}
            {onToggle ? (
              <Tooltip content="Expand sidebar" side="right">
                <button type="button" onClick={onToggle} className="rounded-lg p-2 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground" aria-label="Expand sidebar">
                  <PanelLeftOpen className="size-4" />
                </button>
              </Tooltip>
            ) : null}
          </>
        ) : (
          <div className="rounded-xl border border-border bg-background/50 p-1 shadow-[inset_0_1px_0_0_var(--hairline)]">
            <WorkspaceSwitcher workspaces={workspaces} currentId={currentId} />
          </div>
        )}
      </div>

      <div className={cn("relative mt-3 space-y-1.5", collapsed ? "flex flex-col items-center px-2" : "px-3")}>
        <Tooltip content="New project" side="right">
          <Link
            href="/new-project"
            onClick={onNavigate}
            aria-label={collapsed ? "New project" : undefined}
            className={cn("btn-solid group/new flex h-9 items-center gap-2 rounded-lg text-[13px] font-medium", collapsed ? "w-9 justify-center" : "w-full px-3")}
          >
            <Plus className="size-4 transition-transform duration-300 group-hover/new:rotate-90" aria-hidden="true" />
            {collapsed ? null : <span className="flex-1">New project</span>}
          </Link>
        </Tooltip>
        <button
          type="button"
          onClick={openSearch}
          aria-label="Search documentation"
          className={cn(
            "flex h-8 items-center gap-2.5 rounded-lg text-[13px] text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground",
            collapsed ? "w-9 justify-center" : "w-full border border-border bg-background/40 px-2.5",
          )}
        >
          <Search className="size-4 shrink-0" aria-hidden="true" />
          {collapsed ? null : (
            <>
              <span className="flex-1 text-left">Search docs</span>
              <kbd className="text-[10px]">Ctrl K</kbd>
            </>
          )}
        </button>
      </div>

      <nav aria-label="Workspace" className={cn("relative flex-1 overflow-y-auto pb-3 scrollbar-thin", collapsed ? "flex flex-col items-center px-2" : "px-3")}>
        <Label collapsed={collapsed}>Workspace</Label>
        <div className={cn("space-y-px", collapsed && "flex flex-col items-center")}>
          {MAIN.map((it) => (
            <Row key={it.href} href={it.href} label={it.label} icon={it.icon} collapsed={collapsed} onNavigate={onNavigate} current={isActive(it.href, it.exact)} trailing={it.href === "/projects" && usage ? <span className="text-[11px] tabular-nums text-muted-foreground/80">{usage.projects}</span> : null} />
          ))}
          {isStaff ? <Row href="/admin" label="Admin" icon={Shield} collapsed={collapsed} onNavigate={onNavigate} current={pathname.startsWith("/admin")} /> : null}
        </div>

        {!collapsed ? (
          <>
            <Label collapsed={collapsed}>Recent</Label>
            {recent.length ? (
              <ul className="space-y-px">
                {recent.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} onClick={onNavigate} className="group/rec flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground">
                      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-[3px] transition-transform duration-300 group-hover/rec:scale-125", dotFor(p.id))} />
                      <span className="truncate">{p.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-2.5 py-1 text-xs text-muted-foreground/80">Projects you open appear here.</p>
            )}
          </>
        ) : null}
      </nav>

      <div className={cn("relative space-y-2 border-t border-border/70 py-3", collapsed ? "flex flex-col items-center px-2" : "px-3")}>
        {!collapsed && upsell ? (
          <div className="comet-border">
            <Link href="/pricing" onClick={onNavigate} className="comet-border__inner group/up block overflow-hidden p-3.5">
              <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full bg-signal/20 blur-2xl transition-transform duration-700 group-hover/up:scale-125" />
              <span className="relative flex items-center gap-1.5 text-[13px] font-semibold">
                <Sparkles className="size-3.5 text-signal" aria-hidden="true" /> Upgrade to {upsell.plan}
              </span>
              <span className="relative mt-1.5 block text-[11.5px] leading-relaxed text-muted-foreground">{upsell.points.join(" · ")}</span>
              {limited ? (
                <span className="relative mt-3 block">
                  <span className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Projects</span>
                    <span className="tabular-nums">
                      {usage.projects} / {usage.projectLimit}
                    </span>
                  </span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Projects used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                    <span className={cn("block h-full rounded-full transition-[width] duration-700", pct >= 90 ? "bg-danger" : "bg-signal")} style={{ width: `${pct}%` }} />
                  </span>
                </span>
              ) : null}
            </Link>
          </div>
        ) : null}
        <div className={cn("space-y-px", collapsed && "flex flex-col items-center")}>
          {FOOT.map((it) => (
            <Row key={it.href} href={it.href} label={it.label} icon={it.icon} collapsed={collapsed} onNavigate={onNavigate} current={isActive(it.href, false, "except" in it ? it.except : undefined)} />
          ))}
          <Row href="/docs" label="Documentation" icon={BookOpen} collapsed={collapsed} onNavigate={onNavigate} current={false} trailing={<ArrowUpRight className="size-3.5" aria-hidden="true" />} />
        </div>
        <div className={cn("pt-1", collapsed && "flex justify-center")}>
          <UserMenu user={user} variant={collapsed ? "avatar" : "row"} />
        </div>
      </div>
    </div>
  );
}
