"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Info, LogOut } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { withAuthParams } from "./params";

/**
 * The invited role as a chip that explains itself. A toggletip (click, tap, Enter or Space opens it)
 * rather than a hover tooltip, so the explanation also reaches touch screens.
 */
export function RoleChip({ label, help }: { label: string; help: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group inline-flex h-7 items-center gap-1.5 rounded-full bg-signal/12 px-2.5 text-xs font-medium text-signal-ink transition-colors hover:bg-signal/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=open]:bg-signal/20"
        >
          {label}
          <Info className="size-3 opacity-80 transition-opacity group-hover:opacity-100" aria-hidden="true" />
          <span className="sr-only">: what this role can do</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-64 p-3.5">
        <p className="text-label text-muted-foreground">{label}</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">{help}</p>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Accepts the invitation (POST /api/v1/invites/:token, the same call the settings page makes),
 * remembers the workspace and opens it. idle → loading → success, success only after the server agrees.
 */
export function InviteAccept({ token, workspaceName }: { token: string; workspaceName: string }) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function accept() {
    if (phase !== "idle") return;
    setPhase("loading");
    setError(null);
    try {
      const r = await api<{ workspace: { id: string }; next: string }>(`/api/v1/invites/${encodeURIComponent(token)}`, { method: "POST" });
      document.cookie = `codexa_workspace=${r.workspace.id}; path=/; max-age=31536000; samesite=lax`;
      setPhase("success");
      router.push(r.next || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not accept the invitation. Please try again.");
      setPhase("idle");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Button type="button" size="lg" className="w-full text-[15px]" onClick={accept} state={phase} loadingLabel="Joining…" successLabel={`Opening ${workspaceName}…`}>
        Join {workspaceName}
      </Button>
    </div>
  );
}

/** Signed in with a different address: sign out, then sign in with the invited one (pre-filled), and come back here. */
export function SwitchAccount({ next, email }: { next: string; email: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function go() {
    setBusy(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      router.push(withAuthParams("/login", { next, email }));
      router.refresh();
    }
  }

  return (
    <Button type="button" variant="outline" size="lg" className="w-full text-[15px]" onClick={go} loading={busy}>
      {busy ? null : <LogOut className="size-4" aria-hidden="true" />}
      Sign out and switch account
    </Button>
  );
}
