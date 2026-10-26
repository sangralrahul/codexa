"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CreditCard,
  FolderKanban,
  FolderGit2,
  LayoutDashboard,
  LayoutTemplate,
  Plus,
  Settings,
  Users,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { WorkspaceSwitcher } from "./workspace-switcher";

export type SidebarWorkspace = { id: string; name: string; slug: string; role: string; plan: string };

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/projects", label: "All Projects", icon: FolderKanban },
  { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/dashboard/shared", label: "Shared Projects", icon: Users },
  { href: "/dashboard/github", label: "GitHub Repositories", icon: FolderGit2 },
  { href: "/settings/billing", label: "Usage & Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings, exact: true },
];

export function AppSidebar({
  workspaces,
  currentId,
  isStaff,
  onNavigate,
}: {
  workspaces: SidebarWorkspace[];
  currentId: string | null;
  isStaff: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Logo />
      </div>
      <div className="border-b border-border p-3">
        <WorkspaceSwitcher workspaces={workspaces} currentId={currentId} />
      </div>
      <div className="p-3">
        <Link
          href="/new-project"
          onClick={onNavigate}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="size-4" aria-hidden="true" /> New Project
        </Link>
      </div>
      <nav aria-label="Workspace" className="flex-1 space-y-0.5 overflow-y-auto px-3 scrollbar-thin">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            aria-current={active(it.href, it.exact) ? "page" : undefined}
            className={cn(
              "nav-item flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
              active(it.href, it.exact) && "bg-muted font-medium text-foreground",
            )}
          >
            <it.icon className="size-4 shrink-0" aria-hidden="true" />
            {it.label}
          </Link>
        ))}
        {isStaff ? (
          <Link
            href="/admin"
            onClick={onNavigate}
            className={cn(
              "mt-2 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
              pathname.startsWith("/admin") && "bg-muted font-medium text-foreground",
            )}
          >
            <Shield className="size-4 shrink-0" aria-hidden="true" /> Admin
          </Link>
        ) : null}
      </nav>
      <div className="border-t border-border p-3">
        <Link href="/docs" onClick={onNavigate} className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
          <BookOpen className="size-4" aria-hidden="true" /> Documentation
        </Link>
      </div>
    </div>
  );
}
