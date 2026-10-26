"use client";

import * as React from "react";
import { Popover as RP } from "radix-ui";
import { cn } from "@/lib/utils";

export const Popover = RP.Root;
export const PopoverTrigger = RP.Trigger;
export const PopoverAnchor = RP.Anchor;
export const PopoverClose = RP.Close;

/** Floating panel (e2, 14px radius) that pops from its trigger: 160ms in / 120ms out. */
export function PopoverContent({
  className,
  align = "center",
  side = "bottom",
  sideOffset = 8,
  children,
  ...props
}: React.ComponentProps<typeof RP.Content>) {
  return (
    <RP.Portal>
      <RP.Content
        align={align}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn("cx-pop cx-pop--quick e2 z-50 w-72 rounded-[14px] p-4 text-sm text-card-foreground outline-none", className)}
        {...props}
      >
        {children}
      </RP.Content>
    </RP.Portal>
  );
}
