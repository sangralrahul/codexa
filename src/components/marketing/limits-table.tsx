import { PLANS, PLAN_ORDER, formatPrice, isUnlimited } from "@/config/plans";
import { ComparisonTable, type Cell, type ColumnHead, type ComparisonGroup } from "./comparison-table";

const n = (v: number) => (isUnlimited(v) ? "Custom" : new Intl.NumberFormat("en-US").format(v));
const hours = (min: number) => (isUnlimited(min) ? "Custom" : `${n(min / 60)} hours`);
const gb = (mb: number) => (isUnlimited(mb) ? "Custom" : mb >= 1000 ? `${mb / 1000} GB` : `${mb} MB`);

/**
 * Usage limits and features for every plan, derived from PLANS so the page cannot drift from
 * enforcement. The header row (plan, monthly USD price, CTA) sticks from md up; the plan marked
 * `highlight` gets the signal rails.
 */
export function LimitsTable({ full = false, className }: { full?: boolean; className?: string }) {
  const plans = PLAN_ORDER.map((id) => PLANS[id]);
  const head: ColumnHead[] = plans.map((p) => ({
    sub: p.prices ? (p.prices.USD.month === 0 ? "Free" : `${formatPrice(p.prices.USD.month, "USD")} / month`) : "Custom pricing",
    href: p.cta.href,
    cta: p.cta.label,
  }));
  const highlight = plans.findIndex((p) => p.highlight);
  const row = (label: string, f: (p: (typeof plans)[number]) => Cell, hint?: string) => ({ label, values: plans.map(f), hint });
  const groups: ComparisonGroup[] = [
    {
      heading: "Monthly limits",
      rows: [
        row("AI requests", (p) => n(p.limits.aiRequestsPerMonth), "One per generation run"),
        row("AI tokens", (p) => n(p.limits.aiTokensPerMonth), "Input + output, as reported by the provider"),
        row("Preview runtime", (p) => hours(p.limits.runtimeMinutesPerMonth)),
        row("Deployments", (p) => n(p.limits.deploymentsPerMonth)),
      ],
    },
    {
      heading: "Workspace limits",
      rows: [
        row("Projects", (p) => n(p.limits.projects)),
        row("Members", (p) => n(p.limits.members)),
        row("Storage", (p) => gb(p.limits.storageMb), "Files and snapshots"),
        row("Concurrent runtimes", (p) => n(p.limits.concurrentRuntimes)),
        row("Custom domains", (p) => (p.limits.customDomains === 0 ? false : n(p.limits.customDomains))),
      ],
    },
  ];
  if (full) {
    groups.push(
      {
        heading: "Features",
        rows: [
          row("Private projects", (p) => p.limits.privateProjects),
          row("Priority support", (p) => p.limits.prioritySupport),
          row("AI agent (Build, Ask, Fix)", () => "With operator-configured key"),
          row("Monaco editor, snapshots, diffs", () => true),
          row("Isolated sandbox previews", () => true),
          row("Codexa static hosting with rollback", () => true),
          row("Vercel adapter", () => "With token"),
          row("GitHub import, commit, push", () => "With OAuth configured"),
          row("PostgreSQL and Supabase connections", () => true),
          row("Encrypted environment variables", () => true),
          row("Roles and invitations", (p) => (p.limits.members > 1 || isUnlimited(p.limits.members) ? true : false)),
          row("Realtime presence", (p) => (p.limits.members > 1 || isUnlimited(p.limits.members) ? true : false)),
          row("Audit log export", (p) => (p.id === "enterprise" ? "On request" : false)),
          row("Dedicated environment", (p) => p.id === "enterprise"),
          row("Invoice billing", (p) => p.id === "enterprise"),
          row("SSO / SAML", () => "Roadmap"),
        ],
      },
      {
        heading: "Billing",
        rows: [
          row("Currencies", (p) => (p.prices ? "INR, USD" : "Per agreement")),
          row("Intervals", (p) => (p.prices ? "Monthly, annual" : "Per agreement")),
          row("Payment providers", (p) => (p.prices ? "Razorpay (INR), Stripe (USD)" : "Invoice")),
        ],
      },
    );
  }
  return <ComparisonTable caption="Plan limits and features" columns={plans.map((p) => p.name)} groups={groups} highlightColumn={highlight >= 0 ? highlight : undefined} head={head} collapsible={full} className={className} />;
}
