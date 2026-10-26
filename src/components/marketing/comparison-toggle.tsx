"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

/** Collapses or expands the rows of the <tbody> it sits in (comparison tables). */
export function GroupToggle({ label, count }: { label: string; count: number }) {
  const [open, setOpen] = React.useState(true);
  const ref = React.useRef<HTMLButtonElement>(null);
  const toggle = () => {
    const body = ref.current?.closest("tbody");
    const next = !open;
    if (body) {
      if (next) body.removeAttribute("data-collapsed");
      else body.setAttribute("data-collapsed", "");
    }
    setOpen(next);
  };
  return (
    <button ref={ref} type="button" aria-expanded={open} onClick={toggle} className="group/t inline-flex items-center gap-2 text-left">
      <ChevronDown className={`size-3.5 transition-transform duration-300 ease-snap ${open ? "" : "-rotate-90"}`} aria-hidden="true" />
      <span>{label}</span>
      <span className="font-mono text-[10px] font-normal normal-case tracking-normal text-foreground-dim">{count} rows</span>
    </button>
  );
}
