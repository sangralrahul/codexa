"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Switch the current workspace from the workspaces list: writes the same `codexa_workspace`
 * preference cookie the sidebar switcher uses (the server re-checks membership on every read),
 * then opens that workspace's settings.
 */
export function SwitchWorkspaceButton({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [clicked, setClicked] = useState(false);
  const busy = pending || clicked;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      loading={busy}
      aria-label={`Switch to ${workspaceName}`}
      onClick={() => {
        setClicked(true);
        document.cookie = `codexa_workspace=${workspaceId}; path=/; max-age=31536000; samesite=lax`;
        start(() => {
          router.push("/settings/workspace");
          router.refresh();
        });
      }}
    >
      Switch
      {busy ? null : <ArrowRight className="size-3.5" aria-hidden="true" />}
    </Button>
  );
}
