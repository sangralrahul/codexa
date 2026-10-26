"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LifeBuoy, Mail, Menu, Plus, X } from "lucide-react";
import { AppSidebar, type SidebarProject, type SidebarUpsell, type SidebarUsage, type SidebarUser, type SidebarWorkspace } from "./sidebar";
import { LogoMark } from "@/components/logo";
import { Alert } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { ResendVerificationButton } from "@/components/auth/forms";
import { Backdrop } from "@/components/marketing/backdrop";
import { SearchDialog } from "@/components/search/search-dialog";
import { cn } from "@/lib/utils";

/** Page name shown in the top bar breadcrumb, by path prefix (most specific first). */
const TITLES: [string, string][] = [
  ["/dashboard/templates", "Templates"],
  ["/dashboard/shared", "Shared with me"],
  ["/dashboard/github", "GitHub"],
  ["/dashboard", "Home"],
  ["/projects", "Projects"],
  ["/new-project", "New project"],
  ["/import-project", "Import project"],
  ["/connect-github", "Connect GitHub"],
  ["/onboarding", "Get started"],
  ["/settings/billing", "Usage & billing"],
  ["/settings", "Settings"],
];

/** Full-screen routes with their own chrome: the project IDE and first-run onboarding. */
const isFocusRoute = (path: string) => /^\/projects\/[^/]+/.test(path) || path === "/onboarding";

export function AppShell({
  user,
  workspaces,
  currentWorkspaceId,
  isStaff,
  emailVerified,
  usage,
  recent,
  upsell,
  initialCollapsed,
  children,
}: {
  user: SidebarUser;
  workspaces: SidebarWorkspace[];
  currentWorkspaceId: string | null;
  isStaff: boolean;
  emailVerified: boolean;
  usage: SidebarUsage | null;
  recent: SidebarProject[];
  upsell: SidebarUpsell;
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const toggle = () =>
    setCollapsed((c) => {
      // Remembered in a cookie so the server renders the same width (no jump on load).
      document.cookie = `codexa_sidebar=${c ? "expanded" : "collapsed"}; path=/; max-age=31536000; samesite=lax`;
      return !c;
    });
  const pathname = usePathname();
  if (isFocusRoute(pathname)) {
    return (
      <main id="main" className="min-h-dvh bg-background">
        {children}
      </main>
    );
  }
  const title = TITLES.find(([p]) => pathname === p || pathname.startsWith(p + "/"))?.[1];
  const workspace = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];
  const sidebar = (mobile: boolean) => (
    <AppSidebar
      workspaces={workspaces}
      currentId={currentWorkspaceId}
      isStaff={isStaff}
      user={user}
      usage={usage}
      recent={recent}
      upsell={upsell}
      collapsed={mobile ? false : collapsed}
      onToggle={mobile ? undefined : toggle}
      onNavigate={mobile ? () => setOpen(false) : undefined}
    />
  );

  return (
    <div className="flex min-h-screen bg-background">
      <SearchDialog />
      <aside className={cn("hidden shrink-0 border-r border-border bg-surface transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] lg:block", collapsed ? "w-[60px]" : "w-64")}>
        <div className="sticky top-0 h-screen overflow-hidden">{sidebar(false)}</div>
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="animate-fade-in absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 animate-[drawer-in_260ms_cubic-bezier(0.2,0.8,0.2,1)] border-r border-border bg-surface shadow-lg">
            <button type="button" onClick={() => setOpen(false)} className="absolute -right-11 top-3 rounded-md bg-surface p-2 shadow-md hover:bg-muted" aria-label="Close navigation">
              <X className="size-4" />
            </button>
            {sidebar(true)}
          </div>
        </div>
      ) : null}
      <div className="relative isolate flex min-w-0 flex-1 flex-col">
        {/* Ambient live gradient at the top of app pages (the dashboard draws its own, stronger one). */}
        {pathname !== "/dashboard" ? <Backdrop className="-z-10 bottom-auto h-[420px] opacity-60 [mask-image:linear-gradient(to_bottom,#000_20%,transparent)]" /> : null}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/70 bg-background/70 px-4 backdrop-blur-xl sm:px-6">
          <button type="button" onClick={() => setOpen(true)} className="-ml-1 rounded-md p-2 hover:bg-muted lg:hidden" aria-label="Open navigation">
            <Menu className="size-5" />
          </button>
          <Link href="/dashboard" className="lg:hidden" aria-label="Codexa home">
            <LogoMark size={24} />
          </Link>
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex min-w-0 items-center gap-2 text-[13px]">
              {workspace ? (
                <li className="hidden min-w-0 truncate text-muted-foreground sm:block">
                  <Link href="/dashboard" className="transition-colors hover:text-foreground">
                    {workspace.name}
                  </Link>
                </li>
              ) : null}
              {workspace && title ? (
                <li aria-hidden="true" className="hidden text-border-strong sm:block">
                  /
                </li>
              ) : null}
              {title ? (
                <li aria-current="page" className="truncate font-medium">
                  {title}
                </li>
              ) : null}
            </ol>
          </nav>
          <div className="flex items-center gap-1.5">
            <Link href="/support" className={cn(buttonClasses("ghost", "sm"), "hidden rounded-md text-muted-foreground md:inline-flex")}>
              <LifeBuoy className="size-4" aria-hidden="true" /> Help
            </Link>
            {pathname !== "/new-project" ? (
              <Link href="/new-project" className={cn(buttonClasses("secondary", "sm"), "btn-solid hidden rounded-md sm:inline-flex")}>
                <Plus className="size-4" aria-hidden="true" /> New project
              </Link>
            ) : null}
          </div>
        </header>
        {!emailVerified ? (
          <div className="border-b border-border/70 bg-warning/[0.06] backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-[13px] sm:px-6">
              <Mail className="size-4 shrink-0 text-warning" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="font-medium">Verify your email address</span> <span className="text-muted-foreground">({user.email}) to unlock deployments and invitations.</span>
              </span>
              <ResendVerificationButton />
            </div>
          </div>
        ) : null}
        <main id="main" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Standard page width and padding for app pages. */
export function AppPage({ children, className, width = "default" }: { children: React.ReactNode; className?: string; width?: "default" | "narrow" | "wide" }) {
  return <div className={cn("mx-auto w-full px-4 py-8 sm:px-6 lg:px-10 lg:py-10", width === "narrow" ? "max-w-3xl" : width === "wide" ? "max-w-7xl" : "max-w-6xl", className)}>{children}</div>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function NotConfigured({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Alert variant="warning" title={title}>
      {children}
    </Alert>
  );
}
