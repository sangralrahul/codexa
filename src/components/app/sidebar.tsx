"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, ChevronDown, Compass, CreditCard, FolderGit2, FolderKanban, Gauge, Home, LayoutTemplate, Plus, Rocket, Settings, Shield, UserPlus, Users, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { UserMenu } from "./user-menu";
import { ProjectThumb } from "./project-thumb";
import { KeyHint } from "./hotkeys";
import { shortAgo, UsageBar } from "./grid-bits";

export type SidebarWorkspace = { id: string; name: string; slug: string; role: string; plan: string };
/** Plan counters: counts from the database, limits from the plan config (-1 = unlimited). */
export type SidebarUsage = { plan: string; projects: number; projectLimit: number; members: number; memberLimit: number; ai: number; aiLimit: number };
export type SidebarUser = { name: string; email: string; avatarUrl: string | null };
/** A recent project: its template (for the thumbnail) and whether its preview is running right now (DB row). */
export type SidebarProject = { id: string; name: string; templateId: string | null; templateName: string | null; framework: string; running: boolean; workspaceName: string; updatedAt: string };
/** What the next plan up adds, shown on the upgrade entry (from the plan config, never invented). */
export type SidebarUpsell = { plan: string; points: string[] } | null;
/** Package version and which capabilities this server has configured. */
export type SidebarBuild = { version: string; env: "development" | "production" | "test"; runner: boolean; ai: boolean; aiMock: boolean };

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean; keys?: string[]; also?: string[]; except?: string[]; external?: boolean };

/** The tab row (d01 "Monochrome Grid"): the everyday destinations. */
export const TABS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: Home, exact: true, keys: ["G", "H"] },
  { href: "/projects", label: "Projects", icon: FolderKanban, keys: ["G", "P"] },
  { href: "/dashboard/deployments", label: "Deployments", icon: Rocket },
  { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate, keys: ["G", "T"] },
  { href: "/settings/members", label: "Members", icon: UserPlus },
  { href: "/settings/usage", label: "Usage", icon: Gauge, also: ["/settings/billing"] },
  { href: "/settings", label: "Settings", icon: Settings, keys: ["G", "S"], except: ["/settings/members", "/settings/usage", "/settings/billing"] },
];
/** Less-used destinations, in the tab row's "More" menu (and the phone drawer). */
const MORE: NavItem[] = [
  { href: "/dashboard/shared", label: "Shared with me", icon: Users },
  { href: "/dashboard/github", label: "GitHub", icon: FolderGit2 },
  { href: "/showcase", label: "Community", icon: Compass },
  { href: "/settings/billing", label: "Billing and plans", icon: CreditCard },
  { href: "/docs", label: "Documentation", icon: BookOpen, external: true },
];
const ADMIN: NavItem = { href: "/admin", label: "Admin", icon: Shield };

const under = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");
function isActive(pathname: string, item: NavItem) {
  if ((item.except ?? []).some((x) => under(pathname, x))) return false;
  if (item.exact ? pathname === item.href : under(pathname, item.href)) return true;
  return (item.also ?? []).some((x) => under(pathname, x));
}

function moreItems(isStaff: boolean) {
  return isStaff ? [...MORE, ADMIN] : MORE;
}

/**
 * The tab row under the top bar: Overview, Projects, Deployments, Templates, Members, Usage,
 * Settings, then "More" for the rest. The active tab has a 2px underline; the row scrolls inside
 * itself on narrow screens.
 */
export function AppTabs({ isStaff }: { isStaff: boolean }) {
  const pathname = usePathname();
  const more = moreItems(isStaff);
  // Billing has its own tab (Usage), so it never lights "More".
  const moreCurrent = more.find((m) => m.href !== "/settings/billing" && isActive(pathname, m));
  return (
    <nav aria-label="Workspace" className="app-tabs px-2 sm:px-4">
      {TABS.map((t) => {
        const current = isActive(pathname, t);
        return (
          <Link key={t.href} href={t.href} aria-current={current ? "page" : undefined} className="app-tab" title={t.keys ? `${t.label} (${t.keys.join(" then ")})` : undefined}>
            {t.label}
          </Link>
        );
      })}
      <DropdownMenu>
        <DropdownMenuTrigger className="app-tab outline-none" data-current={moreCurrent ? "true" : undefined}>
          {moreCurrent ? moreCurrent.label : "More"}
          <ChevronDown className="size-3.5" aria-hidden="true" />
          {moreCurrent ? <span className="sr-only"> (current page). More pages</span> : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {more.map((m) => (
            <DropdownMenuItem key={m.href} asChild>
              <Link href={m.href} aria-current={isActive(pathname, m) ? "page" : undefined}>
                <m.icon aria-hidden="true" /> {m.label}
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/status">
              <Activity aria-hidden="true" /> System status
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}

/**
 * The phone/tablet navigation drawer (below 768px the tab row still scrolls, but the drawer also
 * carries recent projects, the plan and the build line that the old sidebar showed).
 */
export function NavDrawer({
  workspaces,
  currentId,
  isStaff,
  user,
  usage,
  recent,
  upsell,
  build,
  canCreate,
  onNavigate,
}: {
  workspaces: SidebarWorkspace[];
  currentId: string | null;
  isStaff: boolean;
  user: SidebarUser;
  usage: SidebarUsage | null;
  recent: SidebarProject[];
  upsell: SidebarUpsell;
  build: SidebarBuild | null;
  canCreate: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const items = [...TABS, ...moreItems(isStaff)];
  const planName = usage ? usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1) : "";
  const row =
    "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[14px] text-muted-foreground outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring aria-[current=page]:bg-surface-2 aria-[current=page]:text-foreground";
  return (
    <div className="app-grid flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
        <Link href="/dashboard" onClick={onNavigate} aria-label="Codexa home" className="flex size-8 items-center justify-center rounded-md">
          <LogoMark size={22} />
        </Link>
        <span className="app-slash" aria-hidden="true">
          /
        </span>
        <WorkspaceSwitcher workspaces={workspaces} currentId={currentId} variant="bar" onNavigate={onNavigate} className="min-w-0 flex-1" />
        <button type="button" onClick={onNavigate} aria-label="Close navigation" className="app-btn app-btn--icon shrink-0 border-transparent">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <nav aria-label="All pages" className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {canCreate ? (
          <Link href="/new-project" onClick={onNavigate} className="app-btn app-btn--primary mb-3 w-full">
            <Plus className="size-4" aria-hidden="true" /> New project
          </Link>
        ) : null}
        <ul className="space-y-px">
          {items.map((it) => (
            <li key={it.href}>
              <Link href={it.href} onClick={onNavigate} aria-current={isActive(pathname, it) ? "page" : undefined} className={row}>
                <it.icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="flex-1 truncate">{it.label}</span>
                {it.keys ? <KeyHint keys={it.keys} className="[@media(hover:none)]:hidden" /> : null}
              </Link>
            </li>
          ))}
        </ul>
        <p className="app-dim mb-1 mt-5 px-2.5 font-mono text-[11px] uppercase tracking-[0.05em]">Recent</p>
        {recent.length ? (
          <ul className="space-y-px">
            {recent.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} onClick={onNavigate} className={cn(row, "text-[13px]")}>
                  <ProjectThumb templateId={p.templateId} framework={p.framework} size="sm" />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {p.running ? (
                    <>
                      <span className="app-dot" data-tone="ok" aria-hidden="true" />
                      <span className="sr-only">Preview running</span>
                    </>
                  ) : null}
                  <time dateTime={p.updatedAt} className="app-mono app-dim text-[11px]" suppressHydrationWarning>
                    {shortAgo(p.updatedAt)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-2.5 py-1 text-xs text-muted-foreground">Projects you open appear here.</p>
        )}
      </nav>
      <div className="shrink-0 space-y-3 border-t border-border px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
        {usage ? (
          <div className="app-box">
            <div className="app-box__head">
              <Link href="/settings/usage" onClick={onNavigate}>
                {planName} plan
              </Link>
              {upsell ? (
                <Link href="/settings/billing" onClick={onNavigate} className="!text-foreground underline underline-offset-4" title={`${upsell.plan}: ${upsell.points.join(" · ")}`}>
                  Upgrade to {upsell.plan}
                </Link>
              ) : (
                <span className="app-mono">
                  {usage.members} / {usage.memberLimit < 0 ? "Unlimited" : usage.memberLimit} seats
                </span>
              )}
            </div>
            <div className="space-y-3 px-3.5 py-3">
              <UsageBar label="Projects" used={usage.projects} limit={usage.projectLimit} />
              <UsageBar label="AI requests" used={usage.ai} limit={usage.aiLimit} metered />
            </div>
          </div>
        ) : null}
        <UserMenu user={user} variant="row" side="top" align="start" />
        {build ? <BuildLine build={build} onNavigate={onNavigate} /> : null}
      </div>
    </div>
  );
}

/**
 * Package version, environment and whether a runner and an AI provider are configured on this
 * server (facts from the environment, not a probe), linking to the status page.
 */
export function BuildLine({ build, onNavigate, className }: { build: SidebarBuild; onNavigate?: () => void; className?: string }) {
  const parts = [build.runner ? "Runner on" : "No runner", build.aiMock ? "Mock AI" : build.ai ? "AI on" : "No AI"];
  const ready = build.runner && build.ai && !build.aiMock;
  return (
    <p className={cn("app-dim flex items-center gap-1.5 px-1 font-mono text-[11px]", className)} title={`${parts.join(" · ")} · ${build.env}`}>
      <span className="tabular-nums">v{build.version}</span>
      <span aria-hidden="true">·</span>
      <span className="truncate">{build.env === "production" ? "prod" : build.env === "test" ? "test" : "dev"}</span>
      <Link href="/status" onClick={onNavigate} className="ml-auto inline-flex min-w-0 items-center gap-1.5 rounded-md px-1 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        <span className="app-dot size-1.5" data-tone={ready ? "ok" : undefined} aria-hidden="true" />
        <span className="truncate">{parts.join(" · ")}</span>
      </Link>
    </p>
  );
}

