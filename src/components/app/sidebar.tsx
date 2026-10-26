"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BookOpen, CreditCard, FolderGit2, FolderKanban, Home, LayoutTemplate, Plus, Settings, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { UserMenu } from "./user-menu";

export type SidebarWorkspace = { id: string; name: string; slug: string; role: string; plan: string };
export type SidebarUsage = { plan: string; projects: number; projectLimit: number };
export type SidebarUser = { name: string; email: string; avatarUrl: string | null };

const GROUPS = [
  {
    label: "Build",
    items: [
      { href: "/dashboard", label: "Home", icon: Home, exact: true },
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
      { href: "/dashboard/shared", label: "Shared with me", icon: Users },
      { href: "/dashboard/github", label: "GitHub", icon: FolderGit2 },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/settings/billing", label: "Usage & billing", icon: CreditCard },
      { href: "/settings", label: "Settings", icon: Settings, exact: false, except: "/settings/billing" },
    ],
  },
] as const;

function NavLink({ href, label, icon: Icon, current, onNavigate }: { href: string; label: string; icon: typeof Home; current: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={current ? "page" : undefined}
      className={cn(
        "nav-item flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        current && "bg-muted font-medium text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </Link>
  );
}

export function AppSidebar({
  workspaces,
  currentId,
  isStaff,
  user,
  usage,
  onNavigate,
}: {
  workspaces: SidebarWorkspace[];
  currentId: string | null;
  isStaff: boolean;
  user: SidebarUser;
  usage: SidebarUsage | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean, except?: string) =>
    !(except && (pathname === except || pathname.startsWith(except + "/"))) && (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  const limited = usage && usage.projectLimit > 0;
  const pct = limited ? Math.min(100, Math.round((usage.projects / usage.projectLimit) * 100)) : 0;
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-1 border-b border-border px-2.5">
        <Link href="/dashboard" onClick={onNavigate} aria-label="Codexa home" className="rounded-md p-1 transition-opacity hover:opacity-80">
          <LogoMark size={26} />
        </Link>
        <span aria-hidden="true" className="text-lg font-light text-border-strong">
          /
        </span>
        <div className="min-w-0 flex-1">
          <WorkspaceSwitcher workspaces={workspaces} currentId={currentId} />
        </div>
      </div>

      <div className="px-3 pb-2 pt-3">
        <Link
          href="/new-project"
          onClick={onNavigate}
          className="btn-solid flex h-9 w-full items-center gap-2 rounded-lg px-3 text-[13px] font-medium"
        >
          <Plus className="size-4" aria-hidden="true" />
          <span className="flex-1">New project</span>
        </Link>
      </div>

      <nav aria-label="Workspace" className="flex-1 space-y-5 overflow-y-auto px-3 py-2 scrollbar-thin">
        {GROUPS.map((g) => (
          <div key={g.label}>
            <p className="mb-1 px-2.5 text-[11px] font-medium text-muted-foreground/80">{g.label}</p>
            <div className="space-y-px">
              {g.items.map((it) => (
                <NavLink
                  key={it.href}
                  href={it.href}
                  label={it.label}
                  icon={it.icon}
                  onNavigate={onNavigate}
                  current={isActive(it.href, "exact" in it ? it.exact : false, "except" in it ? it.except : undefined)}
                />
              ))}
              {g.label === "Workspace" && isStaff ? <NavLink href="/admin" label="Admin" icon={Shield} current={pathname.startsWith("/admin")} onNavigate={onNavigate} /> : null}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-border p-3">
        {usage ? (
          <Link href="/settings/billing" onClick={onNavigate} className="block rounded-lg border border-border bg-background/60 p-3 transition-colors hover:border-border-strong">
            <span className="flex items-center justify-between text-[12px]">
              <span className="font-medium">{usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1)} plan</span>
              {usage.plan === "free" ? <span className="text-signal">Upgrade</span> : <ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden="true" />}
            </span>
            <span className="mt-2 block text-[11px] text-muted-foreground">
              {usage.projects} of {limited ? usage.projectLimit : "unlimited"} projects
            </span>
            {limited ? (
              <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Projects used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                <span className={cn("block h-full rounded-full transition-[width] duration-700", pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-warning" : "bg-foreground")} style={{ width: `${pct}%` }} />
              </span>
            ) : null}
          </Link>
        ) : null}
        <Link href="/docs" onClick={onNavigate} className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <BookOpen className="size-4" aria-hidden="true" /> <span className="flex-1">Documentation</span>
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
        <UserMenu user={user} variant="row" />
      </div>
    </div>
  );
}
