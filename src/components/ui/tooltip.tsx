"use client";

import * as React from "react";
import { Tooltip as RT } from "radix-ui";
import { cn } from "@/lib/utils";

export const TooltipProvider = RT.Provider;

export function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <RT.Root delayDuration={300}>
      <RT.Trigger asChild>{children}</RT.Trigger>
      <RT.Portal>
        <RT.Content side={side} sideOffset={6} className={cn("z-50 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground shadow-md")}>
          {content}
          <RT.Arrow className="fill-border" />
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  );
}
