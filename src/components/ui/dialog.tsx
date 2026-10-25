"use client";

import * as React from "react";
import { Dialog as RD } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = RD.Root;
export const DialogTrigger = RD.Trigger;
export const DialogClose = RD.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentProps<typeof RD.Content> & { title: string; description?: string }) {
  return (
    <RD.Portal>
      <RD.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <RD.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg focus:outline-none data-[state=open]:animate-pop",
          className,
        )}
        {...props}
      >
        <div className="mb-4 pr-8">
          <RD.Title className="text-lg font-semibold tracking-tight">{title}</RD.Title>
          {description ? <RD.Description className="mt-1 text-sm text-muted-foreground">{description}</RD.Description> : <RD.Description className="sr-only">{title}</RD.Description>}
        </div>
        {children}
        <RD.Close
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </RD.Close>
      </RD.Content>
    </RD.Portal>
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}
