"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import type { SidebarWorkspace } from "./sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function WorkspaceAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex size-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-foreground to-foreground/70 text-[11px] font-semibold uppercase text-background", className)}>
      {name.slice(0, 1)}
    </span>
  );
}

export function WorkspaceSwitcher({ workspaces, currentId }: { workspaces: SidebarWorkspace[]; currentId: string | null }) {
  const router = useRouter();
  const current = workspaces.find((w) => w.id === currentId) ?? workspaces[0];
  if (!current) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted data-[state=open]:bg-muted"
          aria-label={`Current workspace: ${current.name}. Switch workspace`}
        >
          <WorkspaceAvatar name={current.name} />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-medium">{current.name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{current.plan.charAt(0).toUpperCase() + current.plan.slice(1)} plan</span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
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
            <WorkspaceAvatar name={w.name} className="size-5 text-[10px]" />
            <span className="flex-1 truncate">{w.name}</span>
            <Badge variant="outline" className="capitalize">
              {w.plan}
            </Badge>
            <span className="flex size-4 items-center justify-center">{w.id === current.id ? <Check className="size-4" /> : null}</span>
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
