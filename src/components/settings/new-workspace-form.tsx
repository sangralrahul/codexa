"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ClientApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";

export function NewWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ workspace: { id: string } }>("/api/v1/workspaces", { method: "POST", json: { name } });
      document.cookie = `codexa_workspace=${r.workspace.id}; path=/; max-age=31536000; samesite=lax`;
      router.push("/settings/members");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? (err.fieldErrors().name ?? err.message) : "Could not create the workspace.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Workspace name" htmlFor="new-ws-name" hint="For example your company, team or client name." error={error}>
        <Input id="new-ws-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} autoFocus aria-invalid={Boolean(error)} />
      </Field>
      <Alert variant="info">New workspaces start on the Free plan. You become its owner and can invite members from the Members page.</Alert>
      <div className="flex justify-end">
        <Button type="submit" loading={busy}>
          Create workspace
        </Button>
      </div>
    </form>
  );
}
