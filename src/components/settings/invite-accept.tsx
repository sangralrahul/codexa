"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ClientApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";

export function InviteAcceptButton({ token, workspaceName }: { token: string; workspaceName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ workspace: { id: string }; next: string }>(`/api/v1/invites/${encodeURIComponent(token)}`, { method: "POST" });
      document.cookie = `codexa_workspace=${r.workspace.id}; path=/; max-age=31536000; samesite=lax`;
      router.push(r.next || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not accept the invitation.");
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Button className="w-full" onClick={accept} loading={busy}>
        Join {workspaceName}
      </Button>
    </div>
  );
}
