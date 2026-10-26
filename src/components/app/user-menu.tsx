"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, LifeBuoy, LogOut, Monitor, Moon, Settings, Sun, User as UserIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { useTheme, type Theme } from "@/components/theme/theme-provider";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/utils";

type MenuUser = { name: string; email: string; avatarUrl: string | null };

function Avatar({ user, className }: { user: MenuUser; className?: string }) {
  const initials = (user.name || user.email)
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return user.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatarUrl} alt="" className={cn("size-8 shrink-0 rounded-full object-cover", className)} />
  ) : (
    <span aria-hidden="true" className={cn("flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background", className)}>
      {initials}
    </span>
  );
}

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * Account menu. `variant="avatar"` (default) is the round button used in top bars;
 * `variant="row"` is the full-width name + email row at the bottom of the sidebar.
 */
export function UserMenu({ user, variant = "avatar" }: { user: MenuUser; variant?: "avatar" | "row" }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "row" ? (
          <button type="button" className="group flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted data-[state=open]:bg-muted" aria-label="Account menu">
            <Avatar user={user} className="size-7" />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-medium">{user.name || user.email.split("@")[0]}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{user.email}</span>
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className="rounded-full ring-offset-2 ring-offset-background transition hover:ring-2 hover:ring-border-strong" aria-label="Account menu">
            <Avatar user={user} />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === "row" ? "start" : "end"} side={variant === "row" ? "top" : "bottom"} className="w-60">
        <DropdownMenuLabel>
          <div className="truncate text-sm font-medium text-foreground">{user.name}</div>
          <div className="truncate text-xs font-normal">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/settings/profile")}>
          <UserIcon className="size-4" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/settings")}>
          <Settings className="size-4" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/support")}>
          <LifeBuoy className="size-4" /> Support
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-wide">Theme</DropdownMenuLabel>
        {THEMES.map((t) => (
          <DropdownMenuItem key={t.value} onSelect={(e) => (e.preventDefault(), setTheme(t.value))}>
            <t.icon className="size-4" /> <span className="flex-1">{t.label}</span>
            {theme === t.value ? <Check className="size-4" aria-label="Selected" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await api("/api/auth/logout", { method: "POST" });
            router.push("/");
            router.refresh();
          }}
        >
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
