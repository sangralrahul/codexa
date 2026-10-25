"use client";

import * as React from "react";
import { Tabs as RT } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = RT.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof RT.List>) {
  return <RT.List className={cn("inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof RT.Trigger>) {
  return (
    <RT.Trigger
      className={cn(
        "inline-flex h-7 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof RT.Content>) {
  return <RT.Content className={cn("mt-3 focus-visible:outline-none", className)} {...props} />;
}
