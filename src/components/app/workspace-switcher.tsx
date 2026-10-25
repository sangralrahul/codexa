"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import type { SidebarWorkspace } from "./sidebar";
import { Badge } from "@/components/ui/badge";

export function WorkspaceSwitcher({ workspaces, currentId }: { workspaces: SidebarWorkspace[]; currentId: string | null }) {
  const router = useRouter();
  const current = workspaces.find((w) => w.id === currentId) ?? workspaces[0];
  if (!current) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-left text-sm hover:bg-muted"
          aria-label={`Current workspace: ${current.name}. Switch workspace`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-[11px] font-semibold uppercase text-background">{current.name.slice(0, 1)}</span>
            <span className="truncate font-medium">{current.name}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((w) => (
          <DropdownMenuItem
            key={w.id}
            onSelect={() => {
              document.cookie = `codexa_workspace=${w.id}; path=/; max-age=31536000; samesite=lax`;
              router.push("/dashboard");
              router.refresh();
            }}
          >
            <span className="flex size-5 items-center justify-center">{w.id === current.id ? <Check className="size-4" /> : null}</span>
            <span className="flex-1 truncate">{w.name}</span>
            <Badge variant="outline" className="capitalize">
              {w.plan}
            </Badge>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/settings/workspaces/new")}>
          <Plus className="size-4" /> New workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
