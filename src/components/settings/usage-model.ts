/**
 * Pure usage helpers shared by the settings pages (server and client) and safe to unit test.
 *
 * Thresholds match the dashboard's UsageCard (Meter defaults): warning from 70% and danger
 * from 90% of a metered, hard limit. Capacity counts (projects, seats) are never coloured as
 * a warning or an error: being at 1 of 1 seat is the normal state of a solo workspace.
 */
import { PLANS, PLAN_ORDER, isUnlimited } from "@/config/plans";
import type { Plan } from "@/db/schema";
import { formatBytes } from "@/lib/utils";

export const USAGE_WARN_AT = 0.7;
export const USAGE_DANGER_AT = 0.9;

export type UsageMetricKey = "ai_request" | "ai_tokens" | "runtime_minutes" | "deployment" | "storage_bytes" | "projects" | "seats";
export type UsageUnit = "count" | "tokens" | "minutes" | "bytes";

export type UsageMetric = {
  key: UsageMetricKey;
  label: string;
  /** Used amount in the metric's unit. */
  used: number;
  /** -1 = unlimited. */
  limit: number;
  unit: UsageUnit;
  /** Capacity (projects, seats) is neutral: no warning or danger colours. */
  capacity: boolean;
  /** One short line of context ("Includes 1 pending invitation"). */
  hint?: string;
};

export type UsageTone = "neutral" | "ok" | "warn" | "danger" | "unlimited";

type EntitlementsLike = {
  plan: Plan;
  limits: { aiRequestsPerMonth: number; aiTokensPerMonth: number; runtimeMinutesPerMonth: number; deploymentsPerMonth: number; storageMb: number; projects: number; members: number };
  used: { ai_request: number; ai_tokens: number; runtime_minutes: number; deployment: number; storage_bytes: number };
};

/** Every metric shown in settings, in display order. `seats` counts members plus pending, unexpired invitations. */
export function usageMetrics(e: EntitlementsLike, counts: { projects: number; members: number; pending?: number }): UsageMetric[] {
  const l = e.limits;
  const pending = counts.pending ?? 0;
  return [
    { key: "ai_request", label: "AI requests", used: e.used.ai_request, limit: l.aiRequestsPerMonth, unit: "count", capacity: false },
    { key: "ai_tokens", label: "AI tokens", used: e.used.ai_tokens, limit: l.aiTokensPerMonth, unit: "tokens", capacity: false },
    { key: "runtime_minutes", label: "Preview runtime", used: e.used.runtime_minutes, limit: l.runtimeMinutesPerMonth, unit: "minutes", capacity: false },
    { key: "deployment", label: "Deployments", used: e.used.deployment, limit: l.deploymentsPerMonth, unit: "count", capacity: false },
    {
      key: "storage_bytes",
      label: "Storage",
      used: e.used.storage_bytes,
      limit: isUnlimited(l.storageMb) ? -1 : l.storageMb * 1024 * 1024,
      unit: "bytes",
      capacity: false,
      hint: "Project files stored in this workspace.",
    },
    { key: "projects", label: "Projects", used: counts.projects, limit: l.projects, unit: "count", capacity: true, hint: "Active projects. Deleted projects do not count." },
    {
      key: "seats",
      label: "Seats",
      used: counts.members + pending,
      limit: l.members,
      unit: "count",
      capacity: true,
      hint: pending > 0 ? `${counts.members} member${counts.members === 1 ? "" : "s"} and ${pending} pending invitation${pending === 1 ? "" : "s"}.` : "Pending invitations also take a seat.",
    },
  ];
}

export function ratioOf(m: Pick<UsageMetric, "used" | "limit">): number {
  if (isUnlimited(m.limit) || m.limit <= 0) return 0;
  return Math.min(1, Math.max(0, m.used / m.limit));
}

export function toneOf(m: Pick<UsageMetric, "used" | "limit" | "capacity">): UsageTone {
  if (isUnlimited(m.limit)) return "unlimited";
  if (m.capacity) return "neutral";
  const r = ratioOf(m);
  if (r >= USAGE_DANGER_AT) return "danger";
  if (r >= USAGE_WARN_AT) return "warn";
  return "ok";
}

/**
 * The limited metric closest to its limit (metered limits win ties over capacity). Seats are left
 * out: 1 of 1 seat is the normal state of a solo workspace, not news. Null when everything is unlimited.
 */
export function closestToLimit(metrics: UsageMetric[]): UsageMetric | null {
  const limited = metrics.filter((m) => !isUnlimited(m.limit) && m.key !== "ai_tokens" && m.key !== "seats");
  if (!limited.length) return null;
  return [...limited].sort((a, b) => ratioOf(b) - ratioOf(a) || Number(a.capacity) - Number(b.capacity))[0];
}

const nf = (n: number) => n.toLocaleString("en-US");
const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

/** Human value in the metric's unit ("1.2M", "5 h", "240 MB", "12"). */
export function formatAmount(unit: UsageUnit, n: number): string {
  if (unit === "tokens") return compact(n);
  if (unit === "bytes") return formatBytes(n);
  if (unit === "minutes") return n >= 120 ? `${nf(Math.round(n / 60))} h` : `${nf(n)} min`;
  return nf(n);
}

export function formatLimit(m: Pick<UsageMetric, "unit" | "limit">): string {
  return isUnlimited(m.limit) ? "Unlimited" : formatAmount(m.unit, m.limit);
}

/** "12 of 50", "1 of 1", "3.2 MB of 250 MB", "4 used, unlimited". */
export function describeUsage(m: UsageMetric): string {
  if (isUnlimited(m.limit)) return `${formatAmount(m.unit, m.used)} used, unlimited`;
  return `${formatAmount(m.unit, m.used)} of ${formatAmount(m.unit, m.limit)}`;
}

/** Billing period facts (calendar month, UTC): "Day 26 of 31", resets on the 1st. */
export function periodInfo(periodStart: Date, now = new Date()) {
  const start = Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), 1);
  const resetsAt = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1));
  const days = Math.round((resetsAt.getTime() - start) / 86_400_000);
  const day = Math.min(days, Math.max(1, Math.floor((now.getTime() - start) / 86_400_000) + 1));
  return { day, days, daysLeft: days - day + 1, resetsAt, start: new Date(start), label: new Date(start).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }) };
}

/** The next plan (in PLAN_ORDER) whose seat limit is higher than `plan`'s, with how many seats it has. */
export function nextSeatsPlan(plan: Plan): { id: Plan; name: string; seats: number } | null {
  const current = PLANS[plan].limits.members;
  if (isUnlimited(current)) return null;
  for (const id of PLAN_ORDER.slice(PLAN_ORDER.indexOf(plan) + 1)) {
    const seats = PLANS[id].limits.members;
    if (isUnlimited(seats) || seats > current) return { id, name: PLANS[id].name, seats };
  }
  return null;
}

/** The next purchasable plan up, for the "Unlock with …" diff (null for Team and Enterprise). */
export function nextPlan(plan: Plan): Plan | null {
  const order: Plan[] = ["free", "pro", "team"];
  const i = order.indexOf(plan);
  return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
}

export type DiffLine = { label: string; from: string; to: string };

/**
 * "Unlock with Pro" lines, generated from PLANS: one line per limit that differs between
 * the two plans (`- 3 projects` / `+ 25 projects`). Nothing here is hand-written copy.
 */
export function planDiff(from: Plan, to: Plan): DiffLine[] {
  const a = PLANS[from].limits;
  const b = PLANS[to].limits;
  const n = (v: number, unit: string, plural = `${unit}s`) => (isUnlimited(v) ? `Unlimited ${plural}` : `${nf(v)} ${v === 1 ? unit : plural}`);
  const hours = (v: number) => (isUnlimited(v) ? "Unlimited preview hours" : `${nf(Math.round(v / 60))} preview hours / month`);
  const storage = (mb: number) => (isUnlimited(mb) ? "Unlimited storage" : `${mb >= 1000 ? `${nf(mb / 1000)} GB` : `${nf(mb)} MB`} storage`);
  const rows: [string, string, string][] = [
    ["projects", n(a.projects, "project"), n(b.projects, "project")],
    ["seats", n(a.members, "seat"), n(b.members, "seat")],
    ["ai", `${isUnlimited(a.aiRequestsPerMonth) ? "Unlimited" : nf(a.aiRequestsPerMonth)} AI requests / month`, `${isUnlimited(b.aiRequestsPerMonth) ? "Unlimited" : nf(b.aiRequestsPerMonth)} AI requests / month`],
    ["runtime", hours(a.runtimeMinutesPerMonth), hours(b.runtimeMinutesPerMonth)],
    ["deploys", `${isUnlimited(a.deploymentsPerMonth) ? "Unlimited" : nf(a.deploymentsPerMonth)} deployments / month`, `${isUnlimited(b.deploymentsPerMonth) ? "Unlimited" : nf(b.deploymentsPerMonth)} deployments / month`],
    ["storage", storage(a.storageMb), storage(b.storageMb)],
    ["concurrent", n(a.concurrentRuntimes, "running preview"), n(b.concurrentRuntimes, "running preview")],
    ["domains", a.customDomains === 0 ? "No custom domains" : n(a.customDomains, "custom domain"), b.customDomains === 0 ? "No custom domains" : n(b.customDomains, "custom domain")],
    ["support", a.prioritySupport ? "Priority support" : "Community support", b.prioritySupport ? "Priority support" : "Community support"],
  ];
  return rows.filter(([, x, y]) => x !== y).map(([label, x, y]) => ({ label, from: x, to: y }));
}

/** Relative time in the app's voice ("just now", "4 min ago", "3 h ago", "2 days ago", then a date). */
export function relativeTime(iso: string | Date, now = Date.now()): string {
  const t = typeof iso === "string" ? new Date(iso).getTime() : iso.getTime();
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: new Date(t).getFullYear() === new Date(now).getFullYear() ? undefined : "numeric" });
}

/** Absolute date and time for tooltips and <time title>. */
export function absoluteTime(iso: string | Date): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
