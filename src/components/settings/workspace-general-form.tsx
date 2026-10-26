"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ClientApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { SettingsCard } from "./section";
import { toast } from "@/components/ui/toast";

export type WorkspaceGeneralValues = { name: string; slug: string; billingCurrency: "USD" | "INR" };

export function WorkspaceGeneralForm({ workspaceId, initial, canEdit, hasSubscription }: { workspaceId: string; initial: WorkspaceGeneralValues; canEdit: boolean; hasSubscription: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string }>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "saving" });
    setErrors({});
    try {
      await api(`/api/v1/workspaces/${workspaceId}/billing/settings`, { method: "PATCH", json: values });
      setStatus({ kind: "saved", message: "Workspace settings saved." });
      toast.success("Workspace saved");
      router.refresh();
    } catch (err) {
      if (err instanceof ClientApiError) {
        setErrors(err.fieldErrors());
        setStatus({ kind: "error", message: err.message });
      } else setStatus({ kind: "error", message: "Could not save the workspace." });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <SettingsCard
        title="General"
        description="Name, URL slug and the currency used at checkout."
        bodyClassName="space-y-5"
        hint={
          status.kind === "saved" ? (
            <span role="status" className="pop-in inline-block text-success">
              {status.message}
            </span>
          ) : canEdit ? (
            "Members see the new name right away."
          ) : (
            "Only workspace owners and admins can change these settings."
          )
        }
        footer={
          canEdit ? (
            <Button type="submit" size="sm" loading={status.kind === "saving"}>
              Save changes
            </Button>
          ) : null
        }
      >
        <fieldset disabled={!canEdit} className="space-y-5">
          <Field label="Workspace name" htmlFor="ws-name" error={errors.name}>
            <Input id="ws-name" value={values.name} onChange={(e) => setValues((s) => ({ ...s, name: e.target.value }))} required minLength={2} maxLength={60} aria-invalid={Boolean(errors.name)} />
          </Field>
          <Field label="URL slug" htmlFor="ws-slug" error={errors.slug} hint="Lowercase letters, numbers and hyphens. Used in links to this workspace.">
            <Input id="ws-slug" value={values.slug} onChange={(e) => setValues((s) => ({ ...s, slug: e.target.value.toLowerCase() }))} required minLength={3} maxLength={48} pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?" aria-invalid={Boolean(errors.slug)} />
          </Field>
          <Field
            label="Billing currency"
            htmlFor="ws-currency"
            error={errors.billingCurrency}
            hint={hasSubscription ? "Your current subscription keeps its currency. The new currency applies to your next checkout." : "INR is billed through Razorpay, USD through Stripe. Choose the one that matches your payment method."}
          >
            <Select id="ws-currency" value={values.billingCurrency} onChange={(e) => setValues((s) => ({ ...s, billingCurrency: e.target.value as "USD" | "INR" }))}>
              <option value="USD">USD — US dollar (Stripe)</option>
              <option value="INR">INR — Indian rupee (Razorpay)</option>
            </Select>
          </Field>
        </fieldset>
        {status.kind === "error" ? <Alert variant="danger">{status.message}</Alert> : null}
      </SettingsCard>
    </form>
  );
}
