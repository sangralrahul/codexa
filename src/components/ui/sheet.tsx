"use client";

import * as React from "react";
import { Dialog as RD } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = RD.Root;
export const SheetTrigger = RD.Trigger;
export const SheetClose = RD.Close;

const SIDE: Record<"right" | "left" | "bottom", string> = {
  right: "inset-y-2 right-2 h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)]",
  left: "inset-y-2 left-2 h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)]",
  bottom: "inset-x-2 bottom-2 max-h-[85dvh] w-[calc(100vw-1rem)]",
};

/**
 * Side sheet (Radix Dialog): glass-edged card that slides 24px and fades in (320ms in / 220ms out).
 * `title` is required (it labels the dialog); `description` is optional. `width` in px for left/right.
 * `modal={false}` renders no overlay and keeps the page interactive (also pass modal={false} to <Sheet>
 * to drop the focus trap). Put a sticky footer inside with `footer`.
 */
export function SheetContent({
  side = "right",
  title,
  description,
  width = 480,
  modal = true,
  footer,
  className,
  bodyClassName,
  children,
  ...props
}: Omit<React.ComponentProps<typeof RD.Content>, "title"> & {
  side?: "right" | "left" | "bottom";
  title: React.ReactNode;
  description?: React.ReactNode;
  width?: number;
  modal?: boolean;
  footer?: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <RD.Portal>
      {modal ? <RD.Overlay className="cx-overlay fixed inset-0 z-50 bg-background/40 backdrop-blur-[3px]" /> : null}
      <RD.Content
        data-side={side}
        onInteractOutside={modal ? undefined : (e) => e.preventDefault()}
        className={cn(
          "cx-sheet e2 fixed z-50 flex flex-col overflow-hidden rounded-[18px] outline-none",
          SIDE[side],
          className,
        )}
        style={side === "bottom" ? undefined : { width }}
        {...props}
      >
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <RD.Title className="text-[15px] font-semibold tracking-tight">{title}</RD.Title>
            {description ? (
              <RD.Description className="mt-1 text-[13px] text-muted-foreground">{description}</RD.Description>
            ) : (
              <RD.Description className="sr-only">{typeof title === "string" ? title : "Panel"}</RD.Description>
            )}
          </div>
          <RD.Close className="-mr-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Close">
            <X className="size-4" aria-hidden="true" />
          </RD.Close>
        </div>
        <div className={cn("scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4", bodyClassName)}>{children}</div>
        {footer ? <div className="glass border-t border-border px-5 py-3">{footer}</div> : null}
      </RD.Content>
    </RD.Portal>
  );
}
