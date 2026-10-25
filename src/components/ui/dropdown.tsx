"use client";

import * as React from "react";
import { DropdownMenu as RDM } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const DropdownMenu = RDM.Root;
export const DropdownMenuTrigger = RDM.Trigger;
export const DropdownMenuGroup = RDM.Group;
export const DropdownMenuSub = RDM.Sub;
export const DropdownMenuRadioGroup = RDM.RadioGroup;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof RDM.Content>) {
  return (
    <RDM.Portal>
      <RDM.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-card p-1 text-sm shadow-md data-[state=open]:animate-fade-in",
          className,
        )}
        {...props}
      />
    </RDM.Portal>
  );
}

export function DropdownMenuItem({ className, inset, ...props }: React.ComponentProps<typeof RDM.Item> & { inset?: boolean }) {
  return (
    <RDM.Item
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 outline-none data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({ className, children, ...props }: React.ComponentProps<typeof RDM.CheckboxItem>) {
  return (
    <RDM.CheckboxItem
      className={cn("relative flex cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 outline-none data-[highlighted]:bg-muted", className)}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <RDM.ItemIndicator>
          <Check className="size-3.5" />
        </RDM.ItemIndicator>
      </span>
      {children}
    </RDM.CheckboxItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof RDM.Label>) {
  return <RDM.Label className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof RDM.Separator>) {
  return <RDM.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}
