import Link from "next/link";
import { ExternalLink, Receipt } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { getWorkspaceEntitlements } from "@/lib/services/usage";
import { countProjects } from "@/lib/services/projects";
import { listMembers } from "@/lib/services/workspaces";
import { getBillingOverview } from "@/lib/billing/service";
import { PLANS, formatPrice } from "@/config/plans";
import { PageHeader } from "@/components/app/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, EmptyState } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { UsageMeters } from "@/components/settings/usage-meters";
import { BillingActions, CheckoutResultBanner, PaymentsNotConfigured } from "@/components/settings/billing-actions";

export const metadata = pageMetadata({ title: "Billing", description: "Your plan, invoices, upgrades and cancellation.", path: "/settings/billing", noindex: true });

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  active: { label: "Active", variant: "success" },
  trialing: { label: "Trial", variant: "success" },
  past_due: { label: "Payment overdue", variant: "warning" },
  canceled: { label: "Canceled", variant: "default" },
  incomplete: { label: "Incomplete", variant: "warning" },
};

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
  const [overview, entitlements, projects, members] = await Promise.all([getBillingOverview(ws), getWorkspaceEntitlements(ws), countProjects(ws.id), listMembers(ws.id)]);
  const sub = overview.subscription;
  const def = PLANS[overview.plan];
  const showSub = sub && sub.provider !== "manual" && sub.status !== "canceled";
  const periodEnd = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description={`Plan and invoices for ${ws.name}.`} />
      <CheckoutResultBanner result={checkout ?? null} />
      <PaymentsNotConfigured providers={overview.providers} />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              {def.name} plan
              {showSub ? <Badge variant={STATUS[sub.status]?.variant ?? "default"}>{STATUS[sub.status]?.label ?? sub.status}</Badge> : overview.plan === "free" ? <Badge>Free</Badge> : null}
              {sub?.provider === "manual" && sub.status === "active" ? <Badge variant="accent">Assigned by Codexa staff</Badge> : null}
            </CardTitle>
            <CardDescription>{def.tagline}</CardDescription>
          </div>
          {showSub ? (
            <p className="text-right text-sm">
              <span className="text-xl font-semibold tabular-nums">{formatPrice(sub.amountMinor, sub.currency)}</span>
              <span className="text-muted-foreground"> / {sub.interval === "year" ? "year" : "month"}</span>
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {showSub ? (
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-muted-foreground">Billing interval</dt>
                <dd className="font-medium capitalize">{sub.interval === "year" ? "Annual" : "Monthly"}</dd>
              </div>
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-muted-foreground">Provider</dt>
                <dd className="font-medium capitalize">{sub.provider}</dd>
              </div>
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-muted-foreground">{sub.cancelAtPeriodEnd ? "Access ends" : sub.status === "past_due" ? "Access continues until" : "Renews on"}</dt>
                <dd className="font-medium">{periodEnd ? periodEnd.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</dd>
              </div>
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-muted-foreground">Currency</dt>
                <dd className="font-medium">{sub.currency}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              {overview.plan === "free" ? "The Free plan is free forever. Upgrade when you need more AI requests, runtime or seats." : "This plan was assigned without an online subscription."}
              {sub?.provider === "manual" && periodEnd ? ` It is valid until ${periodEnd.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.` : ""}
            </p>
          )}
          {showSub && sub.cancelAtPeriodEnd ? <Alert variant="warning">This subscription is scheduled to cancel. You keep {def.name} features until the date above, then the workspace returns to Free.</Alert> : null}
          {showSub && sub.status === "past_due" ? <Alert variant="danger" title="Your last payment failed">Update your payment method to keep {def.name} features. If payment is not received before the period ends, the workspace falls back to the Free plan.</Alert> : null}
          <BillingActions workspaceId={ws.id} overview={overview} role={current.role} defaultCurrency={ws.billingCurrency} userEmail={user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage this period</CardTitle>
          <CardDescription>
            Limits are enforced when you generate, run or deploy. Full details on the{" "}
            <Link href="/settings/usage" className="underline">
              Usage
            </Link>{" "}
            page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsageMeters entitlements={entitlements} counts={{ projects, members: members.length }} showUpgrade={false} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Receipts are issued by the payment provider. Open one to download a PDF.</CardDescription>
        </CardHeader>
        <CardContent>
          {overview.invoices.length === 0 ? (
            <EmptyState icon={<Receipt className="size-6" />} title="No invoices yet" description="Invoices appear here after your first payment." className="p-6" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Date
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Period
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Amount
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      <span className="sr-only">Link</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {overview.invoices.map((i) => (
                    <tr key={i.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{new Date(i.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                        {i.periodStart && i.periodEnd ? `${new Date(i.periodStart).toLocaleDateString()} – ${new Date(i.periodEnd).toLocaleDateString()}` : "—"}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{formatPrice(i.amountMinor, i.currency)}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={i.status === "paid" ? "success" : i.status === "failed" ? "danger" : "warning"} className="capitalize">
                          {i.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-right">
                        {i.hostedUrl ? (
                          <a href={i.hostedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            View <ExternalLink className="size-3" aria-hidden="true" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">{i.provider} · {i.providerInvoiceId.slice(0, 12)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Questions about a charge? See the{" "}
        <Link href="/billing-faq" className="underline">
          billing FAQ
        </Link>{" "}
        and{" "}
        <Link href="/refund-policy" className="underline">
          refund policy
        </Link>
        , or email support@codexa.app.
      </p>
    </div>
  );
}
