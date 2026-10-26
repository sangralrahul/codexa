"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Briefcase,
  CreditCard,
  Flag,
  Gauge,
  LifeBuoy,
  ListChecks,
  Menu,
  Rocket,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Backdrop } from "@/components/marketing/backdrop";

export const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: Gauge, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/workspaces", label: "Workspaces", icon: Briefcase },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/ai-health", label: "AI health", icon: Sparkles },
  { href: "/admin/jobs", label: "Jobs", icon: ListChecks },
  { href: "/admin/runtimes", label: "Runtimes", icon: Activity },
  { href: "/admin/deployments", label: "Deployments", icon: Rocket },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/abuse", label: "Abuse reports", icon: ShieldAlert },
  { href: "/admin/audit-logs", label: "Audit logs", icon: ScrollText },
  { href: "/admin/feature-flags", label: "Feature flags", icon: Flag },
  { href: "/admin/showcase", label: "Showcase", icon: Star },
] as const;

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  return (
    <nav aria-label="Admin" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3 scrollbar-thin">
      {ADMIN_NAV.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          onClick={onNavigate}
          aria-current={active(it.href, "exact" in it && it.exact) ? "page" : undefined}
          className={cn(
            "nav-item flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
            active(it.href, "exact" in it && it.exact) && "bg-muted font-medium text-foreground",
          )}
        >
          <it.icon className="size-4 shrink-0" aria-hidden="true" />
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminShell({ user, children }: { user: { name: string; email: string; role: string }; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const side = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Logo />
        <Badge variant="warning">Staff</Badge>
      </div>
      <Nav onNavigate={() => setOpen(false)} />
      <div className="border-t border-border p-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to the app
        </Link>
      </div>
    </div>
  );
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block">
        <div className="sticky top-0 h-screen">{side}</div>
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-surface shadow-lg">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-2 top-3 rounded-md p-2 hover:bg-muted" aria-label="Close navigation">
              <X className="size-4" />
            </button>
            {side}
          </div>
        </div>
      ) : null}
      <div className="relative isolate flex min-w-0 flex-1 flex-col">
        <Backdrop still className="-z-10 bottom-auto h-80 opacity-60" />
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-muted lg:hidden" aria-label="Open navigation">
              <Menu className="size-5" />
            </button>
            <span className="text-sm font-medium">Administration</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user.email} · <span className="capitalize">{user.role}</span>
            </span>
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="flex-1">
          <div className="container-x py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
