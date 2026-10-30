"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export type RadioCardOption<T extends string> = {
  value: T;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Status shown on its own line under the title (e.g. a "Configured" badge). */
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
};

/**
 * Radio cards: role=radiogroup with roving focus (arrows, Home/End skip disabled options).
 * The group carries `id` and is labelled by `labelledBy`, so getByLabel(<label text>) finds it.
 */
export function RadioCards<T extends string>({
  id,
  labelledBy,
  describedBy,
  value,
  onValueChange,
  options,
  disabled = false,
  className,
}: {
  id: string;
  labelledBy: string;
  describedBy?: string;
  value: T;
  onValueChange: (v: T) => void;
  options: RadioCardOption<T>[];
  disabled?: boolean;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const enabled = options.filter((o) => !o.disabled && !disabled);
  const onKey = (e: React.KeyboardEvent) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next: RadioCardOption<T> | undefined;
    if (e.key in step) {
      const i = enabled.findIndex((o) => o.value === value);
      next = enabled[(i + step[e.key] + enabled.length) % enabled.length];
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
      id={id}
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-disabled={disabled || undefined}
      onKeyDown={onKey}
      className={cn("grid grid-cols-1 gap-2.5 sm:grid-cols-2", className)}
    >
      {options.map((o) => {
        const checked = o.value === value;
        const off = disabled || o.disabled;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={off}
            tabIndex={checked ? 0 : -1}
            data-value={o.value}
            data-no-ripple
            onClick={() => onValueChange(o.value)}
            className={cn(
              "radio-card group relative flex items-start gap-3 rounded-md border border-border bg-card p-3.5 text-left outline-none hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border",
              checked && "bg-card",
            )}
          >
            <span aria-hidden="true" className="radio-dot relative mt-0.5 size-4 shrink-0 rounded-full border border-border-strong bg-background" />
            {o.icon ? <span className="mt-px flex shrink-0 text-muted-foreground [&_svg]:size-4">{o.icon}</span> : null}
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium">{o.title}</span>
              {/* The badge always gets its own line, so every card's description starts at the same height. */}
              {o.badge ? <span className="mt-1 flex">{o.badge}</span> : null}
              {o.description ? <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{o.description}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
