import type * as React from "react";
import { Eyebrow } from "@/components/marketing/page-grid";
import { cn } from "@/lib/utils";

/**
 * Header shared by the docs/learn hub indexes: a signal-dot kicker, a display h1 whose trailing
 * phrase is dimmed, and a lead paragraph. Renders the page's only h1 (the docs header styles: dx-h1 / dx-lede in marketing.css).
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
      <Eyebrow className={cn(center && "justify-center")}>{kicker}</Eyebrow>
      <h1 className={cn("dx-h1 dx-h1--hub mt-5 max-w-[18ch]", center && "mx-auto")}>
        {title}
        {dim ? (
          <>
            {" "}
            <span className="pg-dim">{dim}</span>
          </>
        ) : null}
      </h1>
      {lead ? <p className={cn("dx-lede", center && "mx-auto")}>{lead}</p> : null}
      {children}
    </header>
  );
}
