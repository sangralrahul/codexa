import Link from "next/link";
import { StatusDot } from "@/components/ui/misc";
import { getStatus } from "@/app/(marketing)/status/health";

type Summary = { label: string; dot: "ok" | "warn" | "error" | "idle" };

const TTL_MS = 60_000;
// Only the settled value is reused: on Workers a pending promise must not be shared across requests.
let memo: { at: number; value: Summary } | null = null;

async function summarize(): Promise<Summary> {
  const report = await getStatus();
  if (report.overall === "down") return { label: "Some systems down", dot: "error" };
  if (report.overall === "degraded") return { label: "Degraded performance", dot: "warn" };
  const missing = report.components.filter((c) => c.state === "not_configured").length;
  return missing ? { label: `Operational · ${missing} not configured`, dot: "ok" } : { label: "Operational", dot: "ok" };
}

/** The same checks as /status, reused for a minute per server instance so every page view does not probe the runner. */
async function statusSummary(): Promise<Summary> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.value;
  try {
    const value = await summarize();
    memo = { at: Date.now(), value };
    return value;
  } catch {
    return { label: "Status unavailable", dot: "idle" };
  }
}

const pill = "inline-flex h-7 items-center gap-2 rounded-full border border-border bg-background/60 px-3 text-xs font-medium text-foreground/85 transition-colors hover:border-border-strong hover:text-foreground";

/** Footer status pill: the real overall state from the status checks (streams in; never blocks the page). */
export async function FooterStatus() {
  const s = await statusSummary();
  return (
    <Link href="/status" className={pill}>
      <StatusDot status={s.dot} />
      {s.label}
    </Link>
  );
}

export function FooterStatusFallback() {
  return (
    <Link href="/status" className={pill}>
      <StatusDot status="idle" />
      Status
    </Link>
  );
}
