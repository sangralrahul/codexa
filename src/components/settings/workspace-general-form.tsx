"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ClientApiError } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { SettingsCard } from "./section";
import { UnsavedDock, useDirtyForm } from "./dirty-form";
import { RadioCards } from "./radio-cards";

export type WorkspaceGeneralValues = { name: string; slug: string; billingCurrency: "USD" | "INR" };

function ProviderBadge({ ok }: { ok: boolean | undefined }) {
  if (ok === undefined) return null;
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-1.5 py-px text-[10.5px] font-medium text-success">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-success" /> Configured
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-px text-[10.5px] font-medium text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-foreground-dim" /> Not configured
    </span>
  );
}

/**
 * Workspace identity header (live monogram, name and slug as you type) and the General form:
 * name, URL slug and billing currency as radio cards that say whether each provider is set up on
 * this server. Non-admins see the form disabled (fieldset), with the reason in the footer.
 */
export function WorkspaceGeneralForm({
  workspaceId,
  initial,
  canEdit,
  hasSubscription,
  providers,
  meta,
}: {
  workspaceId: string;
  initial: WorkspaceGeneralValues;
  canEdit: boolean;
  hasSubscription: boolean;
  /** Which payment providers are configured (from the billing overview). */
  providers?: { stripe: boolean; razorpay: boolean };
  meta?: { role: string; plan: string; createdAt: string };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useDirtyForm<{ name: string; slug: string; billingCurrency: string }>(initial);
  const { values, set, dirty, flashing } = form;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string }>({ kind: "idle" });

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canEdit || !dirty || status.kind === "saving") return;
    setStatus({ kind: "saving" });
    setErrors({});
    const submitted = values;
    try {
      await api(`/api/v1/workspaces/${workspaceId}/billing/settings`, { method: "PATCH", json: submitted });
      form.commit(submitted);
      setStatus({ kind: "saved", message: "Workspace settings saved." });
      toast.success("Workspace saved");
      router.refresh();
      window.setTimeout(() => setStatus((s) => (s.kind === "saved" ? { kind: "idle" } : s)), 2400);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setErrors(err.fieldErrors());
        setStatus({ kind: "error", message: err.message });
      } else setStatus({ kind: "error", message: "Could not save the workspace." });
    }
  }

  const name = values.name.trim() || "Untitled workspace";
  return (
    <div className="space-y-5">
      <section aria-label="Workspace identity" className="settings-card relative overflow-hidden rounded-[18px] p-5 sm:p-6">
        <div aria-hidden="true" className="bg-dots pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-60" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <span key={name.slice(0, 2)} className="mirror-swap rounded-[14px] p-[3px] shadow-[0_0_0_1px_var(--border-strong)]">
            <Avatar name={name} seed={workspaceId} shape="square" size="xl" className="[&>span]:size-16 [&>span]:rounded-[12px] [&>span]:text-[22px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-balance text-[22px] font-semibold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]">{name}</p>
            <p className="mt-1 font-mono text-[13px] text-muted-foreground [overflow-wrap:anywhere]">/{values.slug || "slug"}</p>
          </div>
          {meta ? (
            <div className="flex flex-wrap gap-1.5 sm:justify-end">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">{meta.role}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">{meta.plan} plan</span>
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">
                since {new Date(meta.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <form ref={formRef} onSubmit={onSubmit} noValidate>
        <SettingsCard
          id="workspace-general"
          title="General"
          description="Name, URL slug and the currency used at checkout."
          layout="split"
          dirty={dirty}
          hint={
            status.kind === "saved" ? (
              <span role="status" className="pop-in inline-block text-success">
                {status.message}
              </span>
            ) : !canEdit ? (
              "Only workspace owners and admins can change these settings."
            ) : dirty ? (
              <span className="text-foreground">
                {form.changed.length} unsaved change{form.changed.length === 1 ? "" : "s"}
              </span>
            ) : (
              "Members see the new name right away."
            )
          }
          footer={
            canEdit ? (
              <Button type="submit" size="sm" disabled={!dirty && status.kind !== "saved"} state={status.kind === "saving" ? "loading" : status.kind === "saved" ? "success" : "idle"} successLabel="Saved">
                Save changes
              </Button>
            ) : null
          }
        >
          <fieldset disabled={!canEdit} className="min-w-0 space-y-5">
            <div className={cn(flashing("name") && "field-flash")}>
              <Field label="Workspace name" htmlFor="ws-name" error={errors.name}>
                <Input id="ws-name" value={values.name} onChange={(e) => set("name", e.target.value)} required minLength={2} maxLength={60} aria-invalid={Boolean(errors.name)} />
              </Field>
            </div>
            <div className={cn(flashing("slug") && "field-flash")}>
              <Field label="URL slug" htmlFor="ws-slug" error={errors.slug} hint="Lowercase letters, numbers and hyphens. Used in links to this workspace.">
                <Input
                  id="ws-slug"
                  value={values.slug}
                  onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  required
                  minLength={3}
                  maxLength={48}
                  pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?"
                  spellCheck={false}
                  autoCapitalize="off"
                  className="font-mono text-[13px]"
                  aria-invalid={Boolean(errors.slug)}
                />
              </Field>
            </div>
            <div className={cn("space-y-1.5", flashing("billingCurrency") && "field-flash")}>
              <p id="ws-currency-label" className="text-[13px] font-medium leading-none">
                Billing currency
              </p>
              <RadioCards
                id="ws-currency"
                labelledBy="ws-currency-label"
                describedBy="ws-currency-hint"
                value={values.billingCurrency as "USD" | "INR"}
                onValueChange={(v) => set("billingCurrency", v)}
                disabled={!canEdit}
                options={[
                  { value: "USD", title: "USD · Stripe", description: "US dollar, cards worldwide.", badge: <ProviderBadge ok={providers?.stripe} /> },
                  { value: "INR", title: "INR · Razorpay", description: "Indian rupee, UPI and Indian cards.", badge: <ProviderBadge ok={providers?.razorpay} /> },
                ]}
              />
              {errors.billingCurrency ? (
                <p role="alert" className="text-xs text-danger">
                  {errors.billingCurrency}
                </p>
              ) : (
                <p id="ws-currency-hint" className="text-xs text-muted-foreground">
                  {hasSubscription ? "Your current subscription keeps its currency. The new currency applies to your next checkout." : "INR is billed through Razorpay, USD through Stripe. Choose the one that matches your payment method."}
                </p>
              )}
            </div>
          </fieldset>
          {status.kind === "error" ? <Alert variant="danger" className="mt-5">{status.message}</Alert> : null}
        </SettingsCard>
      </form>
      {canEdit ? (
        <UnsavedDock
          dirty={dirty}
          saving={status.kind === "saving"}
          saved={status.kind === "saved"}
          error={status.kind === "error" ? status.message : null}
          onSave={() => formRef.current?.requestSubmit()}
          onReset={() => {
            form.reset();
            setErrors({});
            setStatus({ kind: "idle" });
          }}
        />
      ) : null}
    </div>
  );
}
