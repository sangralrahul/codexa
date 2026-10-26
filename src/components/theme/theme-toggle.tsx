"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, type Theme } from "./theme-provider";
import { cn } from "@/lib/utils";
import { GlideIndicator, useGlide } from "@/components/motion/glide";

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Light / Dark / System radiogroup with a gliding selection pill and arrow-key navigation. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const boxRef = React.useRef<HTMLDivElement>(null);
  const glide = useGlide(boxRef, { selector: '[aria-checked="true"]' });

  const onKey = (e: React.KeyboardEvent) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const i = options.findIndex((o) => o.value === theme);
    const next = options[(i + dir + options.length) % options.length].value;
    setTheme(next);
    requestAnimationFrame(() => boxRef.current?.querySelector<HTMLElement>(`[data-value="${next}"]`)?.focus());
  };

  return (
    <div
      ref={boxRef}
      role="radiogroup"
      aria-label="Color theme"
      onKeyDown={onKey}
      className={cn("relative inline-flex rounded-full border border-border bg-surface p-0.5", className)}
    >
      <GlideIndicator ref={glide} className="inset-y-0.5 rounded-full" />
      {options.map((o) => {
        const checked = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={o.label}
            title={o.label}
            tabIndex={checked ? 0 : -1}
            data-value={o.value}
            data-no-ripple
            onClick={() => setTheme(o.value)}
            className={cn("relative z-[1] rounded-full p-1.5 transition-colors", checked ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <o.icon className="size-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
