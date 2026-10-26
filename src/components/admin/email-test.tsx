"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { api } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";

type Result = { ok: boolean; provider: string | null; error?: string; hint?: string | null };

/** Sends a test email through the configured provider and shows its exact answer. */
export function EmailTest({ defaultTo }: { defaultTo: string }) {
  const router = useRouter();
  const [to, setTo] = useState(defaultTo);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setResult(null);
        try {
          setResult(await api<Result>("/api/v1/admin/email/test", { method: "POST", json: { to } }));
        } catch (err) {
          setResult({ ok: false, provider: null, error: err instanceof Error ? err.message : "Request failed" });
        } finally {
          setBusy(false);
          router.refresh();
        }
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="Send a test email to" htmlFor="test-to" className="flex-1">
          <Input id="test-to" type="email" value={to} onChange={(e) => setTo(e.target.value)} required />
        </Field>
        <Button type="submit" loading={busy}>
          <Send className="size-4" aria-hidden="true" /> Send test
        </Button>
      </div>
      {result ? (
        result.ok ? (
          <Alert variant="success" title="Accepted by the email provider">
            Check the inbox (and spam folder) of {to}. If it never arrives, the sending domain may still be unverified.
          </Alert>
        ) : (
          <Alert variant="danger" title="Not sent">
            <p className="font-mono text-xs">{result.error}</p>
            {result.hint ? <p className="mt-2">{result.hint}</p> : null}
          </Alert>
        )
      ) : null}
    </form>
  );
}
