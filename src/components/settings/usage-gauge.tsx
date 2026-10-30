import { Infinity as InfinityIcon } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { isUnlimited } from "@/config/plans";
import { Odometer } from "@/components/motion/odometer";
import { describeUsage, formatLimit, ratioOf, toneOf, type UsageMetric, type UsageTone } from "./usage-model";

const STROKE: Record<UsageTone, string> = {
  ok: "var(--primary)",
  warn: "var(--warning)",
  danger: "var(--danger)",
  neutral: "color-mix(in oklab, var(--foreground) 62%, transparent)",
  unlimited: "color-mix(in oklab, var(--foreground) 22%, transparent)",
};

const SIZES = { sm: 44, md: 72, lg: 96 } as const;

/** Big numeral for a metric: an odometer for counts, plain text for bytes. */
export function UsageNumber({ metric, className, trigger = "view" }: { metric: UsageMetric; className?: string; trigger?: "view" | "change" }) {
  if (metric.unit === "bytes") return <span className={cn("tabular-nums", className)}>{formatBytes(metric.used)}</span>;
  if (metric.unit === "minutes") {
    const hours = metric.used >= 120;
    return (
      <span className={cn("inline-flex items-baseline tabular-nums", className)}>
        <Odometer value={hours ? Math.round(metric.used / 60) : metric.used} trigger={trigger} />
        <span className="ml-1 text-[0.5em] font-medium tracking-normal text-muted-foreground">{hours ? "h" : "min"}</span>
      </span>
    );
  }
  return <Odometer value={metric.used} format={metric.unit === "tokens" ? { notation: "compact", maximumFractionDigits: 1 } : undefined} trigger={trigger} className={className} />;
}

/**
 * Usage ring (server-safe): a 300° arc that fills to used / limit.
 * - metered hard limits draw in signal, warning from 70% and danger from 90% (same as the dashboard);
 * - capacity (projects, seats) stays neutral, so 1 of 1 seat is never red;
 * - unlimited shows a faint full ring with ∞.
 * Exposed as role=img with "AI requests: 12 of 50 (24%)".
 */
export function UsageRing({ metric, size = "md", className, showPercent = true }: { metric: UsageMetric; size?: keyof typeof SIZES; className?: string; showPercent?: boolean }) {
  const px = SIZES[size];
  const stroke = size === "sm" ? 4 : size === "md" ? 5.5 : 6.5;
  const r = (px - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const arc = (circumference * 300) / 360;
  const unlimited = isUnlimited(metric.limit);
  const ratio = unlimited ? 1 : ratioOf(metric);
  const tone = toneOf(metric);
  const pct = Math.round(ratioOf(metric) * 100);
  const offset = arc * (1 - ratio);
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: px, height: px }} aria-hidden="true">
      <svg viewBox={`0 0 ${px} ${px}`} width={px} height={px} className="rotate-[120deg]">
        <circle cx={px / 2} cy={px / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${arc} ${circumference}`} />
        <circle
          className="gauge-arc"
          cx={px / 2}
          cy={px / 2}
          r={r}
          fill="none"
          stroke={STROKE[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
          strokeDashoffset={offset}
          opacity={ratio === 0 ? 0 : 1}
          style={{ "--gauge-len": `${arc}px` } as React.CSSProperties}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        {unlimited ? (
          <InfinityIcon className={size === "sm" ? "size-3.5 text-muted-foreground" : "size-4 text-muted-foreground"} />
        ) : showPercent ? (
          <span className={cn("font-mono font-medium tabular-nums", size === "sm" ? "text-[10px]" : size === "md" ? "text-[13px]" : "text-base", tone === "danger" ? "text-danger" : tone === "warn" ? "text-warning" : "text-foreground")}>
            {pct}
            <span className="text-[0.75em] text-muted-foreground">%</span>
          </span>
        ) : null}
      </span>
    </span>
  );
}

/** A full gauge tile: ring, label, odometer numeral against the limit, and a hint line. */
export function UsageGauge({ metric, className, size = "md", trigger = "view" }: { metric: UsageMetric; className?: string; size?: "md" | "lg"; trigger?: "view" | "change" }) {
  const tone = toneOf(metric);
  const pct = Math.round(ratioOf(metric) * 100);
  const label = isUnlimited(metric.limit) ? `${metric.label}: ${describeUsage(metric)}` : `${metric.label}: ${describeUsage(metric)} (${pct}%)`;
  return (
    <div role="img" aria-label={label} className={cn("flex items-center gap-4", className)}>
      <UsageRing metric={metric} size={size} />
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          {metric.label}
          {tone === "warn" ? <span className="rounded-full bg-warning/12 px-1.5 text-[10.5px] font-medium leading-4 text-warning">Near limit</span> : null}
          {tone === "danger" ? <span className="rounded-full bg-danger/12 px-1.5 text-[10.5px] font-medium leading-4 text-danger">{pct >= 100 ? "Limit reached" : "Almost full"}</span> : null}
        </p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
          <UsageNumber metric={metric} trigger={trigger} className={cn("font-display font-semibold tracking-[-0.03em]", size === "lg" ? "text-[30px] leading-9" : "text-[24px] leading-8")} />
          <span className="text-[13px] tabular-nums text-muted-foreground">/ {formatLimit(metric)}</span>
        </p>
        {metric.hint ? <p className="mt-0.5 text-xs text-foreground-dim">{metric.hint}</p> : null}
      </div>
    </div>
  );
}
