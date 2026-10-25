"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings, User as UserIcon, LifeBuoy } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { api } from "@/lib/client/api";

export function UserMenu({ user }: { user: { name: string; email: string; avatarUrl: string | null } }) {
  const router = useRouter();
  const initials = (user.name || user.email).slice(0, 2).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex size-8 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background ring-offset-background hover:opacity-90" aria-label="Account menu">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="size-8 rounded-full" />
          ) : (
            initials
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
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
