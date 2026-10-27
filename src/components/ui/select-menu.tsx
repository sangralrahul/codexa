"use client";

import * as React from "react";
import { Select as RS } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlClasses } from "./input";

export type SelectMenuOption = {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

/**
 * Styled select (Radix) replacing native OS popups.
 * - `id` stays on the trigger (a combobox button), so <label htmlFor> / <Field> and getByLabel keep working.
 * - With `name` inside a <form>, Radix renders a hidden native <select> so form posts still carry the value.
 * - Options may have an icon and a one-line description; the trigger shows icon + label.
 */
export function SelectMenu({
  id,
  name,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  className,
  contentClassName,
  disabled,
  required,
  size = "md",
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: {
  id: string;
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectMenuOption[];
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
  required?: boolean;
  size?: "sm" | "md";
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <RS.Root name={name} value={value} onValueChange={onValueChange} disabled={disabled} required={required}>
      <RS.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        className={cn(
          controlClasses,
          "group inline-flex items-center justify-between gap-2 text-left data-[placeholder]:text-muted-foreground data-[state=open]:border-ring/70 data-[state=open]:shadow-[0_0_0_4px_color-mix(in_oklab,var(--signal)_14%,transparent)]",
          size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-10 px-3",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <RS.Value placeholder={placeholder}>
            {selected ? (
              <span className="flex min-w-0 items-center gap-2">
                {selected.icon ? <span className="flex shrink-0 text-muted-foreground [&_svg]:size-4">{selected.icon}</span> : null}
                <span className="truncate">{selected.label}</span>
              </span>
            ) : undefined}
          </RS.Value>
        </span>
        <RS.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
        </RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content
          position="popper"
          sideOffset={6}
          className={cn(
            "cx-pop e2 z-50 max-h-[min(var(--radix-select-content-available-height),360px)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[14px] p-1 text-sm",
            contentClassName,
          )}
        >
          <RS.Viewport className="scrollbar-thin">
            {options.map((o) => (
              <RS.Item
                key={o.value}
                value={o.value}
                disabled={o.disabled}
                className="relative flex cursor-default select-none items-start gap-2.5 rounded-lg py-2 pl-2.5 pr-8 outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-muted data-[disabled]:opacity-50"
              >
                {o.icon ? <span className="mt-0.5 flex shrink-0 text-muted-foreground [&_svg]:size-4">{o.icon}</span> : null}
                <span className="min-w-0">
                  <RS.ItemText>{o.label}</RS.ItemText>
                  {o.description ? <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{o.description}</span> : null}
                </span>
                <RS.ItemIndicator className="absolute right-2.5 top-2.5 text-foreground">
                  <Check className="size-4" aria-hidden="true" />
                </RS.ItemIndicator>
              </RS.Item>
            ))}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  );
}
