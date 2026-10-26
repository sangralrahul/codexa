"use client";

import { useLayoutEffect, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Compact IDE tab strip (h-9) with an underline that slides to the active tab.
 * Tabs keep role="tab" + aria-selected/aria-controls so panels stay accessible.
 */
export function PanelTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idPrefix,
  className,
  children,
}: {
  tabs: readonly (readonly [T, string, LucideIcon])[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  idPrefix: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const list = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = list.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!el || !bar.current) return;
    bar.current.style.width = `${el.offsetWidth}px`;
    bar.current.style.transform = `translateX(${el.offsetLeft}px)`;
    bar.current.style.opacity = "1";
  }, [value, tabs.length]);

  return (
    <div className={cn("flex h-9 shrink-0 items-stretch border-b border-border bg-surface", className)}>
      <div ref={list} className="relative flex min-w-0 flex-1 items-stretch" role="tablist" aria-label={label}>
        {tabs.map(([id, text, Icon]) => {
          const selected = value === id;
          return (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${idPrefix}-${id}`}
              onClick={() => onChange(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 text-[12.5px] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" /> {text}
            </button>
          );
        })}
        <span
          ref={bar}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-foreground opacity-0 transition-[transform,width] duration-300 ease-[cubic-bezier(0.3,1.2,0.4,1)]"
        />
      </div>
      {children ? <div className="flex shrink-0 items-center gap-0.5 pr-1.5">{children}</div> : null}
    </div>
  );
}

/** Icon-only toolbar button used across the workspace (size-7/8, muted, tooltip supplied by caller). */
export const toolButton =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-muted aria-pressed:text-foreground";
