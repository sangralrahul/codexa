import { cn } from "@/lib/utils";

/**
 * Tiny inline charts for stat cards, drawn as plain SVG from the real daily series (no library).
 * Bars: one per day, the newest in the accent colour. A day with no events is a 1px stub, so
 * "nothing happened" stays visible instead of reading as missing data. Decorative; the card
 * carries the numbers and an accessible summary.
 */
export function Sparkline({ values, className, height = 28, tone = "accent", label }: { values: number[]; className?: string; height?: number; tone?: "accent" | "neutral"; label?: string }) {
  const n = Math.max(values.length, 1);
  const max = Math.max(1, ...values);
  const gap = 2;
  const w = 6;
  const width = n * (w + gap) - gap;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("block overflow-visible", className)}
    >
      {values.map((v, i) => {
        const h = v <= 0 ? 1 : Math.max(2, Math.round((v / max) * height));
        const last = i === values.length - 1;
        return (
          <rect
            key={i}
            x={i * (w + gap)}
            y={height - h}
            width={w}
            height={h}
            className={v <= 0 ? "fill-border-strong" : last && tone === "accent" ? "fill-primary" : "fill-foreground/35"}
          />
        );
      })}
    </svg>
  );
}

/** This week's total (last 7 points) and the 7 before it. Pure; shared by the KPI cards and tests. */
export function weekDelta(values: number[]): { thisWeek: number; lastWeek: number; delta: number } {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const thisWeek = sum(values.slice(-7));
  const lastWeek = sum(values.slice(-14, -7));
  return { thisWeek, lastWeek, delta: thisWeek - lastWeek };
}
