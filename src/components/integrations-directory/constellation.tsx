import type * as React from "react";
import { INTEGRATIONS } from "@/config/integrations";
import { IntegrationMark } from "./integration-mark";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

type Node = { id: string; name: string; x: number; y: number; available: boolean };

/** Places available integrations on an inner orbit and planned ones on an outer orbit (percent units). */
function layout(): Node[] {
  const available = INTEGRATIONS.filter((i) => i.status === "available");
  const planned = INTEGRATIONS.filter((i) => i.status !== "available");
  const ring = (list: typeof INTEGRATIONS, rx: number, ry: number, offset: number, isAvailable: boolean) =>
    list.map((i, k) => {
      const a = ((-90 + offset + (360 / list.length) * k) * Math.PI) / 180;
      return { id: i.id, name: i.name, x: 50 + rx * Math.cos(a), y: 50 + ry * Math.sin(a), available: isAvailable };
    });
  return [...ring(available, 29, 30, 0, true), ...ring(planned, 45, 44, 180 / Math.max(1, planned.length), false)];
}

/**
 * Integrations constellation (decorative; the directory below is the real content). Solid lines
 * fade in once to every available adapter; planned integrations hang off dashed, static lines with
 * their marks at half opacity. Brand marks are only drawn for available adapters; planned ones get a
 * monogram. All counts come from the integrations registry.
 */
export function IntegrationsConstellation({ className }: { className?: string }) {
  const nodes = layout();
  const r = (n: number) => Math.round(n * 100) / 100;
  return (
    <div aria-hidden="true" className={cn("relative aspect-[5/4] w-full select-none", className)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        <ellipse cx="50" cy="50" rx="29" ry="30" fill="none" stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <ellipse cx="50" cy="50" rx="45" ry="44" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />
        {nodes.map((n, i) =>
          n.available ? (
            <line
              key={n.id}
              x1="50"
              y1="50"
              x2={r(n.x)}
              y2={r(n.y)}
              stroke="color-mix(in oklab, var(--signal) 70%, var(--foreground))"
              strokeOpacity="0.55"
              strokeWidth="1.25"
              vectorEffect="non-scaling-stroke"
              className="animate-[cx-fade-in_700ms_var(--ease-out)_both] calm:animate-none"
              style={{ animationDelay: `${200 + i * 70}ms` }}
            />
          ) : (
            <line key={n.id} x1="50" y1="50" x2={r(n.x)} y2={r(n.y)} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
          ),
        )}
      </svg>

      {nodes.map((n, i) => (
        <span
          key={n.id}
          title={`${n.name}${n.available ? "" : " (planned)"}`}
          className={cn(
            "absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center",
            n.available
              ? "size-11 rounded-[13px] border border-border bg-card text-foreground shadow-md animate-[pop-in_420ms_var(--ease-out)_both] calm:animate-none sm:size-12"
              : "size-9 rounded-[11px] border border-dashed border-border-strong bg-background/70 text-muted-foreground",
          )}
          style={{ left: `${r(n.x)}%`, top: `${r(n.y)}%`, ...(n.available ? ({ animationDelay: `${120 + i * 70}ms` } as React.CSSProperties) : null) }}
        >
          <IntegrationMark id={n.id} name={n.name} planned={!n.available} className={n.available ? "size-5" : "size-4"} />
        </span>
      ))}

      <span className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[20px] border border-border-strong bg-card shadow-lg sm:size-[72px]">
        <span className="absolute inset-0 rounded-[20px] bg-[radial-gradient(circle_at_50%_40%,color-mix(in_oklab,var(--signal)_22%,transparent),transparent_70%)]" />
        <LogoMark size={34} className="relative" />
      </span>
    </div>
  );
}
