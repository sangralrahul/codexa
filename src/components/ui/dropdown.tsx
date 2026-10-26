"use client";

import * as React from "react";
import { DropdownMenu as RDM } from "radix-ui";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const DropdownMenu = RDM.Root;
export const DropdownMenuTrigger = RDM.Trigger;
export const DropdownMenuGroup = RDM.Group;
export const DropdownMenuSub = RDM.Sub;
export const DropdownMenuRadioGroup = RDM.RadioGroup;

/** Menu panel: pops from its trigger (scale .96 + 4px, 200ms in / 140ms out); items stagger 12ms. */
export function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof RDM.Content>) {
  return (
    <RDM.Portal>
      <RDM.Content
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn("cx-pop cx-menu e2 z-50 min-w-[11rem] overflow-hidden rounded-[14px] p-1 text-sm text-card-foreground", className)}
        {...props}
      />
    </RDM.Portal>
  );
}

const itemBase =
  "relative flex cursor-default select-none items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors duration-150 data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground data-[highlighted]:[&_svg]:text-foreground";

export function DropdownMenuItem({ className, inset, ...props }: React.ComponentProps<typeof RDM.Item> & { inset?: boolean }) {
  return <RDM.Item className={cn(itemBase, inset && "pl-8", className)} {...props} />;
}

export function DropdownMenuCheckboxItem({ className, children, ...props }: React.ComponentProps<typeof RDM.CheckboxItem>) {
  return (
    <RDM.CheckboxItem className={cn(itemBase, "pl-8", className)} {...props}>
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <RDM.ItemIndicator>
          <Check className="size-3.5" />
        </RDM.ItemIndicator>
      </span>
      {children}
    </RDM.CheckboxItem>
  );
}

export function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof RDM.RadioItem>) {
  return (
    <RDM.RadioItem className={cn(itemBase, "pl-8", className)} {...props}>
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <RDM.ItemIndicator>
          <span className="size-1.5 rounded-full bg-foreground" />
        </RDM.ItemIndicator>
      </span>
      {children}
    </RDM.RadioItem>
  );
}

export function DropdownMenuSubTrigger({ className, children, ...props }: React.ComponentProps<typeof RDM.SubTrigger>) {
  return (
    <RDM.SubTrigger className={cn(itemBase, "data-[state=open]:bg-muted", className)} {...props}>
      {children}
      <ChevronRight className="ml-auto" aria-hidden="true" />
    </RDM.SubTrigger>
  );
}

export function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof RDM.SubContent>) {
  return (
    <RDM.Portal>
      <RDM.SubContent className={cn("cx-pop e2 z-50 min-w-[10rem] overflow-hidden rounded-[14px] p-1 text-sm", className)} {...props} />
    </RDM.Portal>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof RDM.Label>) {
  return <RDM.Label className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof RDM.Separator>) {
  return <RDM.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

/** Right-aligned shortcut hint inside a menu item. */
export function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("ml-auto pl-4 text-xs tracking-wide text-muted-foreground", className)} {...props} />;
}
