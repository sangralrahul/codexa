"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as RD } from "radix-ui";
import { MailWarning, Menu, Plus, Search } from "lucide-react";
import { AppSidebar, type SidebarProject, type SidebarUpsell, type SidebarUsage, type SidebarUser, type SidebarWorkspace } from "./sidebar";
import { LogoMark } from "@/components/logo";
import { Alert, Kbd } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
/**
 * Session storage normally (verifying is something the user can do, so the reminder comes back
 * next visit). When this server can't send email the user can't act on it, so the dismissal is
 * kept in local storage across visits instead.
 */
function dismissStore(persistent: boolean): Storage {
  return persistent ? window.localStorage : window.sessionStorage;
}
function readDismissed(persistent: boolean) {
  try {
    return dismissStore(persistent).getItem(VERIFY_DISMISS_KEY) === "1";
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
  emailConfigured,
  devMailbox = false,
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
  /** Whether this server can deliver account emails (capabilities.email). When false the banner says so and offers no resend. */
  emailConfigured: boolean;
  /** Development only: unsent emails are readable at /dev/mailbox. */
  devMailbox?: boolean;
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

  // Verify banner: once dismissed, hidden for this browser session (or for good on this device when
  // email isn't configured, since the user can't resolve it).
  const persistDismiss = !emailConfigured;
  const subscribeDismiss = useCallback((cb: () => void) => {
    dismissListeners.add(cb);
    return () => {
      dismissListeners.delete(cb);
    };
  }, []);
  const dismissed = useSyncExternalStore(
    subscribeDismiss,
    () => readDismissed(persistDismiss),
    () => false,
  );
  const dismissLabel = persistDismiss ? "Hide this notice" : "Hide for this session";
  const dismissBanner = () => {
    try {
      dismissStore(persistDismiss).setItem(VERIFY_DISMISS_KEY, "1");
    } catch {
      /* storage blocked: hide for this page view only */
    }
    dismissListeners.forEach((l) => l());
  };
  const [noticeHidden, setNoticeHidden] = useState(false);
  const showVerify = !emailVerified && !dismissed && !noticeHidden;

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
      <div className="flex min-h-dvh bg-background [--btn-radius:6px]">
        {command}
        <ShortcutsSheet open={shortcuts} onOpenChange={setShortcuts} />
        <aside
          aria-label="Sidebar"
          data-collapsed={collapsed || undefined}
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-r border-border bg-surface transition-[width] duration-[280ms] ease-out calm:transition-none lg:block",
            collapsed ? "w-14" : "w-[228px]",
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
          {/* Two columns below md (the centred ⌘K trigger is hidden there), so the actions stay at the right edge. */}
          <header className="sticky top-0 z-40 grid h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/90 px-3 backdrop-blur-sm sm:px-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <div className="flex min-w-0 items-center gap-1.5">
              <button type="button" onClick={() => setDrawer(true)} className="-ml-1 flex size-8 items-center justify-center rounded-md hover:bg-muted lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" aria-hidden="true" />
              </button>
              <Link href="/dashboard" className="flex size-8 items-center justify-center rounded-md lg:hidden" aria-label="Codexa home">
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
              aria-keyshortcuts="Control+K Meta+K"
              className="group/k hidden h-8 w-[min(400px,40vw)] items-center gap-2 rounded-md border border-border bg-card px-2.5 text-[12.5px] text-muted-foreground transition-[border-color,color,background-color] hover:border-border-strong hover:text-foreground md:flex"
            >
              <Search className="size-3.5" aria-hidden="true" />
              <span className="flex-1 truncate text-left">Search or build anything…</span>
              <Kbd mod aria-hidden="true" className="border border-border bg-muted px-1.5">
                K
              </Kbd>
            </button>

            <div className="flex min-w-0 items-center justify-end gap-1.5">
              <button type="button" onClick={openCommandMenu} aria-label="Search or jump to" className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden">
                <Search className="size-4" aria-hidden="true" />
              </button>
              {showVerify ? (
                <VerifyChip
                  email={user.email}
                  emailConfigured={emailConfigured}
                  devMailbox={devMailbox}
                  dismissLabel={dismissLabel}
                  onDismiss={() => {
                    setNoticeHidden(true);
                    dismissBanner();
                  }}
                />
              ) : null}
              <div ref={setSlot} className="flex items-center gap-1.5 empty:hidden" />
              {canCreate && pathname !== "/new-project" ? (
                <>
                  {/* Phones: a quiet outline icon button, so it never outweighs the logo. */}
                  <Link
                    href="/new-project"
                    aria-label="New project"
                    className="flex size-8 items-center justify-center rounded-md border border-border-strong bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:hidden"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </Link>
                  {/* From 640px: only when the sidebar's own button is out of view (collapsed rail or below 1024px), and never
                      twice: /projects shows New project in its toolbar from 1024px up. */}
                  <Link href="/new-project" className={cn(buttonClasses("primary", "sm"), "hidden px-3 sm:inline-flex", !(collapsed && pathname !== "/projects") && "lg:hidden")}>
                    <Plus className="size-4" aria-hidden="true" />
                    New project
                  </Link>
                </>
              ) : null}
            </div>
          </header>

          <main id="main" className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </ActionsSlot.Provider>
  );
}

/**
 * "Email not verified": a small neutral chip in the top bar (not a banner). It opens a popover with
 * the real action: resend the link when this server can send email, otherwise where the status lives
 * and, in development, the mailbox. Hiding it is remembered like the old banner was.
 */
function VerifyChip({ email, emailConfigured, devMailbox, dismissLabel, onDismiss }: { email: string; emailConfigured: boolean; devMailbox: boolean; dismissLabel: string; onDismiss: () => void }) {
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=open]:text-foreground"
        title="Email not verified"
      >
        <MailWarning className="size-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Verify email</span>
        <span className="sr-only sm:hidden">Email not verified</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-24px))] text-[13px] leading-relaxed">
        <p className="font-medium text-foreground">Verify your email to unlock deployments.</p>
        {emailConfigured ? (
          <>
            <p className="mt-1 text-muted-foreground">We sent a link to {email}. Didn&apos;t get it?</p>
            <ResendVerificationButton size="sm" emailConfigured className="mt-3 w-full" />
          </>
        ) : (
          <>
            <p className="mt-1 text-muted-foreground">
              Email delivery isn&apos;t configured on this server, so verification links aren&apos;t sent. Your status is shown in{" "}
              <Link href="/settings/security" className="font-medium text-foreground underline decoration-border-strong underline-offset-4 hover:decoration-foreground">
                Settings › Security
              </Link>
              .
            </p>
            {devMailbox ? (
              <Link href="/dev/mailbox" className="mt-2 inline-block font-medium text-foreground underline decoration-border-strong underline-offset-4 hover:decoration-foreground">
                Open dev mailbox
              </Link>
            ) : null}
          </>
        )}
        <button type="button" onClick={onDismiss} className="mt-3 block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {dismissLabel}
        </button>
      </PopoverContent>
    </Popover>
  );
}

/** Standard page width and padding for app pages (one width across the app: 1280px). */
export function AppPage({ children, className, width = "default" }: { children: React.ReactNode; className?: string; width?: "default" | "narrow" | "wide" }) {
  return <div className={cn("mx-auto w-full px-4 py-5 sm:px-6 lg:px-8 lg:py-6", width === "narrow" ? "max-w-3xl" : width === "wide" ? "max-w-[1440px]" : "max-w-[1280px]", className)}>{children}</div>;
}

/** App page heading: optional eyebrow, a 22px title (text-app-title), description and actions. */
export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-[11.5px] font-medium uppercase tracking-[0.06em] text-foreground-dim">{eyebrow}</p> : null}
        <h1 className="text-app-title text-balance">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-pretty text-[13px] text-muted-foreground">{description}</p> : null}
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
