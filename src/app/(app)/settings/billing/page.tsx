import Link from "next/link";
import { ArrowUpRight, BookOpen, LifeBuoy, Mail, Receipt, RotateCcw } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { getWorkspaceEntitlements } from "@/lib/services/usage";
import { countProjects } from "@/lib/services/projects";
import { getTeam } from "@/lib/billing/team-service";
import { getBillingOverview } from "@/lib/billing/service";
import { site } from "@/config/site";
import { PLANS, formatPrice } from "@/config/plans";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/app/app-shell";
import { SettingsCard } from "@/components/settings/section";
import { Alert, EmptyState } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { UsageMeters } from "@/components/settings/usage-meters";
import { InvoicesTable, PlanIncludes, UnlockDiff } from "@/components/settings/billing-panels";
import { nextPlan } from "@/components/settings/usage-model";
import { BillingActions, CheckoutResultBanner, PaymentsNotConfigured, PlanCards } from "@/components/settings/billing-actions";

export const metadata = pageMetadata({ title: "Billing", description: "Your plan, invoices, upgrades and cancellation.", path: "/settings/billing", noindex: true });

const STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: "Active", tone: "bg-success/12 text-success" },
  trialing: { label: "Trial", tone: "bg-success/12 text-success" },
  past_due: { label: "Payment overdue", tone: "bg-warning/12 text-warning" },
  canceled: { label: "Canceled", tone: "bg-muted text-muted-foreground" },
  incomplete: { label: "Incomplete", tone: "bg-warning/12 text-warning" },
};

const longDate = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export default async function BillingSettingsPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const user = await requireUser("/settings/billing");
  const { current } = await getCurrentWorkspace(user);
  const { checkout } = await searchParams;
  if (!current) {
    return (
      <div>
        <PageHeader title="Billing" />
        <EmptyState title="No workspace selected" action={<Link href="/settings/workspaces/new" className={buttonClasses()}>Create workspace</Link>} />
      </div>
    );
  }
  const ws = current.workspace;
  const [overview, entitlements, projects, team] = await Promise.all([getBillingOverview(ws), getWorkspaceEntitlements(ws), countProjects(ws.id), getTeam(ws.id)]);
  const sub = overview.subscription;
  const def = PLANS[overview.plan];
  const showSub = sub && sub.provider !== "manual" && sub.status !== "canceled";
  const paidActive = Boolean(showSub && (sub.status === "active" || sub.status === "trialing"));
  const periodEnd = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
  const up = nextPlan(overview.plan);
  const pending = team.invites.filter((i) => !i.expired).length;
  const status = showSub ? STATUS[sub.status] : null;
  const checkoutReady = ws.billingCurrency === "INR" ? overview.providers.razorpay : overview.providers.stripe;

  const hero = (
    <section id="plan" aria-labelledby="plan-title" className={cn("relative overflow-hidden", paidActive ? "comet-border__inner" : "settings-card rounded-[18px]")}>
      <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-8">
        <div className="flex min-w-0 flex-col">
          <p className="flex flex-wrap items-center gap-2 font-mono text-xs text-foreground-dim">
            Current plan · {ws.name}
            {status ? <span className={cn("rounded-full px-2 py-0.5 font-sans text-[11px] font-medium", status.tone)}>{status.label}</span> : null}
            {sub?.provider === "manual" && sub.status === "active" ? <span className="rounded-full bg-accent/12 px-2 py-0.5 font-sans text-[11px] font-medium text-accent">Assigned by Codexa staff</span> : null}
          </p>
          <h2 id="plan-title" className="text-app-display mt-3 text-balance">
            You&apos;re on <span className="text-dim">{def.name}</span>
          </h2>
          <p className="mt-2 max-w-prose text-[14px] text-muted-foreground">{def.tagline}</p>
          {showSub ? (
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 rounded-[12px] border border-border/80 bg-surface/50 p-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Price</dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {formatPrice(sub.amountMinor, sub.currency)}
                  <span className="text-xs font-normal text-muted-foreground"> / {sub.interval === "year" ? "yr" : "mo"}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Provider</dt>
                <dd className="mt-0.5 font-medium capitalize">{sub.provider}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{sub.cancelAtPeriodEnd ? "Access ends" : sub.status === "past_due" ? "Access until" : "Renews on"}</dt>
                <dd className="mt-0.5 font-mono text-[13px] font-medium">{periodEnd ? periodEnd.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Billing</dt>
                <dd className="mt-0.5 font-medium">
                  {sub.interval === "year" ? "Annual" : "Monthly"} · {sub.currency}
                </dd>
              </div>
            </dl>
          ) : (
            <>
              <p className="mt-5 text-[13px] text-muted-foreground">
                {overview.plan === "free" ? "Free forever. No card on file, nothing to cancel." : "This plan was assigned without an online subscription."}
                {sub?.provider === "manual" && periodEnd ? ` It is valid until ${longDate(periodEnd)}.` : ""}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-border/80 bg-border/80 text-sm">
                <div className="bg-card/90 p-3.5">
                  <dt className="text-xs text-muted-foreground">Billing currency</dt>
                  <dd className="mt-0.5 font-medium">
                    {ws.billingCurrency} · {ws.billingCurrency === "INR" ? "Razorpay" : "Stripe"}
                  </dd>
                </div>
                <div className="bg-card/90 p-3.5">
                  <dt className="text-xs text-muted-foreground">Online checkout</dt>
                  <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
                    <span aria-hidden="true" className={cn("size-1.5 rounded-full", checkoutReady ? "bg-success" : "bg-foreground-dim")} />
                    {checkoutReady ? "Available" : "Not configured"}
                  </dd>
                </div>
                <div className="bg-card/90 p-3.5">
                  <dt className="text-xs text-muted-foreground">Seats</dt>
                  <dd className="mt-0.5 font-medium tabular-nums">
                    {team.members.length + pending} of {def.limits.members < 0 ? "unlimited" : def.limits.members}
                  </dd>
                </div>
                <div className="bg-card/90 p-3.5">
                  <dt className="text-xs text-muted-foreground">Workspace since</dt>
                  <dd className="mt-0.5 font-mono text-[13px] font-medium">{ws.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}</dd>
                </div>
              </dl>
            </>
          )}
          <div className="mt-4 space-y-3">
            {showSub && sub.cancelAtPeriodEnd ? <Alert variant="warning">This subscription is scheduled to cancel. You keep {def.name} features until the date above, then the workspace returns to Free.</Alert> : null}
            {showSub && sub.status === "past_due" ? <Alert variant="danger" title="Your last payment failed">Update your payment method to keep {def.name} features. If payment is not received before the period ends, the workspace falls back to the Free plan.</Alert> : null}
          </div>
          <div className="mt-auto pt-5">
            <BillingActions workspaceId={ws.id} overview={overview} role={current.role} />
          </div>
        </div>
        <div className="min-w-0">{up ? <UnlockDiff from={overview.plan} to={up} currency={ws.billingCurrency} /> : <PlanIncludes plan={overview.plan} />}</div>
      </div>
    </section>
  );

  return (
    <div className="settings-stack space-y-6">
      <PageHeader eyebrow={`Workspace · ${ws.name}`} title="Billing" description="Your plan, what the next one unlocks, invoices and help. Prices and limits come straight from the plan configuration." />
      <CheckoutResultBanner result={checkout ?? null} />

      {paidActive ? (
        <div className="comet-border rounded-[20px]" data-active="">
          {hero}
        </div>
      ) : (
        hero
      )}

      {overview.plan === "enterprise" ? <PaymentsNotConfigured providers={overview.providers} /> : null}
      {overview.plan !== "enterprise" ? (
        <section id="plans" aria-labelledby="plans-title" className="scroll-mt-24 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="plans-title" className="text-[15px] font-semibold tracking-[-0.01em]">
                {overview.plan === "free" ? "Upgrade" : "Change plan"}
              </h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">Monthly or annual, in USD (Stripe) or INR (Razorpay). Change or cancel any time.</p>
            </div>
          </div>
          <PaymentsNotConfigured providers={overview.providers} />
          <PlanCards workspaceId={ws.id} overview={overview} role={current.role} defaultCurrency={ws.billingCurrency} userEmail={user.email} />
        </section>
      ) : null}

      <SettingsCard
        id="usage"
        title="Usage this period"
        description="Metered from real events. Limits are enforced when you generate, run or deploy."
        actions={
          <Link href="/settings/usage" className="link-draw inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            Full breakdown <ArrowUpRight className="size-3" aria-hidden="true" />
          </Link>
        }
      >
        <UsageMeters entitlements={entitlements} counts={{ projects, members: team.members.length, pending }} showUpgrade={false} only={["ai_request", "runtime_minutes", "deployment", "storage_bytes", "projects", "seats"]} />
      </SettingsCard>

      <SettingsCard id="invoices" icon={<Receipt />} title="Invoices" description="Receipts are issued by the payment provider. Open one to download a PDF." bodyClassName={overview.invoices.length === 0 ? "pt-2" : "p-0 pt-4"}>
        <InvoicesTable invoices={overview.invoices} plan={overview.plan} since={(sub?.currentPeriodStart ?? ws.createdAt.toISOString())} />
      </SettingsCard>

      <nav aria-label="Billing help" className="settings-plain grid gap-3 sm:grid-cols-3">
        {[
          { href: "/billing-faq", icon: BookOpen, title: "Billing FAQ", body: "Plans, limits, taxes and currencies." },
          { href: "/refund-policy", icon: RotateCcw, title: "Refund policy", body: "What is refundable, and how." },
          { href: `mailto:${site.company.supportEmail}?subject=${encodeURIComponent(`Billing question · ${ws.name}`)}`, icon: Mail, title: "Email support", body: site.company.supportEmail },
        ].map((h) => (
          <a key={h.title} href={h.href} className="group flex items-start gap-3 rounded-[14px] border border-border bg-card/70 p-4 outline-none transition-colors hover:border-border-strong hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span className="icon-tile flex size-8 shrink-0 items-center justify-center rounded-[9px]">
              <h.icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-[13.5px] font-medium">
                {h.title}
                <ArrowUpRight className="size-3.5 text-foreground-dim transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
              <span className="block truncate text-xs text-muted-foreground">{h.body}</span>
            </span>
          </a>
        ))}
      </nav>
      <p className="settings-plain flex items-center gap-2 text-xs text-foreground-dim">
        <LifeBuoy className="size-3.5" aria-hidden="true" /> Questions about a charge? Include the invoice date and the workspace name.
      </p>
    </div>
  );
}
