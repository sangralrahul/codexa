"use client";

import * as React from "react";
import { Dialog as RD } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Right-side sheet used for workspace tools (history, settings, activity, deploy…). */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] data-[state=open]:animate-fade-in" />
        <RD.Content
          className={cn(
            // Slides in from the right on open (@starting-style via the starting: variant).
            "fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-card shadow-lg transition-[translate,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] focus:outline-none starting:translate-x-8 starting:opacity-0",
            wide ? "sm:max-w-3xl lg:max-w-4xl" : "sm:max-w-md",
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <RD.Title className="text-base font-semibold tracking-tight">{title}</RD.Title>
              {description ? <RD.Description className="mt-0.5 text-sm text-muted-foreground">{description}</RD.Description> : <RD.Description className="sr-only">{title}</RD.Description>}
            </div>
            <RD.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
              <X className="size-4" />
            </RD.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">{children}</div>
          {footer ? <div className="border-t border-border px-5 py-3">{footer}</div> : null}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
