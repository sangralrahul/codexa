"use client";

import * as React from "react";
import { Tabs as RT } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = RT.Root;

/** Tab strip with a selection pill that slides to the active tab. */
export function TabsList({ className, children, ...props }: React.ComponentProps<typeof RT.List>) {
  const list = React.useRef<HTMLDivElement>(null);
  const pill = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const place = () => {
      const active = el.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
      if (!pill.current) return;
      pill.current.style.opacity = active ? "1" : "0";
      if (!active) return;
      pill.current.style.width = `${active.offsetWidth}px`;
      pill.current.style.transform = `translateX(${active.offsetLeft}px)`;
    };
    place();
    const mo = new MutationObserver(place);
    mo.observe(el, { subtree: true, attributes: true, attributeFilter: ["data-state"], childList: true });
    return () => mo.disconnect();
  }, []);
  return (
    <RT.List ref={list} className={cn("segmented inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground", className)} {...props}>
      <span ref={pill} aria-hidden="true" className="segmented__pill inset-y-1" />
      {children}
    </RT.List>
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof RT.Trigger>) {
  return (
    <RT.Trigger
      className={cn(
        "inline-flex h-7 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors duration-300 hover:text-foreground data-[state=active]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof RT.Content>) {
  return <RT.Content className={cn("mt-3 focus-visible:outline-none", className)} {...props} />;
}
