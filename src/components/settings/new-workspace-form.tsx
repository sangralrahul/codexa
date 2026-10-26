"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ClientApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { SettingsCard } from "./section";

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
    <form onSubmit={onSubmit} noValidate className="max-w-xl">
      <SettingsCard
        id="new-workspace"
        title="Create a workspace"
        description="You can rename it or change its URL slug later."
        hint="Starts on the Free plan, with you as owner."
        footer={
          <Button type="submit" size="sm" loading={busy}>
            Create workspace
          </Button>
        }
      >
        <Field label="Workspace name" htmlFor="new-ws-name" hint="For example your company, team or client name. You can invite members from the Members page next." error={error}>
          <Input id="new-ws-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} autoFocus aria-invalid={Boolean(error)} />
        </Field>
      </SettingsCard>
    </form>
  );
}
