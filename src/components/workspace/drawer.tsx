"use client";

import * as React from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

/** Sheet title with an icon tile (tool sheets: history, settings, activity, deployments). */
export function SheetHeading({ icon, title }: { icon?: React.ReactNode; title: string }) {
  return (
    <span className="flex items-center gap-2.5">
      {icon ? <span className="icon-tile flex size-8 shrink-0 items-center justify-center rounded-[10px] text-foreground [&_svg]:size-4">{icon}</span> : null}
      <span>{title}</span>
    </span>
  );
}

/**
 * Right-side tool sheet: glass-edged card (Sheet), icon-tile header, sticky footer, spring
 * slide. `modal={false}` keeps the workspace usable behind it (no overlay, no focus trap).
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  wide,
  width,
  footer,
  modal = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  width?: number;
  footer?: React.ReactNode;
  modal?: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={modal}>
      <SheetContent
        title={<SheetHeading icon={icon} title={title} />}
        description={description}
        width={width ?? (wide ? 1040 : 480)}
        footer={footer}
        modal={modal}
        // Portaled outside the workspace root: carry the app's 10px button shape along.
        className="[--btn-radius:10px]"
        bodyClassName="p-0"
        // Focus the sheet itself (not the close button) so keyboard users start at the top of its content.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}
