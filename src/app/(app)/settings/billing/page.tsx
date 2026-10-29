import Link from "next/link";
import { ArrowUpRight, BookOpen, CreditCard, Gauge, LifeBuoy, Mail, Receipt, RotateCcw } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { getWorkspaceEntitlements } from "@/lib/services/usage";
import { countProjects } from "@/lib/services/projects";
import { getTeam } from "@/lib/billing/team-service";
import { getBillingOverview } from "@/lib/billing/service";
import { site } from "@/config/site";
import { PageHeader } from "@/components/app/app-shell";
import { NoWorkspace } from "@/components/settings/no-workspace";
import { SettingsCard } from "@/components/settings/section";
import { UsageMeters } from "@/components/settings/usage-meters";
import { InvoicesTable, PlanHero, isPaidActive } from "@/components/settings/billing-panels";
import { CheckoutResultBanner, PaymentsNotConfigured, PlanCards } from "@/components/settings/billing-actions";

export const metadata = pageMetadata({ title: "Billing", description: "Your plan, invoices, upgrades and cancellation.", path: "/settings/billing", noindex: true });

export default async function BillingSettingsPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const user = await requireUser("/settings/billing");
  const { current } = await getCurrentWorkspace(user);
  const { checkout } = await searchParams;
  if (!current) {
    return <NoWorkspace title="Billing" what="its plan and invoices" />;
  }
  const ws = current.workspace;
  const [overview, entitlements, projects, team] = await Promise.all([getBillingOverview(ws), getWorkspaceEntitlements(ws), countProjects(ws.id), getTeam(ws.id)]);
  const sub = overview.subscription;
  const pending = team.invites.filter((i) => !i.expired).length;
  const hero = (
    <PlanHero
      workspace={{ id: ws.id, name: ws.name, billingCurrency: ws.billingCurrency, createdAt: ws.createdAt.toISOString() }}
      overview={overview}
      role={current.role}
      seats={team.members.length + pending}
    />
  );

  return (
    <div className="settings-stack space-y-6">
      <PageHeader eyebrow={`Workspace · ${ws.name}`} title="Billing" description="Your plan, what the next one unlocks, invoices and help. Prices and limits come straight from the plan configuration." />
      <CheckoutResultBanner result={checkout ?? null} />

      {isPaidActive(overview) ? (
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
        icon={<Gauge />}
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

      <SettingsCard id="invoices" icon={<Receipt />} title="Invoices" description="Receipts are issued by the payment provider. Open one to download a PDF." flush bodyClassName={overview.invoices.length === 0 ? "pt-2" : "pt-4"}>
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
              <span className="mt-0.5 block break-words text-xs leading-relaxed text-muted-foreground">{h.body}</span>
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
