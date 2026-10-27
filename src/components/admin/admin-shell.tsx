"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as RD } from "radix-ui";
import {
  Activity,
  ArrowLeft,
  Briefcase,
  CreditCard,
  Flag,
  Gauge,
  LifeBuoy,
  ListChecks,
  Mail,
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
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { GlideIndicator, useGlide } from "@/components/motion/glide";

export const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: Gauge, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/workspaces", label: "Workspaces", icon: Briefcase },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/ai-health", label: "AI health", icon: Sparkles },
  { href: "/admin/email", label: "Email", icon: Mail },
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
  const navRef = useRef<HTMLElement>(null);
  const glide = useGlide(navRef, { selector: '[aria-current="page"]', axis: "y", hover: true });
  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  return (
    <nav ref={navRef} aria-label="Admin" className="scrollbar-thin relative flex-1 space-y-px overflow-y-auto px-3 py-3">
      <GlideIndicator ref={glide} className="inset-x-3 rounded-[10px] bg-foreground/[0.06] shadow-none" />
      {ADMIN_NAV.map((it) => {
        const current = active(it.href, "exact" in it && it.exact);
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            aria-current={current ? "page" : undefined}
            className={cn(
              "nav-item relative z-[1] flex h-9 items-center gap-3 rounded-[10px] px-3 text-[13.5px] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
              current ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <it.icon className="size-4 shrink-0" aria-hidden="true" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Side({ onNavigate, onClose }: { onNavigate?: () => void; onClose?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-border px-4">
        <Link href="/admin" onClick={onNavigate} aria-label="Admin overview" className="flex items-center gap-2.5">
          <LogoMark size={24} />
          <span className="text-[13px] font-semibold tracking-[-0.01em]">Administration</span>
        </Link>
        <span className="rounded-full bg-warning/15 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--warning)_35%,transparent)]">Staff</span>
        {onClose ? (
          <button type="button" onClick={onClose} className="ml-auto flex size-8 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close navigation">
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <Nav onNavigate={onNavigate} />
      <div className="border-t border-border p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <Link href="/dashboard" className="flex h-9 items-center gap-3 rounded-[10px] px-3 text-[13.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to the app
        </Link>
      </div>
    </div>
  );
}

/** Staff console chrome: static app lighting (no canvas), a gliding nav and a mobile drawer. */
export function AdminShell({ user, children }: { user: { name: string; email: string; role: string }; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-dvh bg-background [--btn-radius:10px]">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-border bg-surface lg:block">
        <Side />
      </aside>
      <RD.Root open={open} onOpenChange={setOpen}>
        <RD.Portal>
          <RD.Overlay className="cx-overlay fixed inset-0 z-50 bg-background/50 backdrop-blur-[2px] lg:hidden" />
          <RD.Content
            aria-modal="true"
            aria-label="Admin navigation"
            aria-describedby={undefined}
            data-side="left"
            className="cx-sheet fixed inset-y-0 left-0 z-50 w-[min(288px,calc(100vw-48px))] border-r border-border bg-surface pt-[env(safe-area-inset-top)] shadow-xl outline-none lg:hidden"
          >
            <RD.Title className="sr-only">Admin navigation</RD.Title>
            <Side onNavigate={() => setOpen(false)} onClose={() => setOpen(false)} />
          </RD.Content>
        </RD.Portal>
      </RD.Root>
      <div className="relative isolate flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-40 flex h-[52px] items-center justify-between gap-3 border-b border-border/70 px-3 sm:px-5">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setOpen(true)} className="-ml-1 flex size-9 items-center justify-center rounded-[10px] hover:bg-muted lg:hidden" aria-label="Open navigation">
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <span className="text-[13px] font-medium">Administration</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user.email} · <span className="capitalize">{user.role}</span>
            </span>
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="app-atmosphere flex-1">
          <div className="container-x py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
