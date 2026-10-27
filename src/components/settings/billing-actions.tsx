"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, Building2, Check, CreditCard, ExternalLink, Lock } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { isCalm } from "@/lib/client/motion";
import { PLANS, formatPrice } from "@/config/plans";
import { getPlanPrice, type BillingInterval } from "@/lib/billing/plans";
import type { BillingOverview } from "@/lib/billing/service";
import { Button, buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";

type Currency = "USD" | "INR";
type Plan = "pro" | "team";
type Role = "owner" | "admin" | "editor" | "viewer";
type Flash = { kind: "ok" | "error" | "info"; message: string } | null;

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (r: unknown) => void) => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(Boolean(window.Razorpay));
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/** The brand signal colour for the provider's checkout modal, read from the live theme (no hex in components). */
function signalColor(): string | undefined {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--signal").trim();
    return v || undefined;
  } catch {
    return undefined;
  }
}

/** Outcome messages go to a toast and stay inline (role=status / role=alert) for screen readers. */
function useFlash() {
  const [flash, setFlashState] = useState<Flash>(null);
  const setFlash = (f: Flash) => {
    setFlashState(f);
    if (!f) return;
    if (f.kind === "ok") toast.success(f.message);
    else if (f.kind === "error") toast.error(f.message);
    else toast.info(f.message);
  };
  return [flash, setFlash] as const;
}

export function CheckoutResultBanner({ result }: { result: string | null }) {
  const router = useRouter();
  useEffect(() => {
    if (result === "success") {
      // Webhooks may land a moment after the redirect; refresh once so the plan shows up.
      const t = setTimeout(() => router.refresh(), 2500);
      return () => clearTimeout(t);
    }
  }, [result, router]);
  if (result === "success") return <Alert variant="success" title="Payment received">Thank you. Your subscription activates as soon as the provider confirms it (usually within a few seconds). This page refreshes automatically.</Alert>;
  if (result === "cancelled") return <Alert variant="info">Checkout was cancelled. Nothing was charged.</Alert>;
  return null;
}

/**
 * Explicit not-configured state for online payments, with the operator disclosure.
 * Stays inside <main> (serverless-smoke asserts /not configured/i on /settings/billing).
 */
export function PaymentsNotConfigured({ providers, className }: { providers: BillingOverview["providers"]; className?: string }) {
  if (providers.stripe || providers.razorpay) return null;
  return (
    <div role="status" className={cn("rounded-[14px] border border-dashed border-border-strong bg-surface/50 p-4 text-sm", className)}>
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] icon-tile">
          <CreditCard className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            Online payments are not configured on this server yet
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/12 px-2 py-0.5 text-[11px] font-medium text-warning">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" /> Not configured
            </span>
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">Plans can&apos;t be bought or changed here for now. Codexa staff can still assign a plan to your workspace; contact support if you need one.</p>
          <details className="group mt-2 text-xs text-muted-foreground">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded font-medium text-foreground/80 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              Details for the server operator <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">›</span>
            </summary>
            <p className="mt-2 leading-relaxed">
              Online upgrades need at least one payment provider. Set <code className="font-mono text-foreground/85">STRIPE_SECRET_KEY</code> and <code className="font-mono text-foreground/85">STRIPE_WEBHOOK_SECRET</code> (international, USD) and/or{" "}
              <code className="font-mono text-foreground/85">RAZORPAY_KEY_ID</code>, <code className="font-mono text-foreground/85">RAZORPAY_KEY_SECRET</code> and <code className="font-mono text-foreground/85">RAZORPAY_WEBHOOK_SECRET</code> (India, INR), then restart the
              server. Staff can assign plans manually from the admin area.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}

function useBillingRunner() {
  const [flash, setFlash] = useFlash();
  const [busy, setBusy] = useState<string | null>(null);
  async function run(key: string, fn: () => Promise<void>, fallback: string) {
    setBusy(key);
    setFlash(null);
    try {
      await fn();
    } catch (err) {
      setFlash({ kind: "error", message: err instanceof ClientApiError ? err.message : fallback });
    } finally {
      setBusy(null);
    }
  }
  return { flash, setFlash, busy, run };
}

function FlashAlert({ flash }: { flash: Flash }) {
  if (!flash) return null;
  return <Alert variant={flash.kind === "ok" ? "success" : flash.kind === "error" ? "danger" : "info"}>{flash.message}</Alert>;
}

/**
 * Plan hero actions: jump to the plan cards, compare plans, manage the payment method
 * (owners/admins), and cancel or resume (owners only). Permission rules mirror the API.
 */
export function BillingActions({
  workspaceId,
  overview,
  role,
}: {
  workspaceId: string;
  overview: BillingOverview;
  role: Role;
  defaultCurrency?: Currency;
  userEmail?: string;
}) {
  const router = useRouter();
  const { flash, setFlash, busy, run } = useBillingRunner();
  const [cancelOpen, setCancelOpen] = useState(false);
  const sub = overview.subscription;
  const canAdmin = role === "owner" || role === "admin";
  const isOwner = role === "owner";
  const providersAvailable = overview.providers.stripe || overview.providers.razorpay;
  const activeSub = sub && (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") && sub.provider !== "manual";

  const cancel = () =>
    run(
      "cancel",
      async () => {
        await api(`/api/v1/workspaces/${workspaceId}/billing/cancel`, { method: "POST" });
        setCancelOpen(false);
        setFlash({ kind: "ok", message: "Cancellation scheduled. Your plan stays active until the end of the current period." });
        router.refresh();
      },
      "Could not cancel the subscription.",
    );
  const resume = () =>
    run(
      "resume",
      async () => {
        await api(`/api/v1/workspaces/${workspaceId}/billing/resume`, { method: "POST" });
        setFlash({ kind: "ok", message: "Your subscription will renew as usual." });
        router.refresh();
      },
      "Could not resume the subscription.",
    );
  const portal = () =>
    run(
      "portal",
      async () => {
        const r = await api<{ url: string }>(`/api/v1/workspaces/${workspaceId}/billing/portal`, { method: "POST" });
        window.location.assign(r.url);
      },
      "Could not open the billing portal.",
    );

  const toPlans = () => {
    const el = document.getElementById("plans");
    el?.scrollIntoView({ behavior: isCalm() ? "auto" : "smooth", block: "start" });
    el?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus({ preventScroll: true });
  };

  return (
    <div className="space-y-3">
      <FlashAlert flash={flash} />
      <div className="flex flex-wrap items-center gap-2">
        {canAdmin && overview.plan !== "enterprise" && overview.plan !== "team" ? (
          <Button onClick={toPlans} disabled={busy !== null}>
            {overview.plan === "free" ? "Upgrade plan" : "Change plan"} <ArrowDown className="size-3.5" aria-hidden="true" />
          </Button>
        ) : null}
        {canAdmin && overview.plan === "team" && providersAvailable ? (
          <Button variant="outline" onClick={toPlans} disabled={busy !== null}>
            Change plan
          </Button>
        ) : null}
        {overview.plan !== "enterprise" ? (
          <a href="/pricing/compare-plans" className={buttonClasses("ghost", "md")}>
            Compare plans
          </a>
        ) : null}
        {activeSub && sub.hasPortal && canAdmin ? (
          <Button variant="outline" onClick={portal} loading={busy === "portal"}>
            Manage payment method <ExternalLink className="size-3.5" aria-hidden="true" />
          </Button>
        ) : null}
        {activeSub && isOwner && !sub.cancelAtPeriodEnd ? (
          <Button variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setCancelOpen(true)} disabled={busy !== null}>
            Cancel subscription
          </Button>
        ) : null}
        {activeSub && isOwner && sub.cancelAtPeriodEnd && sub.provider === "stripe" ? (
          <Button variant="outline" onClick={resume} loading={busy === "resume"}>
            Resume subscription
          </Button>
        ) : null}
      </div>
      {!canAdmin ? <p className="text-xs text-muted-foreground">Only workspace owners and admins can change the plan; only owners can cancel.</p> : null}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent
          title="Cancel your subscription?"
          description={
            sub?.currentPeriodEnd
              ? `Your ${PLANS[overview.plan].name} plan stays active until ${new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}, then the workspace returns to the Free plan. Nothing is refunded for the current period.`
              : "The workspace returns to the Free plan at the end of the current period."
          }
        >
          {sub?.provider === "razorpay" ? <Alert variant="info">Razorpay subscriptions scheduled for cancellation cannot be resumed; you can subscribe again after the period ends.</Alert> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Keep subscription</Button>
            </DialogClose>
            <Button variant="danger" onClick={cancel} loading={busy === "cancel"}>
              Cancel at period end
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const MAX_ANNUAL_SAVING = Math.round(
  Math.max(
    ...(["pro", "team"] as Plan[]).flatMap((p) => (["USD", "INR"] as Currency[]).map((c) => {
      const pr = PLANS[p].prices?.[c];
      return pr && pr.month > 0 ? (1 - pr.year / pr.month) * 100 : 0;
    })),
  ),
);

/**
 * Inline plan cards (Pro, Team, Enterprise) with the Currency and Billing interval radiogroups.
 * Checkout is honest: disabled with the reason when no provider is configured for the currency,
 * or when the viewer cannot change the plan. INR checks out with Razorpay, USD with Stripe.
 */
export function PlanCards({
  workspaceId,
  overview,
  role,
  defaultCurrency,
  userEmail,
}: {
  workspaceId: string;
  overview: BillingOverview;
  role: Role;
  defaultCurrency: Currency;
  userEmail: string;
}) {
  const router = useRouter();
  const { flash, setFlash, busy, run } = useBillingRunner();
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [interval, setInterval_] = useState<BillingInterval>("month");
  const canAdmin = role === "owner" || role === "admin";
  const providers = overview.providers;
  const providerOk = (c: Currency) => (c === "INR" ? providers.razorpay : providers.stripe);
  const providerName = (c: Currency) => (c === "INR" ? "Razorpay" : "Stripe");
  const anyProvider = providers.stripe || providers.razorpay;
  const current = overview.plan;
  const sub = overview.subscription;

  async function checkout(plan: Plan) {
    await run(
      `checkout:${plan}`,
      async () => {
        const r = await api<{ provider: "stripe"; url: string } | { provider: "razorpay"; order: { subscriptionId: string; keyId: string; name: string; description: string; email: string; amountMinor: number } }>(
          `/api/v1/workspaces/${workspaceId}/billing/checkout`,
          { method: "POST", json: { plan, interval, currency } },
        );
        if (r.provider === "stripe") {
          window.location.assign(r.url);
          return;
        }
        const ok = await loadRazorpay();
        if (!ok || !window.Razorpay) throw new ClientApiError(502, { code: "provider_error", message: "Razorpay Checkout could not be loaded. Check your network and try again." });
        const color = signalColor();
        const rz = new window.Razorpay({
          key: r.order.keyId,
          subscription_id: r.order.subscriptionId,
          name: r.order.name,
          description: r.order.description,
          prefill: { email: r.order.email },
          ...(color ? { theme: { color } } : {}),
          handler: async (resp: unknown) => {
            const p = resp as { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string };
            try {
              await api(`/api/v1/workspaces/${workspaceId}/billing/razorpay`, { method: "POST", json: p });
              setFlash({ kind: "ok", message: "Payment verified. Your plan is now active." });
              router.refresh();
            } catch (err) {
              setFlash({ kind: "error", message: err instanceof ClientApiError ? err.message : "Payment could not be verified. Contact support with your payment id." });
            }
          },
          modal: { ondismiss: () => setFlash({ kind: "info", message: "Checkout closed. Nothing was charged." }) },
        });
        rz.on("payment.failed", (e: unknown) => {
          const d = (e as { error?: { description?: string } }).error;
          setFlash({ kind: "error", message: d?.description ? `Payment failed: ${d.description}` : "Payment failed." });
        });
        rz.open();
      },
      "Could not start checkout.",
    );
  }

  const disabledReason = !anyProvider
    ? "Checkout not configured on this server"
    : !providerOk(currency)
      ? `${providerName(currency)} (${currency}) is not configured on this server`
      : !canAdmin
        ? "Only owners and admins can change the plan"
        : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Currency>
            aria-label="Currency"
            size="sm"
            value={currency}
            onValueChange={setCurrency}
            options={[
              { value: "USD", label: "USD", title: providers.stripe ? "Billed through Stripe" : "Stripe is not configured on this server" },
              { value: "INR", label: "INR", title: providers.razorpay ? "Billed through Razorpay" : "Razorpay is not configured on this server" },
            ]}
          />
          <Segmented<BillingInterval>
            aria-label="Billing interval"
            size="sm"
            value={interval}
            onValueChange={setInterval_}
            options={[
              { value: "month", label: "Monthly" },
              { value: "year", label: `Annual · save up to ${MAX_ANNUAL_SAVING}%` },
            ]}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Billing email <span className="font-medium text-foreground/85">{userEmail}</span> · prices exclude taxes
        </p>
      </div>
      {anyProvider && !providerOk(currency) ? (
        <Alert variant="warning">
          {providerName(currency)} ({currency}) is not configured on this deployment. {providerOk(currency === "INR" ? "USD" : "INR") ? `Switch to ${currency === "INR" ? "USD" : "INR"} to continue.` : "No payment provider is available."}
        </Alert>
      ) : null}
      <FlashAlert flash={flash} />
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {(["pro", "team"] as Plan[]).map((p) => {
          const def = PLANS[p];
          const q = getPlanPrice(p, currency, interval);
          if (!q) return null;
          const isCurrent = current === p;
          // The server refuses a checkout for the plan and interval you already pay for.
          const isSame = isCurrent && Boolean(sub && sub.provider !== "manual" && !sub.cancelAtPeriodEnd && sub.interval === interval && (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due"));
          const isDowngrade = current === "team" && p === "pro";
          const label = isSame ? "Current plan" : isCurrent ? `Switch to ${interval === "year" ? "annual" : "monthly"}` : isDowngrade ? "Downgrade to Pro" : `Choose ${def.name}`;
          const busyHere = busy === `checkout:${p}`;
          const reason = isSame ? null : disabledReason;
          const reasonId = `plan-${p}-reason`;
          const button = (
            <Button
              className="w-full aria-disabled:cursor-not-allowed aria-disabled:opacity-55"
              variant={def.highlight && !isCurrent && !reason ? "primary" : "outline"}
              disabled={isSame || (busy !== null && !busyHere)}
              loading={busyHere}
              aria-disabled={reason ? true : undefined}
              aria-describedby={reason ? reasonId : undefined}
              data-no-ripple={reason ? "" : undefined}
              onClick={() => {
                if (!reason) void checkout(p);
              }}
            >
              {reason ? <Lock className="size-3.5" aria-hidden="true" /> : isSame ? <Check className="size-3.5" aria-hidden="true" /> : null}
              {reason && !anyProvider ? "Checkout not configured" : label}
            </Button>
          );
          return (
            <li key={p} className={cn("plan-card relative flex flex-col rounded-[16px] border bg-card p-5 shadow-[inset_0_1px_0_var(--hairline)]", def.highlight ? "rim border-border-strong" : "border-border", isCurrent && "ring-1 ring-foreground/20")}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{def.name}</h3>
                {isCurrent ? (
                  <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Your plan</span>
                ) : def.highlight ? (
                  <span className="rounded-full bg-signal/12 px-2 py-0.5 text-[11px] font-medium text-signal-ink">Recommended</span>
                ) : null}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">{def.tagline}</p>
              <p className="mt-4 flex items-baseline gap-1">
                <span key={`${currency}-${interval}`} className="price-swap font-display text-[32px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
                  {formatPrice(q.perMonthMinor, currency)}
                </span>
                <span className="text-[13px] text-muted-foreground">/ month</span>
              </p>
              <p className="mt-1.5 min-h-[2lh] text-xs text-muted-foreground">
                {interval === "year" ? `${formatPrice(q.totalMinor, currency)} billed yearly${q.savingsMinor > 0 ? ` · save ${formatPrice(q.savingsMinor, currency)}` : ""}` : "Billed monthly"} via {providerName(currency)}
              </p>
              <ul className="mt-4 flex-1 space-y-1.5 text-[13px]">
                {def.features.slice(0, 5).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {reason ? <Tooltip content={reason}>{button}</Tooltip> : button}
                {reason ? (
                  <p id={reasonId} className="mt-2 text-center text-[11.5px] text-muted-foreground">
                    {reason}
                  </p>
                ) : isSame ? (
                  <p className="mt-2 text-center text-[11.5px] text-muted-foreground">You pay {interval === "year" ? "annually" : "monthly"} for this plan.</p>
                ) : null}
              </div>
            </li>
          );
        })}
        <li className="plan-card flex flex-col rounded-[16px] border border-dashed border-border-strong p-5">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-foreground-dim" aria-hidden="true" />
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{PLANS.enterprise.name}</h3>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">{PLANS.enterprise.tagline}</p>
          <p className="mt-4 font-display text-[26px] font-semibold leading-8 tracking-[-0.03em]">Custom</p>
          <p className="mt-1.5 min-h-[2lh] text-xs text-muted-foreground">Invoice billing and custom limits.</p>
          <ul className="mt-4 flex-1 space-y-1.5 text-[13px]">
            {PLANS.enterprise.features.slice(0, 4).map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-foreground-dim" aria-hidden="true" /> {f}
              </li>
            ))}
          </ul>
          <a href="/contact-sales" className={cn(buttonClasses("outline", "md"), "mt-5 w-full")}>
            Contact sales
          </a>
        </li>
      </ul>
      <p className="text-xs text-muted-foreground">Card details are entered on the provider&apos;s secure page and are never stored by Codexa.</p>
    </div>
  );
}
