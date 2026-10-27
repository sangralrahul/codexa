"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, CreditCard, Keyboard, LifeBuoy, LogOut, Monitor, Moon, Settings, Sun, User as UserIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/misc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Segmented } from "@/components/ui/segmented";
import { MotionToggle } from "@/components/motion/motion-toggle";
import { useTheme, type Theme } from "@/components/theme/theme-provider";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { openShortcuts } from "./events";

type MenuUser = { name: string; email: string; avatarUrl: string | null };

const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

const LINKS = [
  { href: "/settings/profile", label: "Profile", icon: UserIcon },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/settings/billing", label: "Usage & billing", icon: CreditCard },
  { href: "/support", label: "Help & support", icon: LifeBuoy },
];

const rowClass =
  "flex w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left text-[13px] text-foreground/90 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground";

/**
 * Account menu (a popover so it can hold real controls): who you are, links, keyboard shortcuts,
 * the theme as a segmented control, the site motion setting, and sign out.
 * `variant="avatar"` (default) is the round trigger used in top bars and the collapsed rail;
 * `variant="row"` is the full-width name + email row at the bottom of the sidebar.
 */
export function UserMenu({ user, variant = "avatar", side, align }: { user: MenuUser; variant?: "avatar" | "row"; side?: "top" | "bottom" | "right"; align?: "start" | "end" | "center" }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const displayName = user.name || user.email.split("@")[0];

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-menu-row]") ?? []);
    const i = rows.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    rows[(i + (e.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length]?.focus();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "row" ? (
          <button
            type="button"
            className="group flex w-full min-w-0 items-center gap-2.5 rounded-[10px] px-1.5 py-1.5 text-left transition-colors hover:bg-foreground/[0.06] data-[state=open]:bg-foreground/[0.06]"
            aria-label="Account menu"
          >
            <Avatar name={displayName} src={user.avatarUrl} seed={user.email} size="sm" />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-medium">{displayName}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{user.email}</span>
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="rounded-full outline-offset-2 transition-[box-shadow] hover:shadow-[0_0_0_2px_var(--border-strong)] data-[state=open]:shadow-[0_0_0_2px_var(--border-strong)]"
            aria-label="Account menu"
          >
            <Avatar name={displayName} src={user.avatarUrl} seed={user.email} size="md" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        side={side ?? (variant === "row" ? "top" : "bottom")}
        align={align ?? (variant === "row" ? "start" : "end")}
        sideOffset={8}
        className="w-[280px] p-1.5"
      >
        <div className="flex items-center gap-3 px-2 pb-3 pt-2">
          <Avatar name={displayName} src={user.avatarUrl} seed={user.email} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-[-0.01em]">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div ref={listRef} onKeyDown={onKey} className="space-y-px border-t border-border pt-1.5">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} data-menu-row onClick={() => setOpen(false)} className={rowClass}>
              <l.icon aria-hidden="true" />
              {l.label}
            </Link>
          ))}
          <button
            type="button"
            data-menu-row
            onClick={() => {
              setOpen(false);
              openShortcuts();
            }}
            className={rowClass}
          >
            <Keyboard aria-hidden="true" />
            <span className="flex-1">Keyboard shortcuts</span>
            <Kbd className="border border-border bg-muted">?</Kbd>
          </button>
        </div>
        <div className="mt-1.5 space-y-2.5 border-t border-border px-2 pb-1 pt-3">
          <div className="flex items-center justify-between gap-3">
            <span id="um-theme" className="text-xs text-muted-foreground">
              Theme
            </span>
            <Segmented<Theme>
              aria-labelledby="um-theme"
              size="sm"
              value={theme}
              onValueChange={setTheme}
              options={THEMES.map(({ value, label, Icon }) => ({ value, title: label, icon: <Icon />, label: <span className="sr-only">{label}</span> }))}
            />
          </div>
          <MotionToggle className="w-full justify-between" />
        </div>
        <div className="mt-2 border-t border-border pt-1.5">
          <button
            type="button"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true);
              try {
                await api("/api/auth/logout", { method: "POST" });
                router.push("/");
                router.refresh();
              } catch {
                setSigningOut(false);
              }
            }}
            className={cn(rowClass, "disabled:opacity-60")}
          >
            <LogOut aria-hidden="true" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
