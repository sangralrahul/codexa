"use client";

import * as React from "react";
import { Tabs as RT } from "radix-ui";
import { cn } from "@/lib/utils";
import { GlideIndicator, useGlide } from "@/components/motion/glide";

export const Tabs = RT.Root;

type TabsVariant = "pill" | "underline";
const VariantContext = React.createContext<TabsVariant>("pill");

/**
 * Tab strip with one indicator that glides to the active tab (M12).
 * - "pill" (default): a raised pill inside a muted track.
 * - "underline": a 2px signal bar under the active tab, hover-following.
 */
export function TabsList({ className, children, variant = "pill", ...props }: React.ComponentProps<typeof RT.List> & { variant?: TabsVariant }) {
  const list = React.useRef<HTMLDivElement>(null);
  const indicator = useGlide(list, { selector: '[role="tab"][data-state="active"]' });
  return (
    <VariantContext.Provider value={variant}>
      <RT.List
        ref={list}
        className={cn(
          "relative isolate inline-flex items-center text-muted-foreground",
          variant === "pill" ? "h-9 gap-1 rounded-[10px] bg-muted p-1 shadow-[inset_0_0_0_1px_var(--border)]" : "h-10 gap-5 border-b border-border",
          className,
        )}
        {...props}
      >
        <GlideIndicator ref={indicator} className={variant === "pill" ? "inset-y-1 rounded-[7px]" : "glide-indicator--bar -bottom-px"} />
        {children}
      </RT.List>
    </VariantContext.Provider>
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof RT.Trigger>) {
  const variant = React.useContext(VariantContext);
  return (
    <RT.Trigger
      className={cn(
        "relative z-[1] inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium transition-colors duration-200 hover:text-foreground data-[state=active]:text-foreground [&_svg]:size-4",
        variant === "pill" ? "h-7 rounded-[7px] px-3" : "h-full px-0.5",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof RT.Content>) {
  return <RT.Content className={cn("mt-3 focus-visible:outline-none data-[state=active]:animate-fade-in", className)} {...props} />;
}
