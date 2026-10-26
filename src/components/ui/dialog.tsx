"use client";

import * as React from "react";
import { Dialog as RD } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = RD.Root;
export const DialogTrigger = RD.Trigger;
export const DialogClose = RD.Close;

/** Centered dialog: the overlay fades and blurs in; the panel scales from .96 and rises 8px (240ms in / 160ms out). */
export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentProps<typeof RD.Content> & { title: string; description?: string }) {
  return (
    <RD.Portal>
      <RD.Overlay className="cx-overlay fixed inset-0 z-50 bg-background/50 backdrop-blur-[4px]" />
      <RD.Content
        className={cn(
          "cx-dialog e3 fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[18px] p-6 focus:outline-none",
          className,
        )}
        {...props}
      >
        <div className="mb-4 pr-8">
          <RD.Title className="text-lg font-semibold tracking-tight">{title}</RD.Title>
          {description ? <RD.Description className="mt-1 text-sm text-muted-foreground">{description}</RD.Description> : <RD.Description className="sr-only">{title}</RD.Description>}
        </div>
        {children}
        <RD.Close className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Close">
          <X className="size-4" aria-hidden="true" />
        </RD.Close>
      </RD.Content>
    </RD.Portal>
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}
