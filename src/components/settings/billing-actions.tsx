"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { PLANS, formatPrice } from "@/config/plans";
import { getPlanPrice, type BillingInterval } from "@/lib/billing/plans";
import type { BillingOverview } from "@/lib/billing/service";
import { Button, buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type Currency = "USD" | "INR";
type Plan = "pro" | "team";
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

export function PaymentsNotConfigured({ providers }: { providers: BillingOverview["providers"] }) {
  if (providers.stripe || providers.razorpay) return null;
  return (
    <Alert variant="warning" title="Payments are not configured on this deployment">
      Online upgrades need at least one payment provider. Set <code>STRIPE_SECRET_KEY</code> and <code>STRIPE_WEBHOOK_SECRET</code> (international, USD) and/or <code>RAZORPAY_KEY_ID</code>, <code>RAZORPAY_KEY_SECRET</code> and <code>RAZORPAY_WEBHOOK_SECRET</code> (India, INR), then restart the server. Staff can still
      assign plans manually from the admin area.
    </Alert>
  );
}

export function BillingActions({
  workspaceId,
  overview,
  role,
  defaultCurrency,
  userEmail,
}: {
  workspaceId: string;
  overview: BillingOverview;
  role: "owner" | "admin" | "editor" | "viewer";
  defaultCurrency: Currency;
  userEmail: string;
}) {
  const router = useRouter();
  const [flash, setFlash] = useState<Flash>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const sub = overview.subscription;
  const canAdmin = role === "owner" || role === "admin";
  const isOwner = role === "owner";
  const providersAvailable = overview.providers.stripe || overview.providers.razorpay;
  const activeSub = sub && (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") && sub.provider !== "manual";

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

  async function checkout(plan: Plan, interval: BillingInterval, currency: Currency) {
    await run(
      "checkout",
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
        setPickerOpen(false);
        const rz = new window.Razorpay({
          key: r.order.keyId,
          subscription_id: r.order.subscriptionId,
          name: r.order.name,
          description: r.order.description,
          prefill: { email: r.order.email },
          theme: { color: "#2f6bff" },
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

  return (
    <div className="space-y-3">
      {flash ? <Alert variant={flash.kind === "ok" ? "success" : flash.kind === "error" ? "danger" : "info"}>{flash.message}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {canAdmin && providersAvailable && overview.plan !== "enterprise" ? (
          <Button onClick={() => setPickerOpen(true)} disabled={busy !== null}>
            {overview.plan === "free" ? "Upgrade plan" : "Change plan"}
          </Button>
        ) : null}
        {overview.plan !== "enterprise" ? (
          <a href="/pricing/compare-plans" className={buttonClasses("outline", "md")}>
            Compare plans
          </a>
        ) : null}
        {activeSub && sub.hasPortal && canAdmin ? (
          <Button variant="outline" onClick={portal} loading={busy === "portal"}>
            Manage payment method <ExternalLink className="size-3.5" aria-hidden="true" />
          </Button>
        ) : null}
        {activeSub && isOwner && !sub.cancelAtPeriodEnd ? (
          <Button variant="ghost" className="text-danger" onClick={() => setCancelOpen(true)} disabled={busy !== null}>
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

      <PlanPicker open={pickerOpen} onOpenChange={setPickerOpen} defaultCurrency={defaultCurrency} providers={overview.providers} currentPlan={overview.plan} busy={busy === "checkout"} onChoose={checkout} userEmail={userEmail} />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent
          title="Cancel your subscription?"
          description={sub?.currentPeriodEnd ? `Your ${PLANS[overview.plan].name} plan stays active until ${new Date(sub.currentPeriodEnd).toLocaleDateString()}, then the workspace returns to the Free plan. Nothing is refunded for the current period.` : "The workspace returns to the Free plan at the end of the current period."}
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

function PlanPicker({
  open,
  onOpenChange,
  defaultCurrency,
  providers,
  currentPlan,
  busy,
  onChoose,
  userEmail,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultCurrency: Currency;
  providers: BillingOverview["providers"];
  currentPlan: string;
  busy: boolean;
  onChoose: (plan: Plan, interval: BillingInterval, currency: Currency) => Promise<void>;
  userEmail: string;
}) {
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [interval, setInterval_] = useState<BillingInterval>("month");
  const providerFor = (c: Currency) => (c === "INR" ? "razorpay" : "stripe");
  const providerOk = (c: Currency) => (c === "INR" ? providers.razorpay : providers.stripe);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Choose a plan" description={`Billing email: ${userEmail}. Prices exclude applicable taxes.`} className="max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Toggle label="Currency" value={currency} options={[{ value: "USD", label: "USD" }, { value: "INR", label: "INR" }]} onChange={(v) => setCurrency(v as Currency)} />
          <Toggle label="Billing interval" value={interval} options={[{ value: "month", label: "Monthly" }, { value: "year", label: "Annual (save up to 20%)" }]} onChange={(v) => setInterval_(v as BillingInterval)} />
        </div>
        {!providerOk(currency) ? (
          <Alert variant="warning" className="mb-4">
            {currency === "INR" ? "Razorpay (INR) is not configured on this deployment. " : "Stripe (USD) is not configured on this deployment. "}
            {providerOk(currency === "INR" ? "USD" : "INR") ? `Switch to ${currency === "INR" ? "USD" : "INR"} to continue.` : "No payment provider is available."}
          </Alert>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {(["pro", "team"] as Plan[]).map((p) => {
            const def = PLANS[p];
            const q = getPlanPrice(p, currency, interval);
            if (!q) return null;
            const isCurrent = currentPlan === p;
            return (
              <div key={p} className={cn("flex flex-col rounded-xl border p-4", def.highlight ? "border-primary/50" : "border-border")}>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">{def.name}</h3>
                  {isCurrent ? <Badge variant="success">Current</Badge> : def.highlight ? <Badge variant="primary">Popular</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{def.tagline}</p>
                <p className="mt-3 text-2xl font-semibold tabular-nums">
                  {formatPrice(q.perMonthMinor, currency)}
                  <span className="text-sm font-normal text-muted-foreground"> / month</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {interval === "year" ? `${formatPrice(q.totalMinor, currency)} billed yearly${q.savingsMinor > 0 ? ` · save ${formatPrice(q.savingsMinor, currency)}` : ""}` : "Billed monthly"} via {providerFor(currency) === "stripe" ? "Stripe" : "Razorpay"}
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  {def.features.slice(0, 4).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className="mt-4" variant={def.highlight ? "primary" : "outline"} disabled={!providerOk(currency) || busy} loading={busy} onClick={() => onChoose(p, interval, currency)}>
                  {isCurrent ? `Switch to ${interval === "year" ? "annual" : "monthly"}` : currentPlan === "team" && p === "pro" ? "Downgrade to Pro" : `Choose ${def.name}`}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Need custom limits or invoice billing?{" "}
          <a href="/contact-sales" className="underline">
            Contact sales about Enterprise
          </a>
          . Card details are entered on the provider&apos;s secure page and are never stored by Codexa.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1 text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("h-7 rounded-md px-3 font-medium transition focus-visible:outline-2 focus-visible:outline-ring", value === o.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
