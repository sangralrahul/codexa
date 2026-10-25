"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, type Theme } from "./theme-provider";
import { cn } from "@/lib/utils";

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Color theme" className={cn("inline-flex rounded-md border border-border bg-surface p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          aria-label={o.label}
          title={o.label}
          onClick={() => setTheme(o.value)}
          className={cn(
            "rounded-[5px] p-1.5 text-muted-foreground transition hover:text-foreground",
            theme === o.value && "bg-background text-foreground shadow-sm",
          )}
        >
          <o.icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
