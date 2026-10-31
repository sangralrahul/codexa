"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, ChevronsUpDown, Plus, Search, Settings, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SwitcherWorkspace = { id: string; name: string; slug?: string; role: string; plan: string };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Square two-tone avatar seeded by the workspace id (token colours only), so each workspace keeps its colours. */
export function WorkspaceAvatar({ workspace, size = "sm", className }: { workspace: { id: string; name: string }; size?: "xs" | "sm" | "md"; className?: string }) {
  return <Avatar name={workspace.name} seed={workspace.id} shape="square" size={size} className={className} />;
}

/** Small uppercase plan pill ("Free", "Pro"). */
export function PlanPill({ plan, className }: { plan: string; className?: string }) {
  const paid = plan !== "free";
  return (
    <span
      className={cn(
        "inline-flex h-[18px] shrink-0 items-center rounded-full px-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.08em]",
        paid ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_25%,transparent)]" : "bg-muted text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]",
        className,
      )}
    >
      {cap(plan)}
    </span>
  );
}

function switchTo(id: string, router: ReturnType<typeof useRouter>) {
  document.cookie = `codexa_workspace=${id}; path=/; max-age=31536000; samesite=lax`;
  router.push("/dashboard");
  router.refresh();
}

/**
 * Workspace switcher: the sidebar header trigger (the name over "Free · Owner") opens a panel of
 * workspaces with their plan and your role ("Free · Owner"), a check on the current one, a filter
 * when there are more than five, and footer actions. Switching writes the `codexa_workspace`
 * cookie and refreshes. `variant="avatar"` is the collapsed-rail trigger.
 */
export function WorkspaceSwitcher({
  workspaces,
  currentId,
  variant = "full",
  onNavigate,
  className,
  upgrade = null,
}: {
  workspaces: SwitcherWorkspace[];
  currentId: string | null;
  /** "bar": the top bar trigger (round avatar, name, plan pill, chevrons). */
  variant?: "full" | "avatar" | "bar";
  onNavigate?: () => void;
  className?: string;
  /** The next plan up when the current workspace is on Free (from the plan config): adds an Upgrade entry. */
  upgrade?: { plan: string; points: string[] } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  const current = workspaces.find((w) => w.id === currentId) ?? workspaces[0];
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? workspaces.filter((w) => w.name.toLowerCase().includes(q)) : workspaces;
  }, [workspaces, filter]);
  if (!current) return null;

  const rows = () => Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("[data-ws-row]") ?? []);
  const onListKey = (e: React.KeyboardEvent) => {
    const all = rows();
    const i = all.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? all[Math.min(all.length - 1, i + 1)] : e.key === "ArrowUp" ? all[Math.max(0, i - 1)] : e.key === "Home" ? all[0] : e.key === "End" ? all.at(-1) : null;
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setFilter("");
      }}
    >
      <PopoverTrigger asChild>
        {variant === "bar" ? (
          <button
            type="button"
            title={current.name}
            className={cn(
              "group/ws flex h-8 min-w-0 items-center gap-2 rounded-md px-1.5 text-left text-[14px] font-medium transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring data-[state=open]:bg-surface-2",
              className,
            )}
          >
            <span className="sr-only">Current workspace: </span>
            <Avatar name={current.name} seed={current.id} size="xs" />
            <span className="min-w-0 truncate">{current.name}</span>
            <span className="sr-only">, </span>
            <span className="app-pill hidden sm:inline-flex">{cap(current.plan)}</span>
            <span className="sr-only">. Switch workspace</span>
            <ChevronsUpDown className="app-dim size-3.5 shrink-0 transition-colors group-hover/ws:text-foreground" aria-hidden="true" />
          </button>
        ) : variant === "avatar" ? (
          // Both triggers are named by their content (sr-only text around the visible parts) rather
          // than an aria-label, so the name always contains the visible initials and name (WCAG
          // 2.5.3, axe label-content-name-mismatch).
          <button
            type="button"
            className={cn("flex size-10 items-center justify-center rounded-md transition-colors hover:bg-foreground/[0.06] data-[state=open]:bg-foreground/[0.06]", className)}
          >
            <WorkspaceAvatar workspace={current} size="sm" />
            <span className="sr-only">Current workspace: {current.name}. Switch workspace</span>
          </button>
        ) : (
          // Two lines so the name gets the whole width: the name, then "Free · Owner" (plan and your role).
          <button
            type="button"
            title={current.name}
            className={cn(
              "group/ws flex min-h-10 min-w-0 items-center gap-1.5 rounded-[10px] py-1 pl-2 pr-1.5 text-left transition-[background-color,border-color] hover:bg-foreground/[0.04] data-[state=open]:bg-foreground/[0.04]",
              className,
            )}
          >
            <span className="sr-only">Current workspace: </span>
            <span className="min-w-0 flex-1 leading-tight">
              {/* Two lines before an ellipsis, so "Rahul's workspace" is never cut to "Rahul's wor…". */}
              <span className="line-clamp-2 text-[12.5px] font-semibold leading-[1.2] tracking-[-0.01em] [overflow-wrap:anywhere]">{current.name}</span>
              <span className="sr-only">, </span>
              <span className="block truncate text-[11px] leading-[1.3] text-muted-foreground">
                {cap(current.plan)} · {cap(current.role)}
              </span>
            </span>
            <span className="sr-only">. Switch workspace</span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/ws:text-foreground" aria-hidden="true" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" side={variant === "avatar" ? "right" : "bottom"} sideOffset={6} className="w-72 p-1.5">
        <div className="flex items-baseline justify-between px-2 pb-1.5 pt-1">
          <p className="text-xs font-medium text-muted-foreground">Workspaces</p>
          <p className="text-meta text-foreground-dim">{workspaces.length}</p>
        </div>
        {workspaces.length > 5 ? (
          <div className="relative mb-1 px-0.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <label htmlFor="ws-filter" className="sr-only">
              Filter workspaces
            </label>
            <input
              id="ws-filter"
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  rows()[0]?.focus();
                }
              }}
              placeholder="Find a workspace…"
              className="h-8 w-full rounded-lg border border-border bg-input pl-8 pr-2 text-[13px] placeholder:text-muted-foreground/80 focus-visible:border-ring/70 focus-visible:outline-none"
            />
          </div>
        ) : null}
        <ul ref={listRef} onKeyDown={onListKey} className="scrollbar-thin max-h-72 space-y-px overflow-y-auto" aria-label="Workspaces">
          {shown.map((w) => {
            const active = w.id === current.id;
            return (
              <li key={w.id}>
                <button
                  type="button"
                  data-ws-row
                  aria-current={active ? "true" : undefined}
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                    if (!active) switchTo(w.id, router);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
                >
                  <WorkspaceAvatar workspace={w} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{w.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {cap(w.plan)} · {cap(w.role)}
                    </span>
                  </span>
                  {active ? <Check className="size-4 shrink-0 text-foreground" aria-label="Current workspace" /> : null}
                </button>
              </li>
            );
          })}
          {shown.length === 0 ? <li className="px-2 py-3 text-center text-xs text-muted-foreground">No workspace matches “{filter.trim()}”.</li> : null}
        </ul>
        <div className="mt-1.5 space-y-px border-t border-border pt-1.5">
          {[
            { href: "/settings/workspace", label: "Workspace settings", icon: Settings },
            { href: "/settings/members#invite", label: "Invite members", icon: UserPlus },
            { href: "/settings/workspaces/new", label: "New workspace", icon: Plus },
            ...(upgrade ? [{ href: "/settings/billing", label: `Upgrade to ${upgrade.plan}`, icon: ArrowUpRight }] : []),
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground"
            >
              <a.icon className="size-4" aria-hidden="true" />
              {a.label}
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
