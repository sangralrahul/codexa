"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip as RT } from "radix-ui";
import {
  ArrowUpRight,
  BookOpen,
  Compass,
  Copy,
  CreditCard,
  ExternalLink,
  FolderGit2,
  FolderKanban,
  Home,
  LayoutTemplate,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo";
import { Meter } from "@/components/ui/meter";
import { Kbd } from "@/components/ui/misc";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { toast } from "@/components/ui/toast";
import { GlideIndicator, useGlide } from "@/components/motion/glide";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { UserMenu } from "./user-menu";
import { ProjectThumb } from "./project-thumb";
import { KeyHint } from "./hotkeys";

export type SidebarWorkspace = { id: string; name: string; slug: string; role: string; plan: string };
export type SidebarUsage = { plan: string; projects: number; projectLimit: number };
export type SidebarUser = { name: string; email: string; avatarUrl: string | null };
/** A recent project: its template (for the thumbnail) and whether its preview is running right now (DB row). */
export type SidebarProject = { id: string; name: string; templateId: string | null; templateName: string | null; framework: string; running: boolean; workspaceName: string; updatedAt: string };
/** What the next plan up adds, shown on the upgrade card (from the plan config, never invented). */
export type SidebarUpsell = { plan: string; points: string[] } | null;

type NavItem = { href: string; label: string; icon: typeof Home; exact?: boolean; keys?: string[] };
const MAIN: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true, keys: ["G", "H"] },
  { href: "/projects", label: "Projects", icon: FolderKanban, keys: ["G", "P"] },
  { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate, keys: ["G", "T"] },
  { href: "/showcase", label: "Community", icon: Compass },
  { href: "/dashboard/shared", label: "Shared with me", icon: Users },
  { href: "/dashboard/github", label: "GitHub", icon: FolderGit2 },
];
/** Workspace administration, labelled so it is one click away (Settings covers the remaining tabs). */
const WORKSPACE: (NavItem & { except?: string[] })[] = [
  { href: "/settings/members", label: "Members", icon: UserPlus },
  { href: "/settings/billing", label: "Usage & billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings, keys: ["G", "S"], except: ["/settings/members", "/settings/billing"] },
];
const UTILITY = [{ href: "/docs", label: "Documentation", icon: BookOpen, external: true }];

const tipClass =
  "cx-pop cx-pop--quick z-50 flex max-w-xs items-center gap-2 rounded-lg border border-border-strong bg-card px-2.5 py-1.5 text-xs font-medium text-card-foreground shadow-lg";

/**
 * Tooltip that only opens when `show` (the collapsed rail), so the trigger element never
 * re-mounts when the sidebar collapses and its labels can fade instead of popping.
 */
function RailTip({ show, content, children, side = "right" }: { show: boolean; content: React.ReactNode; children: React.ReactNode; side?: "right" | "top" }) {
  return (
    <RT.Root delayDuration={150} open={show ? undefined : false}>
      <RT.Trigger asChild>{children}</RT.Trigger>
      <RT.Portal>
        <RT.Content side={side} sideOffset={10} collisionPadding={8} className={tipClass}>
          {content}
          <RT.Arrow className="fill-card" width={10} height={5} />
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  );
}

/** Fades labels out first when collapsing (the rail then narrows), in as it widens. */
const fade = (collapsed: boolean) => cn("transition-opacity duration-(--dur-2) ease-out calm:transition-none", collapsed ? "pointer-events-none opacity-0" : "opacity-100");

function NavRow({ item, current, collapsed, onNavigate, trailing }: { item: NavItem; current: boolean; collapsed: boolean; onNavigate?: () => void; trailing?: React.ReactNode }) {
  const Icon = item.icon;
  return (
    <RailTip
      show={collapsed}
      content={
        <>
          {item.label}
          {item.keys ? <KeyHint keys={item.keys} /> : null}
        </>
      }
    >
      <Link
        href={item.href}
        data-nav-row
        onClick={onNavigate}
        aria-current={current ? "page" : undefined}
        aria-label={collapsed ? item.label : undefined}
        className={cn(
          "group/row relative z-[1] flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[13.5px] outline-none transition-colors duration-(--dur-2)",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
          // Active: a gradient-tinted background with indigo text (the brand signature, quietly).
          // Active: a neutral highlight with blue text (no tinted fill).
          current ? "bg-foreground/[0.06] font-semibold text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Icon className={cn("size-4 shrink-0 transition-colors", current ? "text-primary" : "text-muted-foreground group-hover/row:text-foreground")} aria-hidden="true" />
        <span className={cn("min-w-0 flex-1 truncate whitespace-nowrap", fade(collapsed))}>{item.label}</span>
        <span className={cn("flex shrink-0 items-center", fade(collapsed))}>
          {item.keys ? <KeyHint keys={item.keys} className="opacity-0 transition-opacity duration-(--dur-2) group-hover/row:opacity-100 group-focus-visible/row:opacity-100 [@media(hover:none)]:hidden" /> : null}
          {trailing}
        </span>
      </Link>
    </RailTip>
  );
}

function RecentRow({ project: p, collapsed, onNavigate }: { project: SidebarProject; collapsed: boolean; onNavigate?: () => void }) {
  const href = `/projects/${p.id}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
      toast.success("Link copied", p.name);
    } catch {
      toast.error("Could not copy the link", "Your browser blocked clipboard access.");
    }
  };
  return (
    <li data-nav-row className="group/rec relative z-[1] flex h-9 items-center rounded-[10px]">
      <RailTip
        show={collapsed}
        content={
          <span className="flex flex-col gap-0.5">
            <span>{p.name}</span>
            <span className="font-normal text-muted-foreground">
              {p.running ? "Preview running · " : ""}
              {p.templateName ? `Thumbnail: ${p.templateName} template` : p.workspaceName}
            </span>
          </span>
        }
      >
        <Link
          href={href}
          onClick={onNavigate}
          aria-label={collapsed ? `${p.name}${p.running ? ", preview running" : ""}` : undefined}
          className="flex h-full min-w-0 flex-1 items-center gap-2.5 rounded-[10px] pl-[9px] pr-2 text-[13px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <span title={p.templateName ? `Template preview · ${p.templateName}` : undefined} className="relative flex">
            <ProjectThumb templateId={p.templateId} framework={p.framework} size="xs" />
            {p.running && collapsed ? <span className="live-dot absolute -right-1 -top-1 ring-2 ring-surface" /> : null}
          </span>
          <span className={cn("min-w-0 flex-1 truncate whitespace-nowrap", fade(collapsed))}>{p.name}</span>
          {p.running ? (
            <span className={cn("flex shrink-0 items-center", fade(collapsed))}>
              <span className="live-dot" />
              <span className="sr-only">Preview running</span>
            </span>
          ) : null}
        </Link>
      </RailTip>
      <div inert={collapsed} className={cn("absolute right-1 top-1/2 -translate-y-1/2", fade(collapsed))}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`More actions for ${p.name}`}
              className="flex size-7 items-center justify-center rounded-md bg-surface text-muted-foreground opacity-0 shadow-[0_0_0_1px_var(--border)] transition-[opacity,color] hover:text-foreground focus-visible:opacity-100 group-hover/rec:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
            >
              <MoreHorizontal className="size-3.5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={href} onClick={onNavigate}>
                <ExternalLink /> Open editor
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={href} target="_blank" rel="noopener">
                <ArrowUpRight /> Open in new tab
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void copyLink()}>
              <Copy /> Copy link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function GroupLabel({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  return (
    <div className="relative mb-1 mt-4 flex h-4 items-center px-2.5">
      <span aria-hidden={collapsed} className={cn("text-[11px] font-medium uppercase tracking-[0.06em] text-foreground-dim", fade(collapsed))}>
        {children}
      </span>
      <span aria-hidden="true" className={cn("absolute inset-x-2.5 top-1/2 h-px bg-border transition-opacity duration-(--dur-2)", collapsed ? "opacity-100" : "opacity-0")} />
    </div>
  );
}

/**
 * The app sidebar (228px, collapsing to a 56px rail; the parent animates the width).
 * The DOM is the same in both states so labels fade instead of re-mounting; collapsed rows
 * get tooltips with their shortcut. One pill glides between the hovered and the current row,
 * and the current row keeps its signal bar.
 */
export function AppSidebar({
  workspaces,
  currentId,
  isStaff,
  user,
  usage,
  recent,
  upsell,
  canCreate,
  collapsed = false,
  onToggle,
  onNavigate,
  onClose,
}: {
  workspaces: SidebarWorkspace[];
  currentId: string | null;
  isStaff: boolean;
  user: SidebarUser;
  usage: SidebarUsage | null;
  recent: SidebarProject[];
  upsell: SidebarUpsell;
  canCreate: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
  /** Mobile drawer: show a close button in the header instead of the collapse toggle. */
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const glide = useGlide(navRef, { selector: '[data-nav-row][aria-current="page"]', itemSelector: "[data-nav-row]", axis: "y", hover: true });
  const isActive = (href: string, exact?: boolean, except?: string | string[]) =>
    ![except ?? []].flat().some((x) => pathname === x || pathname.startsWith(x + "/")) && (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  const limited = usage && usage.projectLimit > 0;
  const nav: NavItem[] = isStaff ? [...MAIN, { href: "/admin", label: "Admin", icon: Shield }] : MAIN;

  return (
    <div className="relative flex h-full flex-col">
      {/* Header: logo mark + the workspace switcher card (name over plan and role). */}
      <div className="relative flex h-[56px] shrink-0 items-center gap-1.5 border-b border-border px-2.5">
        {collapsed && onToggle ? (
          <RailTip show content={<>Expand sidebar <KeyHint keys={["["]} /></>}>
            <button type="button" onClick={onToggle} aria-label="Expand sidebar" className="group/logo relative flex size-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-foreground/[0.06]">
              <LogoMark size={22} className="transition-opacity duration-(--dur-2) group-hover/logo:opacity-0 group-focus-visible/logo:opacity-0" />
              <PanelLeftOpen className="absolute size-4 text-muted-foreground opacity-0 transition-opacity duration-(--dur-2) group-hover/logo:opacity-100 group-focus-visible/logo:opacity-100" aria-hidden="true" />
            </button>
          </RailTip>
        ) : (
          <Link href="/dashboard" onClick={onNavigate} aria-label="Codexa home" className="flex size-9 shrink-0 items-center justify-center rounded-md transition-opacity hover:opacity-80">
            <LogoMark size={22} />
          </Link>
        )}
        {/* The logo mark is the brand; the switcher beside it gets the rest of the row for the workspace name. */}
        <div inert={collapsed} className={cn("flex min-w-0 flex-1 items-center", fade(collapsed))}>
          <WorkspaceSwitcher workspaces={workspaces} currentId={currentId} onNavigate={onNavigate} className="min-w-0 flex-1 rounded-[10px] border border-border bg-card shadow-sm hover:border-border-strong hover:bg-surface data-[state=open]:border-border-strong data-[state=open]:bg-surface" />
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="Close navigation" className="ml-1 flex size-8 shrink-0 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground">
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Collapsed rail: the workspace switcher as an avatar. */}
      {collapsed ? (
        <div className="flex justify-center px-2.5 pb-1 pt-2">
          <WorkspaceSwitcher workspaces={workspaces} currentId={currentId} variant="avatar" />
        </div>
      ) : null}

      {canCreate ? (
        <div className="relative px-2.5 pb-1 pt-2.5">
          <RailTip show={collapsed} content={<>New project <KeyHint keys={["N"]} /></>}>
            <Link
              href="/new-project"
              onClick={onNavigate}
              aria-label={collapsed ? "New project" : undefined}
              className="group/new btn-indigo flex h-9 items-center gap-2 overflow-hidden rounded-[10px] bg-primary px-[9px] text-[13px] font-medium text-primary-foreground transition-[background-color,box-shadow] hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Plus className="size-4 shrink-0 transition-transform duration-(--dur-3) ease-snap group-hover/new:rotate-90 calm:transition-none" aria-hidden="true" />
              <span className={cn("flex-1 truncate whitespace-nowrap", fade(collapsed))}>New project</span>
              <Kbd className={cn("border-0 bg-primary-foreground/15 text-primary-foreground [@media(hover:none)]:hidden", fade(collapsed))}>N</Kbd>
            </Link>
          </RailTip>
        </div>
      ) : null}

      <nav ref={navRef} aria-label="Workspace" className="scrollbar-thin relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5 pb-3 pt-1.5">
        <GlideIndicator ref={glide} className="inset-x-2.5 rounded-[10px] bg-foreground/[0.04] shadow-none" />
        <ul className="space-y-px">
          {nav.map((it) => (
            <li key={it.href}>
              <NavRow
                item={it}
                collapsed={collapsed}
                onNavigate={onNavigate}
                current={it.href === "/admin" ? pathname.startsWith("/admin") : isActive(it.href, it.exact)}
                trailing={it.href === "/projects" && usage ? <span className="text-meta tabular-nums text-foreground-dim">{usage.projects}</span> : null}
              />
            </li>
          ))}
        </ul>

        <GroupLabel collapsed={collapsed}>Workspace</GroupLabel>
        <ul className="space-y-px">
          {WORKSPACE.map((it) => (
            <li key={it.href}>
              <NavRow item={it} collapsed={collapsed} onNavigate={onNavigate} current={isActive(it.href, it.exact, it.except)} />
            </li>
          ))}
        </ul>

        <GroupLabel collapsed={collapsed}>Recent</GroupLabel>
        {recent.length ? (
          <ul className="space-y-px">
            {recent.map((p) => (
              <RecentRow key={p.id} project={p} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </ul>
        ) : (
          <p className={cn("px-2.5 py-1 text-xs text-foreground-dim", fade(collapsed))}>Projects you open appear here.</p>
        )}
      </nav>

      <div className="relative shrink-0 space-y-2 border-t border-border px-2.5 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5">
        {limited && !collapsed ? (
          <div className="rounded-xl border border-border bg-surface p-3">
            <Meter size="sm" label="Projects" value={usage.projects} max={usage.projectLimit} format={(n) => String(n)} neutral />
            {upsell ? (
              <div className="mt-2.5 flex items-end justify-between gap-2">
                <p className="min-w-0 text-[11.5px] leading-snug text-muted-foreground">
                  {upsell.plan}: {upsell.points.slice(0, 2).join(" · ")}
                </p>
                <Link href="/settings/billing" onClick={onNavigate} className="link-draw shrink-0 text-[12px] font-semibold text-primary">
                  Upgrade
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={cn("flex gap-1", collapsed ? "flex-col items-center" : "items-center")}>
          {UTILITY.map((u) => {
            const current = false;
            return (
              <RailTip key={u.href} show side={collapsed ? "right" : "top"} content={<>{u.label}{u.external ? <ArrowUpRight className="size-3 text-muted-foreground" aria-hidden="true" /> : null}</>}>
                <Link
                  href={u.href}
                  onClick={onNavigate}
                  aria-label={u.label}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                    current ? "bg-foreground/[0.06] text-foreground" : "text-muted-foreground",
                  )}
                >
                  <u.icon className="size-4" aria-hidden="true" />
                </Link>
              </RailTip>
            );
          })}
          {onToggle ? (
            <RailTip show side={collapsed ? "right" : "top"} content={<>{collapsed ? "Expand sidebar" : "Collapse sidebar"} <KeyHint keys={["["]} /></>}>
              <button
                type="button"
                onClick={onToggle}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  !collapsed && "ml-auto",
                )}
              >
                {collapsed ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}
              </button>
            </RailTip>
          ) : null}
        </div>
        <div className={cn(collapsed && "flex justify-center")}>
          <UserMenu user={user} variant={collapsed ? "avatar" : "row"} side={collapsed ? "right" : "top"} align={collapsed ? "end" : "start"} />
        </div>
      </div>
    </div>
  );
}
