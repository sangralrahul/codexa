"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { GlideIndicator, useGlide } from "@/components/motion/glide";

export type SegmentedOption<T extends string = string> = { value: T; label: React.ReactNode; icon?: React.ReactNode; count?: number; disabled?: boolean; title?: string };

/**
 * Segmented control: role=radiogroup with roving focus (arrow keys, Home/End) and a
 * pill that glides to the checked option (M12). Each option is role=radio with aria-checked.
 */
export function Segmented<T extends string = string>({
  value,
  onValueChange,
  options,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  size = "md",
  className,
  fullWidth = false,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedOption<T>[];
  "aria-label"?: string;
  "aria-labelledby"?: string;
  size?: "sm" | "md";
  className?: string;
  /** Stretch options to fill the container. */
  fullWidth?: boolean;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const glide = useGlide(boxRef, { selector: '[role="radio"][aria-checked="true"]' });
  const enabled = options.filter((o) => !o.disabled);

  const onKey = (e: React.KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next: SegmentedOption<T> | undefined;
    if (e.key in keys) {
      const i = enabled.findIndex((o) => o.value === value);
      next = enabled[(i + keys[e.key] + enabled.length) % enabled.length];
    } else if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled[enabled.length - 1];
    if (!next) return;
    e.preventDefault();
    onValueChange(next.value);
    const v = next.value;
    requestAnimationFrame(() => boxRef.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(v)}"]`)?.focus());
  };

  return (
    <div
      ref={boxRef}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      onKeyDown={onKey}
      className={cn(
        "relative isolate inline-flex items-center rounded-[10px] bg-muted p-0.5 shadow-[inset_0_0_0_1px_var(--border)]",
        fullWidth && "flex w-full",
        className,
      )}
    >
      <GlideIndicator ref={glide} className="inset-y-0.5 rounded-[8px]" />
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            disabled={o.disabled}
            title={o.title}
            data-value={o.value}
            data-no-ripple
            onClick={() => onValueChange(o.value)}
            className={cn(
              "relative z-[1] inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-3.5",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
              fullWidth && "flex-1",
              checked ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.icon ? <span className="flex shrink-0" aria-hidden="true">{o.icon}</span> : null}
            {o.label}
            {typeof o.count === "number" ? (
              <span className={cn("rounded-full px-1.5 text-[10.5px] tabular-nums leading-4 transition-colors", checked ? "bg-foreground/10 text-foreground" : "bg-foreground/[0.06] text-muted-foreground")}>
                {o.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
