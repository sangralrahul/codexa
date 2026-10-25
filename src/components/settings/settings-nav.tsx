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

function NavGroup({ label, items }: { label: string; items: SettingsNavItem[] }) {
  const pathname = usePathname();
  const active = (it: SettingsNavItem) => (it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/"));
  return (
    <div>
      <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <ul className="flex gap-1 overflow-x-auto scrollbar-thin lg:flex-col lg:gap-0.5">
        {items.map((it) => (
          <li key={it.href} className="shrink-0">
            <Link
              href={it.href}
              aria-current={active(it) ? "page" : undefined}
              className={cn(
                "block rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
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
    <nav aria-label="Settings" className="flex flex-col gap-4 lg:w-52 lg:shrink-0">
      <NavGroup label="Account" items={ACCOUNT_NAV} />
      <NavGroup label={workspaceName ? `Workspace · ${workspaceName}` : "Workspace"} items={WORKSPACE_NAV} />
    </nav>
  );
}
