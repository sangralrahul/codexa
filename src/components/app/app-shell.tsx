"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AppSidebar, type SidebarWorkspace } from "./sidebar";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Logo } from "@/components/logo";
import { Alert } from "@/components/ui/misc";
import { ResendVerificationButton } from "@/components/auth/forms";

export function AppShell({
  user,
  workspaces,
  currentWorkspaceId,
  isStaff,
  emailVerified,
  children,
}: {
  user: { name: string; email: string; avatarUrl: string | null };
  workspaces: SidebarWorkspace[];
  currentWorkspaceId: string | null;
  isStaff: boolean;
  emailVerified: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:block">
        <div className="sticky top-0 h-screen">
          <AppSidebar workspaces={workspaces} currentId={currentWorkspaceId} isStaff={isStaff} />
        </div>
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-surface shadow-lg">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-2 top-3 rounded-md p-2 hover:bg-muted" aria-label="Close navigation">
              <X className="size-4" />
            </button>
            <AppSidebar workspaces={workspaces} currentId={currentWorkspaceId} isStaff={isStaff} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur">
          <div className="flex items-center gap-2 lg:hidden">
            <button type="button" onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-muted" aria-label="Open navigation">
              <Menu className="size-5" />
            </button>
            <Logo withText={false} />
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </header>
        {!emailVerified ? (
          <div className="border-b border-border bg-warning/5 px-4 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>Verify your email address to unlock deployments and invitations.</span>
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

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
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
