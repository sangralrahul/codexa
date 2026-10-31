/** Small server-safe pieces of the Monochrome Grid app shell (used by server and client components). */

/** One thin bar: label, "used / limit" in mono and the fill (warning past 90% of a metered limit). */
export function UsageBar({ label, used, limit, metered }: { label: string; used: number; limit: number; metered?: boolean }) {
  const unlimited = limit < 0;
  const ratio = unlimited || limit <= 0 ? 0 : Math.min(1, used / limit);
  const tone = metered && ratio >= 0.9 ? "error" : metered && ratio >= 0.7 ? "warn" : undefined;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] text-muted-foreground">
        <span className="truncate">{label}</span>
        <span className="app-mono shrink-0 text-foreground">
          {used.toLocaleString("en-US")} / {unlimited ? "Unlimited" : limit.toLocaleString("en-US")}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={unlimited ? undefined : limit}
        aria-valuenow={unlimited ? undefined : Math.min(used, Math.max(limit, 0))}
        aria-valuetext={unlimited ? `${used} used, unlimited` : `${used} of ${limit}`}
        className="app-bar"
        data-tone={tone}
      >
        <span style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  );
}

/** "2m", "3h", "5d": compact relative time. */
export function shortAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return "now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d`;
  return `${Math.round(d / 30)}mo`;
}
