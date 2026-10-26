"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const pill =
  "glass inline-flex h-6 items-center gap-1.5 rounded-full border border-border px-2.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground shadow-sm";

/**
 * The honesty label every product depiction carries (PLAN §4.4): "Illustration" (default),
 * "Scripted replay · not a recording", "Sample data"… With `detail`, the pill is a button
 * that opens a popover explaining exactly what is shown.
 */
export function IllustrationBadge({ label = "Illustration", detail, className }: { label?: string; detail?: React.ReactNode; className?: string }) {
  if (!detail) {
    return (
      <span className={cn(pill, className)}>
        <span aria-hidden="true" className="size-1.5 rounded-full bg-signal" />
        {label}
      </span>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: what this shows`}
          data-no-ripple
          className={cn(pill, "cursor-pointer transition-[color,border-color] hover:border-border-strong hover:text-foreground", className)}
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-signal" />
          {label}
          <Info className="size-3" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 text-[13px] leading-relaxed text-muted-foreground">
        <p className="text-label mb-2 text-foreground">{label}</p>
        {detail}
      </PopoverContent>
    </Popover>
  );
}

/** Visible caption under a framed depiction (use inside a <figure>). */
export function FrameCaption({ children, className }: { children: React.ReactNode; className?: string }) {
  return <figcaption className={cn("mx-auto mt-4 max-w-2xl text-pretty text-center text-xs leading-relaxed text-muted-foreground", className)}>{children}</figcaption>;
}
