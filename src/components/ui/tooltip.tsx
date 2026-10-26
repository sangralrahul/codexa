"use client";

import * as React from "react";
import { Tooltip as RT } from "radix-ui";
import { cn } from "@/lib/utils";

export const TooltipProvider = RT.Provider;

/** Small label on hover/focus (300ms delay). Pops 120ms from its side. */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  return (
    <RT.Root delayDuration={300}>
      <RT.Trigger asChild>{children}</RT.Trigger>
      <RT.Portal>
        <RT.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            "cx-pop cx-pop--quick z-50 max-w-xs rounded-lg border border-border-strong bg-card px-2.5 py-1.5 text-xs font-medium text-card-foreground shadow-lg",
            className,
          )}
        >
          {content}
          <RT.Arrow className="fill-card" width={10} height={5} />
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  );
}
