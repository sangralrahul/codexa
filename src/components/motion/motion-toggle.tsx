"use client";

import * as React from "react";
import { Sparkles, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import { setMotionPreference, systemPrefersReducedMotion, useMotionPreference, type MotionPreference } from "@/lib/client/motion";
import { GlideIndicator, useGlide } from "./glide";

const OPTIONS: { value: MotionPreference; label: string; Icon: typeof Sparkles }[] = [
  { value: "full", label: "Full", Icon: Sparkles },
  { value: "reduced", label: "Reduced", Icon: Waves },
];

/**
 * Site motion setting: Full / Reduced. Writes the `codexa_motion` cookie (read by the
 * root layout) and flips <html data-motion> live, so calm applies immediately.
 * When the OS already asks for reduced motion, the site stays calm whatever is chosen
 * and the control says so.
 */
export function MotionToggle({ className, showLabel = true }: { className?: string; showLabel?: boolean }) {
  const pref = useMotionPreference();
  const boxRef = React.useRef<HTMLDivElement>(null);
  const glide = useGlide(boxRef, { selector: '[aria-checked="true"]' });
  const [system, setSystem] = React.useState(false);
  const uid = React.useId();
  const labelId = `${uid}-label`;
  const systemId = `${uid}-system`;

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setSystem(systemPrefersReducedMotion());
    const id = requestAnimationFrame(sync);
    mq.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(id);
      mq.removeEventListener("change", sync);
    };
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next = pref === "full" ? "reduced" : "full";
    setMotionPreference(next);
    requestAnimationFrame(() => boxRef.current?.querySelector<HTMLElement>(`[data-value="${next}"]`)?.focus());
  };

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      {showLabel ? (
        <span id={labelId} className="text-xs text-muted-foreground">
          Motion
        </span>
      ) : null}
      <div
        ref={boxRef}
        role="radiogroup"
        aria-label={showLabel ? undefined : "Motion"}
        aria-labelledby={showLabel ? labelId : undefined}
        aria-describedby={system ? systemId : undefined}
        onKeyDown={onKey}
        className="relative inline-flex rounded-full border border-border bg-surface p-0.5"
      >
        <GlideIndicator ref={glide} className="inset-y-0.5 rounded-full" />
        {OPTIONS.map(({ value, label, Icon }) => {
          const checked = pref === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              data-value={value}
              data-no-ripple
              title={value === "reduced" ? "Final frames, no ambient motion" : "All animations"}
              onClick={() => setMotionPreference(value)}
              className={cn(
                "relative z-[1] inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors",
                checked ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
      {system ? (
        <span id={systemId} className="sr-only">
          Your system is set to reduce motion, so animations stay reduced.
        </span>
      ) : null}
    </div>
  );
}
