"use client";

import * as React from "react";
import { Switch as RSw } from "radix-ui";
import { cn } from "@/lib/utils";

/** On/off switch (role=switch). The thumb springs across; label it with aria-label or <label htmlFor={id}>. */
export function Switch({
  id,
  checked,
  onCheckedChange,
  disabled,
  className,
  name,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  name?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  return (
    <RSw.Root
      id={id}
      name={name}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      data-no-ripple
      className={cn(
        "peer relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-border-strong shadow-[inset_0_1px_2px_color-mix(in_oklab,black_18%,transparent)] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-foreground",
        className,
      )}
    >
      <RSw.Thumb className="pointer-events-none block size-4 translate-x-0.5 rounded-full bg-background shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-[420ms] ease-spring data-[state=checked]:translate-x-[17px] calm:transition-none" />
    </RSw.Root>
  );
}
