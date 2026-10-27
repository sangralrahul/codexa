import { FileText, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS, formatPrice, isUnlimited } from "@/config/plans";
import type { Plan } from "@/db/schema";
import type { BillingOverview, SerializedInvoice } from "@/lib/billing/service";
import { Alert, StatusDot } from "@/components/ui/misc";
import { BillingActions } from "./billing-actions";
import { tableHead, tableRow } from "./section";
import { nextPlan, planDiff } from "./usage-model";

const STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: "Active", tone: "bg-success/12 text-success" },
  trialing: { label: "Trial", tone: "bg-success/12 text-success" },
  past_due: { label: "Payment overdue", tone: "bg-warning/12 text-warning" },
  canceled: { label: "Canceled", tone: "bg-muted text-muted-foreground" },
  incomplete: { label: "Incomplete", tone: "bg-warning/12 text-warning" },
};

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

/** True only for a real, online, paying subscription (the comet border is reserved for it). */
export function isPaidActive(overview: BillingOverview) {
  const sub = overview.subscription;
  return Boolean(sub && sub.provider !== "manual" && (sub.status === "active" || sub.status === "trialing"));
}

/**
 * Plan hero (server-safe): "You're on <plan>" as the single plan indicator, the facts that apply
 * (subscription terms, or currency / checkout / seats for plans without one), the plan actions and,
 * on the right, the "Unlock with …" diff generated from PLANS (or what the top plan includes).
 * `#plan` is the anchor; the comet border around it is added by the page for an active paid subscription.
 */
export function PlanHero({
  workspace,
  overview,
  role,
  seats,
}: {
  workspace: { id: string; name: string; billingCurrency: "USD" | "INR"; createdAt: string };
  overview: BillingOverview;
  role: "owner" | "admin" | "editor" | "viewer";
  /** Members plus pending, unexpired invitations. */
  seats: number;
}) {
  const sub = overview.subscription;
  const def = PLANS[overview.plan];
  const showSub = sub && sub.provider !== "manual" && sub.status !== "canceled" ? sub : null;
  const paidActive = isPaidActive(overview);
  const up = nextPlan(overview.plan);
  const status = showSub ? STATUS[showSub.status] : null;
  const checkoutReady = workspace.billingCurrency === "INR" ? overview.providers.razorpay : overview.providers.stripe;
  return (
    <section id="plan" aria-labelledby="plan-title" className={cn("relative overflow-hidden", paidActive ? "comet-border__inner" : "settings-card rounded-[18px]")}>
      <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-8">
        <div className="flex min-w-0 flex-col">
          <p className="flex flex-wrap items-center gap-2 font-mono text-xs text-foreground-dim">
            <span className="[overflow-wrap:anywhere]">Current plan · {workspace.name}</span>
            {status ? <span className={cn("rounded-full px-2 py-0.5 font-sans text-[11px] font-medium", status.tone)}>{status.label}</span> : null}
            {sub?.provider === "manual" && sub.status === "active" ? <span className="rounded-full bg-accent/12 px-2 py-0.5 font-sans text-[11px] font-medium text-accent">Assigned by Codexa staff</span> : null}
          </p>
          <h2 id="plan-title" className="text-app-display mt-3 text-balance">
            You&apos;re on <span className="text-dim">{def.name}</span>
          </h2>
          <p className="mt-2 max-w-prose text-[14px] text-muted-foreground">{def.tagline}</p>
          {showSub ? (
            <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-border/80 bg-border/80 text-sm">
              <Fact label="Price">
                <span className="tabular-nums">{formatPrice(showSub.amountMinor, showSub.currency)}</span>
                <span className="text-xs font-normal text-muted-foreground"> / {showSub.interval === "year" ? "yr" : "mo"}</span>
              </Fact>
              <Fact label="Billing">
                {showSub.interval === "year" ? "Annual" : "Monthly"} · {showSub.provider === "razorpay" ? "Razorpay" : showSub.provider === "stripe" ? "Stripe" : showSub.provider}
              </Fact>
              <Fact label={showSub.cancelAtPeriodEnd ? "Access ends" : showSub.status === "past_due" ? "Access until" : "Renews on"} mono>
                {showSub.currentPeriodEnd ? shortDate(showSub.currentPeriodEnd) : "—"}
              </Fact>
              <Fact label="Seats">
                <span className="tabular-nums">
                  {seats} of {isUnlimited(def.limits.members) ? "unlimited" : def.limits.members}
                </span>
              </Fact>
            </dl>
          ) : (
            <>
              <p className="mt-5 text-[13px] text-muted-foreground">
                {overview.plan === "free" ? "Free forever. No card on file, nothing to cancel." : "This plan was assigned without an online subscription."}
                {sub?.provider === "manual" && sub.currentPeriodEnd ? ` It is valid until ${longDate(sub.currentPeriodEnd)}.` : ""}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-border/80 bg-border/80 text-sm">
                <Fact label="Billing currency">
                  {workspace.billingCurrency} · {workspace.billingCurrency === "INR" ? "Razorpay" : "Stripe"}
                </Fact>
                <Fact label="Online checkout">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className={cn("size-1.5 rounded-full", checkoutReady ? "bg-success" : "bg-foreground-dim")} />
                    {checkoutReady ? "Available" : "Not configured"}
                  </span>
                </Fact>
                <Fact label="Seats">
                  <span className="tabular-nums">
                    {seats} of {isUnlimited(def.limits.members) ? "unlimited" : def.limits.members}
                  </span>
                </Fact>
                <Fact label="Workspace since" mono>
                  {shortDate(workspace.createdAt)}
                </Fact>
              </dl>
            </>
          )}
          {showSub && (showSub.cancelAtPeriodEnd || showSub.status === "past_due") ? (
            <div className="mt-4 space-y-3">
              {showSub.cancelAtPeriodEnd ? <Alert variant="warning">This subscription is scheduled to cancel. You keep {def.name} features until the date above, then the workspace returns to Free.</Alert> : null}
              {showSub.status === "past_due" ? <Alert variant="danger" title="Your last payment failed">Update your payment method to keep {def.name} features. If payment is not received before the period ends, the workspace falls back to the Free plan.</Alert> : null}
            </div>
          ) : null}
          {/* Actions follow the facts directly (no flex push), so the column never opens a gap above them. */}
          <div className="mt-6">
            <BillingActions workspaceId={workspace.id} overview={overview} role={role} />
          </div>
        </div>
        <div className="min-w-0">{up ? <UnlockDiff from={overview.plan} to={up} currency={workspace.billingCurrency} /> : <PlanIncludes plan={overview.plan} />}</div>
      </div>
    </section>
  );
}

function Fact({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-card/90 p-3.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 font-medium", mono && "font-mono text-[13px]")}>{children}</dd>
    </div>
  );
}

/**
 * "Unlock with Pro": a mono code diff generated from PLANS (one `-` / `+` pair per limit that
 * differs), revealed line by line when it scrolls into view. Code panes stay dark in both themes.
 */
export function UnlockDiff({ from, to, currency }: { from: Plan; to: Plan; currency: "USD" | "INR" }) {
  const lines = planDiff(from, to);
  const target = PLANS[to];
  const price = target.prices?.[currency];
  let n = 0;
  return (
    <figure data-reveal="" className="unlock-diff flex h-full flex-col overflow-hidden rounded-[14px] border border-code-border bg-code-bg text-code-fg shadow-[inset_0_1px_0_color-mix(in_oklab,white_6%,transparent)]">
      <figcaption className="flex items-center gap-2 border-b border-code-border px-4 py-2.5 font-mono text-[11.5px] text-code-muted">
        <span aria-hidden="true" className="flex gap-1">
          <span className="size-2 rounded-full bg-code-muted/40" />
          <span className="size-2 rounded-full bg-code-muted/40" />
          <span className="size-2 rounded-full bg-code-muted/40" />
        </span>
        <span className="ml-1 truncate">
          plan/{from}.ts → plan/{to}.ts
        </span>
        <span className="ml-auto shrink-0 text-syn-string">+{lines.length}</span>
        <span className="shrink-0 text-syn-tag">-{lines.length}</span>
      </figcaption>
      <div className="flex items-baseline justify-between gap-3 px-4 pt-4">
        <p className="font-display text-[19px] font-semibold tracking-[-0.02em] text-code-fg">Unlock with {target.name}</p>
        {price ? (
          <p className="shrink-0 text-right text-xs tabular-nums text-code-muted">
            from {formatPrice(price.year, currency)}/mo <span className="whitespace-nowrap">billed annually</span>
          </p>
        ) : null}
      </div>
      <ol className="mt-3 flex-1 pb-4 font-mono text-[12.5px] leading-[1.75]" aria-label={`What ${target.name} changes, generated from the plan configuration`}>
        {lines.map((l) => (
          <li key={l.label} className="contents">
            {(["-", "+"] as const).map((sign) => {
              const i = n++;
              return (
                <span
                  key={sign}
                  data-sign={sign}
                  className={cn("unlock-line grid grid-cols-[2.25rem_1rem_minmax(0,1fr)] pr-4", sign === "+" ? "bg-[color-mix(in_oklab,var(--syn-string)_9%,transparent)]" : "bg-[color-mix(in_oklab,var(--syn-tag)_7%,transparent)]")}
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <span aria-hidden="true" className="relative select-none pr-2 text-right text-code-muted/70 tabular-nums">
                    {i + 1}
                  </span>
                  <span aria-hidden="true" className={sign === "+" ? "text-syn-string" : "text-syn-tag"}>
                    {sign}
                  </span>
                  <span className={cn("min-w-0 [overflow-wrap:anywhere]", sign === "+" ? "text-code-fg" : "text-code-muted line-through decoration-code-muted/40")}>
                    <span className="sr-only">{sign === "+" ? `${target.name}: ` : `${PLANS[from].name}: `}</span>
                    {sign === "+" ? l.to : l.from}
                  </span>
                </span>
              );
            })}
          </li>
        ))}
      </ol>
      <p className="border-t border-code-border px-4 py-2 font-mono text-[11px] text-code-muted">Generated from the plan configuration. Limits are enforced on the server.</p>
    </figure>
  );
}

/** What the current plan includes, for plans without a next step up. */
export function PlanIncludes({ plan }: { plan: Plan }) {
  const def = PLANS[plan];
  return (
    <div className="flex h-full flex-col rounded-[14px] border border-border bg-surface/50 p-4">
      <p className="text-[13px] font-medium">{def.name} includes</p>
      <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
        {def.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-[7px] size-1 shrink-0 rounded-full bg-foreground-dim" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit", timeZone: "UTC" });

/** Invoice table: mono dates, tabular amounts, a status dot and a PDF link; or a typographic empty state. */
export function InvoicesTable({ invoices, plan, since }: { invoices: SerializedInvoice[]; plan: Plan; since: string }) {
  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5 px-5 pb-6 sm:flex-row sm:items-center sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[22px] font-semibold tracking-[-0.02em]">{plan === "free" ? "No invoices. You're on the Free plan." : "No invoices yet."}</p>
          <p className="mt-1 max-w-prose text-[13px] text-muted-foreground">
            {plan === "free" ? "Nothing has been charged to this workspace. Invoices appear here after your first payment." : "This plan was assigned without an online payment, so there is nothing to bill here."}
          </p>
        </div>
        <div aria-hidden="true" className="w-full max-w-[260px] shrink-0">
          <div className="relative flex items-center">
            <span className="size-2.5 rounded-full bg-foreground shadow-[0_0_0_4px_color-mix(in_oklab,var(--foreground)_10%,transparent)]" />
            <span className="h-px flex-1 bg-[repeating-linear-gradient(90deg,var(--border-strong)_0_6px,transparent_6px_11px)]" />
            <Receipt className="size-4 text-foreground-dim" />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[11px] text-foreground-dim">
            <span>{fmtDate(since)}</span>
            <span>first invoice</span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-t border-border/80">
            <th scope="col" className={cn(tableHead, "pl-5 sm:pl-6")}>
              Date
            </th>
            <th scope="col" className={tableHead}>
              Period
            </th>
            <th scope="col" className={cn(tableHead, "text-right")}>
              Amount
            </th>
            <th scope="col" className={tableHead}>
              Status
            </th>
            <th scope="col" className={cn(tableHead, "pr-5 sm:pr-6")}>
              <span className="sr-only">Invoice</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id} className={tableRow}>
              <td className="whitespace-nowrap py-3 pl-5 pr-4 font-mono text-[12.5px] sm:pl-6">{fmtDate(i.createdAt)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-[12.5px] text-muted-foreground">{i.periodStart && i.periodEnd ? `${fmtDate(i.periodStart)} – ${fmtDate(i.periodEnd)}` : "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">{formatPrice(i.amountMinor, i.currency)}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-2 capitalize">
                  <StatusDot status={i.status === "paid" ? "ok" : i.status === "failed" ? "error" : i.status === "void" ? "idle" : "warn"} />
                  {i.status}
                </span>
              </td>
              <td className="py-3 pl-4 pr-5 text-right sm:pr-6">
                {i.hostedUrl ? (
                  <a href={i.hostedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] font-medium transition-colors hover:bg-muted" aria-label={`Open the ${fmtDate(i.createdAt)} invoice (PDF, opens in a new tab)`}>
                    <FileText className="size-4" aria-hidden="true" /> PDF
                  </a>
                ) : (
                  <span className="font-mono text-xs text-muted-foreground">
                    {i.provider} · {i.providerInvoiceId.slice(0, 12)}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
