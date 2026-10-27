"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { Button, buttonClasses } from "@/components/ui/button";
import { useLaunch } from "@/components/motion/launch";
import { cn } from "@/lib/utils";

type Props = {
  templateId: string;
  templateName: string;
  workspaceId: string | null;
  canCreate: boolean;
  /** The template's real file count (shown as a Launch step once the project exists). */
  fileCount?: number;
  size?: "sm" | "md";
  className?: string;
};

/**
 * In-app "Use template": creates the project immediately via POST /api/v1/projects in the current
 * workspace, then opens the editor. The tile (or sheet) grows into the Launch panel and its rows tick
 * only as the real request resolves; on failure it folds back and shows the error inline
 * (402: quota + "Upgrade plan"; 429: rate limit), wired to the button with aria-describedby.
 */
export function UseTemplateButton({ templateId, templateName, workspaceId, canCreate, fileCount, size = "sm", className }: Props) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; quota?: boolean } | null>(null);
  const launch = useLaunch({ title: `Starting from ${templateName}`, onRetry: () => void create() });

  if (!workspaceId || !canCreate) {
    return (
      <span
        className="inline-flex h-8 items-center gap-1.5 rounded-[var(--btn-radius,9999px)] bg-card/85 px-3 text-xs text-muted-foreground shadow-sm backdrop-blur-md"
        title={!workspaceId ? "Join or create a workspace first" : "You need the editor role to create projects"}
      >
        <Lock className="size-3.5" aria-hidden="true" />
        {!workspaceId ? "No workspace" : "Viewer role"}
      </span>
    );
  }

  async function create() {
    if (!workspaceId) return;
    setBusy(true);
    setError(null);
    const origin = (buttonRef.current?.closest("[data-template-tile], [role=dialog]") as HTMLElement | null) ?? buttonRef.current;
    launch.start(origin, [{ id: "create", label: `Creating “${templateName}”`, state: "active" }]);
    try {
      const res = await api<{ project: { id: string } }>("/api/v1/projects", { method: "POST", json: { workspaceId, name: templateName, templateId } });
      launch.update("create", "done");
      if (typeof fileCount === "number") launch.add({ id: "copy", label: `Copied ${fileCount} file${fileCount === 1 ? "" : "s"} from the template`, state: "done" });
      launch.add({ id: "open", label: "Opening the editor" });
      router.push(`/projects/${res.project.id}`);
    } catch (err) {
      let next: { message: string; quota?: boolean };
      if (err instanceof ClientApiError && err.status === 402) next = { message: err.message, quota: true };
      else if (err instanceof ClientApiError && err.status === 429) next = { message: "You are creating projects too quickly. Try again in a few minutes." };
      else next = { message: err instanceof Error ? err.message : "Could not create the project." };
      setError(next);
      launch.fail("create", next.message, { collapse: true });
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-col items-end gap-2", className)}>
      <Button ref={buttonRef} type="button" size={size} onClick={create} loading={busy} aria-describedby={error ? `use-${templateId}-error` : undefined} className="group/use">
        {busy ? "Creating…" : "Use template"}
        {!busy ? <ArrowRight className="size-3.5 transition-transform duration-(--dur-3) ease-snap group-hover/use:translate-x-0.5" aria-hidden="true" /> : null}
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
      {launch.element}
    </div>
  );
}
