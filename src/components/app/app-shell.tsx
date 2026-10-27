"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as RD } from "radix-ui";
import { Menu, Plus, Search, X } from "lucide-react";
import { AppSidebar, type SidebarProject, type SidebarUpsell, type SidebarUsage, type SidebarUser, type SidebarWorkspace } from "./sidebar";
import { LogoMark } from "@/components/logo";
import { Alert, Kbd } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { ResendVerificationButton } from "@/components/auth/forms";
import { CommandMenu, type CommandTemplate } from "./command-menu";
import { openCommandMenu, SHORTCUTS_EVENT } from "./events";
import { ShortcutsSheet, useAppHotkeys } from "./hotkeys";
import { cn } from "@/lib/utils";

/** Breadcrumbs for nested routes only (top-level pages show none). Settings reads "Settings / {Page}". */
const NESTED: [string, string, string, string][] = [
  ["/dashboard/templates", "Home", "/dashboard", "Templates"],
  ["/dashboard/shared", "Home", "/dashboard", "Shared with me"],
  ["/dashboard/github", "Home", "/dashboard", "GitHub"],
  ["/settings/workspaces/new", "Settings", "/settings", "New workspace"],
  ["/settings/billing", "Settings", "/settings", "Billing"],
  ["/settings/usage", "Settings", "/settings", "Usage"],
  ["/settings/members", "Settings", "/settings", "Members"],
  ["/settings/profile", "Settings", "/settings", "Profile"],
  ["/settings/security", "Settings", "/settings", "Security"],
  ["/settings/workspace", "Settings", "/settings", "Workspace"],
  ["/settings/integrations", "Settings", "/settings", "Integrations"],
];

/** Full-screen routes with their own chrome: the project IDE and first-run onboarding. */
const isFocusRoute = (path: string) => /^\/projects\/[^/]+/.test(path) || path === "/onboarding";

const VERIFY_DISMISS_KEY = "codexa:verify-banner-dismissed";
const dismissListeners = new Set<() => void>();
function readDismissed() {
  try {
    return window.sessionStorage.getItem(VERIFY_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Where pages render their top-bar actions (see <TopBarActions>). */
const ActionsSlot = createContext<HTMLElement | null>(null);

/** Renders its children into the app top bar's actions slot (right side), when the shell is present. */
export function TopBarActions({ children }: { children: React.ReactNode }) {
  const slot = useContext(ActionsSlot);
  return slot ? createPortal(children, slot) : null;
}

export type ShellWorkspace = SidebarWorkspace;

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
  templates,
  defaultTemplate,
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
  templates: CommandTemplate[];
  defaultTemplate: { id: string; name: string; fileCount?: number };
  children: React.ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [shortcuts, setShortcuts] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const pathname = usePathname();
  const focus = isFocusRoute(pathname);
  const current = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];
  const canCreate = Boolean(current && current.role !== "viewer");

  const toggle = useCallback(
    () =>
      setCollapsed((c) => {
        // Remembered in a cookie so the server renders the same width (no jump on load).
        document.cookie = `codexa_sidebar=${c ? "expanded" : "collapsed"}; path=/; max-age=31536000; samesite=lax`;
        return !c;
      }),
    [],
  );
  const openShortcuts = useCallback(() => setShortcuts(true), []);
  useAppHotkeys({ enabled: !focus, canCreate, onToggleSidebar: toggle, onShortcuts: openShortcuts });

  // "Keyboard shortcuts" from the command menu or the user menu.
  useEffect(() => {
    const on = () => setShortcuts(true);
    window.addEventListener(SHORTCUTS_EVENT, on);
    return () => window.removeEventListener(SHORTCUTS_EVENT, on);
  }, []);

  // Verify banner: hidden for the rest of this browser session once dismissed.
  const dismissed = useSyncExternalStore(
    (cb) => {
      dismissListeners.add(cb);
      return () => dismissListeners.delete(cb);
    },
    readDismissed,
    () => false,
  );
  const dismissBanner = () => {
    try {
      window.sessionStorage.setItem(VERIFY_DISMISS_KEY, "1");
    } catch {
      /* storage blocked: hide for this page view only */
    }
    dismissListeners.forEach((l) => l());
  };
  const [bannerHidden, setBannerHidden] = useState(false);

  const command = (
    <CommandMenu
      workspaces={workspaces}
      currentWorkspaceId={currentWorkspaceId}
      recent={recent}
      templates={templates}
      isStaff={isStaff}
      buildWorkspaceId={canCreate && current ? current.id : null}
      defaultTemplate={defaultTemplate}
    />
  );

  if (focus) {
    // The IDE and onboarding bring their own chrome (and Monaco owns Ctrl/⌘ K chords there).
    return (
      <main id="main" className="min-h-dvh bg-background">
        {children}
      </main>
    );
  }

  const crumb = NESTED.find(([p]) => pathname === p || pathname.startsWith(p + "/"));
  const sidebarProps = { workspaces, currentId: currentWorkspaceId, isStaff, user, usage, recent, upsell, canCreate };

  return (
    <ActionsSlot.Provider value={slot}>
      <div className="flex min-h-dvh bg-background [--btn-radius:10px]">
        {command}
        <ShortcutsSheet open={shortcuts} onOpenChange={setShortcuts} />
        <aside
          aria-label="Sidebar"
          data-collapsed={collapsed || undefined}
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-r border-border bg-surface transition-[width] duration-[280ms] ease-out calm:transition-none lg:block",
            collapsed ? "w-16" : "w-[248px]",
          )}
        >
          <AppSidebar {...sidebarProps} collapsed={collapsed} onToggle={toggle} />
        </aside>

        <RD.Root open={drawer} onOpenChange={setDrawer}>
          <RD.Portal>
            <RD.Overlay className="cx-overlay fixed inset-0 z-50 bg-background/50 backdrop-blur-[2px] lg:hidden" />
            <RD.Content
              aria-modal="true"
              aria-label="Navigation"
              aria-describedby={undefined}
              data-side="left"
              className="cx-sheet fixed inset-y-0 left-0 z-50 w-[min(300px,calc(100vw-48px))] border-r border-border bg-surface pt-[env(safe-area-inset-top)] shadow-xl outline-none lg:hidden"
            >
              <RD.Title className="sr-only">Navigation</RD.Title>
              <AppSidebar {...sidebarProps} onNavigate={() => setDrawer(false)} onClose={() => setDrawer(false)} />
            </RD.Content>
          </RD.Portal>
        </RD.Root>

        <div className="relative isolate flex min-w-0 flex-1 flex-col">
          <header className="glass sticky top-0 z-40 grid h-[52px] grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-border/70 px-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-1.5">
              <button type="button" onClick={() => setDrawer(true)} className="-ml-1 flex size-9 items-center justify-center rounded-[10px] hover:bg-muted lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" aria-hidden="true" />
              </button>
              <Link href="/dashboard" className="flex size-9 items-center justify-center rounded-[10px] lg:hidden" aria-label="Codexa home">
                <LogoMark size={24} />
              </Link>
              {crumb ? (
                <nav aria-label="Breadcrumb" className="hidden min-w-0 sm:block">
                  <ol className="flex min-w-0 items-center gap-1.5 text-[13px]">
                    <li className="shrink-0">
                      <Link href={crumb[2]} className="rounded-md px-1 text-muted-foreground transition-colors hover:text-foreground">
                        {crumb[1]}
                      </Link>
                    </li>
                    <li aria-hidden="true" className="text-border-strong">
                      /
                    </li>
                    <li aria-current="page" className="truncate px-1 font-medium">
                      {crumb[3]}
                    </li>
                  </ol>
                </nav>
              ) : null}
            </div>

            <button
              type="button"
              onClick={openCommandMenu}
              aria-label="Search or jump to"
              aria-keyshortcuts="Control+K Meta+K"
              className="group/k hidden h-8 w-[min(360px,36vw)] items-center gap-2 rounded-[10px] border border-border bg-background/60 px-2.5 text-[13px] text-muted-foreground shadow-[inset_0_1px_0_var(--hairline)] transition-[border-color,color,background-color] hover:border-border-strong hover:bg-background hover:text-foreground md:flex"
            >
              <Search className="size-3.5" aria-hidden="true" />
              <span className="flex-1 truncate text-left">Search or build anything…</span>
              <Kbd mod className="gap-1 border border-border bg-muted px-1.5">
                K
              </Kbd>
            </button>

            <div className="flex min-w-0 items-center justify-end gap-1.5">
              <button type="button" onClick={openCommandMenu} aria-label="Search or jump to" className="flex size-9 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-muted hover:text-foreground md:hidden">
                <Search className="size-4" aria-hidden="true" />
              </button>
              <div ref={setSlot} className="flex items-center gap-1.5 empty:hidden" />
              {canCreate && pathname !== "/new-project" ? (
                // Only when the sidebar's own button is out of view (collapsed rail or phones), and never twice:
                // /projects shows New project in its toolbar from 1024px up.
                <Link href="/new-project" className={cn(buttonClasses("primary", "sm"), "w-8 px-0 sm:w-auto sm:px-3", collapsed && pathname !== "/projects" ? "inline-flex" : "inline-flex lg:hidden")}>
                  <Plus className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">New project</span>
                  <span className="sr-only sm:hidden">New project</span>
                </Link>
              ) : null}
            </div>
          </header>

          {!emailVerified && !dismissed && !bannerHidden ? (
            <div className="relative z-30 flex min-h-9 flex-wrap items-center gap-x-2.5 border-b border-warning/25 bg-warning/[0.07] px-3 py-1 text-[13px] sm:flex-nowrap sm:px-5 sm:py-0">
              <span className="size-1.5 shrink-0 rounded-full bg-warning shadow-[0_0_0_3px_color-mix(in_oklab,var(--warning)_20%,transparent)]" aria-hidden="true" />
              <p className="min-w-0 flex-1 py-1 sm:truncate sm:py-1.5">
                <span className="font-medium">Verify your email</span>
                <span className="text-muted-foreground"> to unlock deployments.</span>
                <span className="hidden text-foreground-dim md:inline"> We sent a link to {user.email}.</span>
              </p>
              <ResendVerificationButton size="sm" className="order-last h-7 shrink-0 basis-full justify-start border-0 bg-transparent px-1.5 pl-4 text-[13px] sm:order-none sm:basis-auto sm:justify-center sm:pl-1.5 font-medium text-foreground underline decoration-border-strong underline-offset-4 shadow-none hover:bg-transparent hover:decoration-foreground" />
              <button
                type="button"
                onClick={() => {
                  setBannerHidden(true);
                  dismissBanner();
                }}
                aria-label="Hide for this session"
                title="Hide for this session"
                className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-warning/10 hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : null}
          <main id="main" className="app-atmosphere flex-1">
            {children}
          </main>
        </div>
      </div>
    </ActionsSlot.Provider>
  );
}

/** Standard page width and padding for app pages (one width across the app: 1280px). */
export function AppPage({ children, className, width = "default" }: { children: React.ReactNode; className?: string; width?: "default" | "narrow" | "wide" }) {
  return <div className={cn("mx-auto w-full px-4 py-8 sm:px-6 lg:px-10 lg:py-10", width === "narrow" ? "max-w-3xl" : width === "wide" ? "max-w-[1440px]" : "max-w-[1280px]", className)}>{children}</div>;
}

/** App page heading: optional eyebrow, a 28px title (text-app-title), description and actions. */
export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-2 font-mono text-xs text-foreground-dim">{eyebrow}</p> : null}
        <h1 className="text-app-title text-balance">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-pretty text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
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
