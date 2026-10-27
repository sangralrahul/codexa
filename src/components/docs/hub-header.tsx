import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Header shared by the docs/learn hub indexes: a signal-dot kicker, a display h1 whose trailing
 * phrase is dimmed, and a lead paragraph. Renders the page's only h1. Type utilities stay outside
 * cn() because tailwind-merge would treat them as colour classes and drop them.
 */
export function HubHeader({
  kicker,
  title,
  dim,
  lead,
  align = "start",
  className,
  children,
}: {
  kicker: string;
  title: React.ReactNode;
  /** Optional trailing phrase rendered in the dimmed display colour. */
  dim?: React.ReactNode;
  lead?: React.ReactNode;
  align?: "start" | "center";
  className?: string;
  children?: React.ReactNode;
}) {
  const center = align === "center";
  return (
    <header className={cn("max-w-3xl", center && "mx-auto text-center", className)}>
      <p className={`text-label ${cn("flex items-center gap-2.5 text-muted-foreground", center && "justify-center")}`}>
        <span aria-hidden="true" className="size-1.5 rounded-full bg-signal shadow-[0_0_0_3px_color-mix(in_oklab,var(--signal)_18%,transparent)]" />
        {kicker}
      </p>
      <h1 className={`text-display-2 ${cn("mt-5 max-w-[16ch]", center && "mx-auto")}`}>
        {title}
        {dim ? (
          <>
            {" "}
            <span className="text-dim">{dim}</span>
          </>
        ) : null}
      </h1>
      {lead ? <p className={`text-lead ${cn("mt-5", center && "mx-auto")}`}>{lead}</p> : null}
      {children}
    </header>
  );
}
