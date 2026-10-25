"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { api, ClientApiError } from "@/lib/client/api";

export type ProviderInfo = {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "available" | "planned";
  configFields: { key: string; label: string; type: "text" | "password" | "url"; required: boolean; placeholder: string }[];
  docsUrl: string;
  configured: boolean | null;
  connectable: boolean;
};

export type ConnectionInfo = {
  id: string;
  workspaceId: string;
  provider: string;
  name: string;
  config: Record<string, string>;
  secretKeys: string[];
  status: "unverified" | "connected" | "error";
  lastTestedAt: string | null;
  lastError: string | null;
  createdAt: string;
};

export type TestResult = { ok: boolean; message: string; details?: Record<string, unknown> };

/** Create a workspace connection for one of the given providers, using the provider's declared config fields. */
export function ConnectionForm({
  workspaceId,
  providers,
  defaultProviderId,
  onCreated,
  onCancel,
  testAfterCreate = true,
}: {
  workspaceId: string;
  providers: ProviderInfo[];
  defaultProviderId?: string;
  onCreated: (connection: ConnectionInfo, test: TestResult | null) => void;
  onCancel?: () => void;
  testAfterCreate?: boolean;
}) {
  const connectable = providers.filter((p) => p.connectable);
  const [providerId, setProviderId] = useState(defaultProviderId && connectable.some((p) => p.id === defaultProviderId) ? defaultProviderId : (connectable[0]?.id ?? ""));
  const provider = connectable.find((p) => p.id === providerId) ?? null;
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;
    setBusy(true);
    setError(null);
    setFieldErrors({});
    const config: Record<string, string> = {};
    const secret: Record<string, string> = {};
    for (const f of provider.configFields) {
      const v = (values[f.key] ?? "").trim();
      if (!v) continue;
      if (f.type === "password") secret[f.key] = v;
      else config[f.key] = v;
    }
    try {
      const { connection } = await api<{ connection: ConnectionInfo }>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/integrations`, {
        method: "POST",
        json: { provider: provider.id, name: name.trim() || provider.name, config, secret },
      });
      let test: TestResult | null = null;
      let tested = connection;
      if (testAfterCreate) {
        try {
          const r = await api<{ connection: ConnectionInfo; result: TestResult }>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/integrations/${encodeURIComponent(connection.id)}/test`, { method: "POST" });
          test = r.result;
          tested = r.connection;
        } catch (err) {
          test = { ok: false, message: err instanceof Error ? err.message : "Connection test failed" };
        }
      }
      onCreated(tested, test);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setFieldErrors(err.fieldErrors());
        setError(err.message);
      } else setError(err instanceof Error ? err.message : "Could not save the connection");
    } finally {
      setBusy(false);
    }
  };

  if (!connectable.length) {
    return <Alert variant="info" title="No connectable providers">There is nothing to connect yet.</Alert>;
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-label="New connection">
      {error ? (
        <Alert variant="danger" title="Could not save">
          {error}
        </Alert>
      ) : null}
      <Field label="Provider" htmlFor="conn-provider">
        <Select
          id="conn-provider"
          value={providerId}
          onChange={(e) => {
            setProviderId(e.target.value);
            setValues({});
            setFieldErrors({});
          }}
        >
          {connectable.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      {provider ? <p className="text-xs text-muted-foreground">{provider.description}</p> : null}
      <Field label="Connection name" htmlFor="conn-name" error={fieldErrors.name}>
        <Input id="conn-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={provider ? `${provider.name} (production)` : "Name"} maxLength={100} />
      </Field>
      {provider?.configFields.map((f) => (
        <Field key={f.key} label={f.required ? f.label : `${f.label} (optional)`} htmlFor={`conn-${f.key}`} error={fieldErrors[f.key]} hint={f.type === "password" ? "Stored encrypted; never shown again." : undefined}>
          <Input
            id={`conn-${f.key}`}
            type={f.type === "password" ? "password" : f.type === "url" ? "url" : "text"}
            value={values[f.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            required={f.required}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(fieldErrors[f.key]) || undefined}
          />
        </Field>
      ))}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" loading={busy} disabled={!provider}>
          {testAfterCreate ? "Save and test" : "Save connection"}
        </Button>
      </div>
    </form>
  );
}
