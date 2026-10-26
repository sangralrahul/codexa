"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type SettingsNavItem = { href: string; label: string; exact?: boolean };

export const ACCOUNT_NAV: SettingsNavItem[] = [
  { href: "/settings", label: "Overview", exact: true },
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/security", label: "Security" },
];

export const WORKSPACE_NAV: SettingsNavItem[] = [
  { href: "/settings/workspace", label: "General" },
  { href: "/settings/members", label: "Members" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/usage", label: "Usage" },
  { href: "/settings/integrations", label: "Integrations" },
];

function NavGroup({ label, sublabel, items }: { label: string; sublabel?: string | null; items: SettingsNavItem[] }) {
  const pathname = usePathname();
  const active = (it: SettingsNavItem) => (it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/"));
  return (
    <div>
      <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {sublabel ? <p className="-mt-0.5 mb-1.5 truncate px-2.5 text-xs text-foreground/80">{sublabel}</p> : null}
      <ul className="flex gap-1 overflow-x-auto scrollbar-thin lg:flex-col lg:gap-0.5">
        {items.map((it) => (
          <li key={it.href} className="shrink-0">
            <Link
              href={it.href}
              aria-current={active(it) ? "page" : undefined}
              className={cn(
                "nav-item block rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
                active(it) && "bg-muted font-medium text-foreground",
              )}
            >
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SettingsNav({ workspaceName }: { workspaceName: string | null }) {
  return (
    <nav aria-label="Settings" className="flex flex-col gap-5 lg:sticky lg:top-20 lg:w-52 lg:shrink-0 lg:self-start">
      <NavGroup label="Account" items={ACCOUNT_NAV} />
      <NavGroup label="Workspace" sublabel={workspaceName} items={WORKSPACE_NAV} />
    </nav>
  );
}
