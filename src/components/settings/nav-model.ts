/**
 * Settings navigation model (server-safe): the pages, their icons, and the searchable section
 * index used by "Search settings". Every href here is an existing route plus a section anchor
 * that the page renders (see the `id` on each SettingsCard).
 */
import { CreditCard, Gauge, LayoutGrid, type LucideIcon, Plug, Settings2, ShieldCheck, UserRound, Users } from "lucide-react";

export type SettingsNavKey = "overview" | "profile" | "security" | "general" | "members" | "billing" | "usage" | "integrations";
export type SettingsNavItem = { href: string; label: string; exact?: boolean; key?: SettingsNavKey; icon?: LucideIcon; keywords?: string };

export const ACCOUNT_NAV: SettingsNavItem[] = [
  { href: "/settings", label: "Overview", exact: true, key: "overview", icon: LayoutGrid, keywords: "home summary control centre" },
  { href: "/settings/profile", label: "Profile", key: "profile", icon: UserRound, keywords: "name photo avatar time zone language motion" },
  { href: "/settings/security", label: "Security", key: "security", icon: ShieldCheck, keywords: "password sessions devices export delete" },
];

export const WORKSPACE_NAV: SettingsNavItem[] = [
  { href: "/settings/workspace", label: "Workspace", key: "general", icon: Settings2, keywords: "general workspace name slug currency leave" },
  { href: "/settings/members", label: "Members", key: "members", icon: Users, keywords: "team invite roles seats people" },
  { href: "/settings/billing", label: "Billing", key: "billing", icon: CreditCard, keywords: "plan upgrade invoices subscription payment" },
  { href: "/settings/usage", label: "Usage", key: "usage", icon: Gauge, keywords: "limits quota ai requests runtime deployments storage" },
  { href: "/settings/integrations", label: "Integrations", key: "integrations", icon: Plug, keywords: "connections database api keys stripe openai" },
];

export type SettingsSection = { href: string; label: string; page: string; keywords?: string; workspace?: boolean };

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { href: "/settings/profile#profile-details", label: "Name and photo", page: "Profile", keywords: "avatar picture display name upload" },
  { href: "/settings/profile#timezone", label: "Time zone", page: "Profile", keywords: "clock tz utc local time" },
  { href: "/settings/profile#locale", label: "Language", page: "Profile", keywords: "english hindi locale" },
  { href: "/settings/profile#appearance", label: "Motion", page: "Profile", keywords: "animation reduced motion accessibility calm" },
  { href: "/settings/security#password", label: "Change password", page: "Security", keywords: "password reset credentials" },
  { href: "/settings/security#sessions", label: "Active sessions", page: "Security", keywords: "devices sign out logout browsers" },
  { href: "/settings/security#export", label: "Export your data", page: "Security", keywords: "download json backup gdpr" },
  { href: "/settings/security#delete-account", label: "Delete account", page: "Security", keywords: "close remove erase" },
  { href: "/settings/workspace#workspace-general", label: "Workspace name and URL slug", page: "Workspace", keywords: "rename url link", workspace: true },
  { href: "/settings/workspace#ws-currency", label: "Billing currency", page: "Workspace", keywords: "usd inr stripe razorpay", workspace: true },
  { href: "/settings/workspace#leave", label: "Leave workspace", page: "Workspace", keywords: "quit exit", workspace: true },
  { href: "/settings/members#members", label: "Members and roles", page: "Members", keywords: "team people owner admin", workspace: true },
  { href: "/settings/members#invite", label: "Invite a teammate", page: "Members", keywords: "add people email seat", workspace: true },
  { href: "/settings/members#pending", label: "Pending invitations", page: "Members", keywords: "resend revoke invite", workspace: true },
  { href: "/settings/members#roles", label: "Roles and permissions", page: "Members", keywords: "owner admin editor viewer access", workspace: true },
  { href: "/settings/billing#plan", label: "Current plan", page: "Billing", keywords: "subscription cancel renew", workspace: true },
  { href: "/settings/billing#plans", label: "Upgrade plan", page: "Billing", keywords: "pro team pricing checkout compare", workspace: true },
  { href: "/settings/billing#invoices", label: "Invoices", page: "Billing", keywords: "receipts pdf payments", workspace: true },
  { href: "/settings/usage#period", label: "Usage this period", page: "Usage", keywords: "limits quota gauges", workspace: true },
  { href: "/settings/usage#activity", label: "Daily activity", page: "Usage", keywords: "chart history histogram ai requests", workspace: true },
  { href: "/settings/usage#breakdown", label: "Top projects and members", page: "Usage", keywords: "breakdown who what", workspace: true },
  { href: "/settings/integrations#connections", label: "Connected services", page: "Integrations", keywords: "database credentials test", workspace: true },
  { href: "/settings/integrations#available", label: "Add an integration", page: "Integrations", keywords: "stripe openai anthropic supabase postgres resend vercel", workspace: true },
  { href: "/settings/workspaces/new#new-workspace", label: "Create a workspace", page: "Workspaces", keywords: "new team client" },
];

/** Case-insensitive match on every word of the query against label, page and keywords. */
export function searchSections(query: string, hasWorkspace: boolean): SettingsSection[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return SETTINGS_SECTIONS.filter((s) => (hasWorkspace || !s.workspace) && words.every((w) => `${s.label} ${s.page} ${s.keywords ?? ""}`.toLowerCase().includes(w))).slice(0, 8);
}
