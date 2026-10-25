"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { Button, buttonClasses } from "@/components/ui/button";

type Props = { templateId: string; templateName: string; workspaceId: string | null; canCreate: boolean };

/**
 * In-app "Use template": creates the project immediately via POST /api/v1/projects
 * in the current workspace, then navigates to the workspace editor.
 */
export function UseTemplateButton({ templateId, templateName, workspaceId, canCreate }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; quota?: boolean } | null>(null);

  if (!workspaceId || !canCreate) {
    return (
      <span className="text-xs text-muted-foreground" title={!workspaceId ? "Join or create a workspace first" : "You need the editor role to create projects"}>
        {!workspaceId ? "No workspace" : "Viewer role"}
      </span>
    );
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ project: { id: string } }>("/api/v1/projects", { method: "POST", json: { workspaceId, name: templateName, templateId } });
      router.push(`/projects/${res.project.id}`);
    } catch (err) {
      if (err instanceof ClientApiError && err.status === 402) setError({ message: err.message, quota: true });
      else if (err instanceof ClientApiError && err.status === 429) setError({ message: "You are creating projects too quickly. Try again in a few minutes." });
      else setError({ message: err instanceof Error ? err.message : "Could not create the project." });
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" size="sm" onClick={create} loading={busy} aria-describedby={error ? `use-${templateId}-error` : undefined}>
        {busy ? "Creating…" : "Use template"}
        {!busy ? <ArrowRight className="size-3.5" aria-hidden="true" /> : null}
      </Button>
      {error ? (
        <p id={`use-${templateId}-error`} role="alert" className="text-xs text-danger">
          {error.message}
          {error.quota ? (
            <>
              {" "}
              <Link href="/settings/billing" className={buttonClasses("link", "sm", "h-auto p-0 text-xs")}>
                Upgrade plan
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
