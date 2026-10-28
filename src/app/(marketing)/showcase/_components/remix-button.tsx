"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitFork } from "lucide-react";
import { api, ClientApiError } from "@/lib/client/api";
import { Button, buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  title: string;
  /** Signed-out visitors get a link to sign up (and come back here) instead of the action. */
  signedIn: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch the button to its container (detail page sidebar). */
  block?: boolean;
  className?: string;
};

/**
 * "Remix": POST /api/v1/showcase/:slug/remix copies the project's files into the caller's current
 * workspace as a new private project, then opens it in the editor's preview. Errors render inline
 * and are tied to the button with aria-describedby (402 quota → billing link, 429 → slow down).
 */
export function RemixButton({ slug, title, signedIn, variant = "primary", size = "md", block, className }: Props) {
  const router = useRouter();
  const errorId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; quota?: boolean } | null>(null);

  if (!signedIn) {
    const next = `/showcase/${slug}`;
    return (
      <Link href={`/signup?next=${encodeURIComponent(next)}`} className={buttonClasses(variant, size, cn("relative z-[3]", block && "w-full", className))} aria-label={`Sign up to remix ${title}`}>
        <GitFork className="size-4" aria-hidden="true" />
        Remix
      </Link>
    );
  }

  async function remix() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ project: { id: string } }>(`/api/v1/showcase/${encodeURIComponent(slug)}/remix`, { method: "POST", json: {} });
      router.push(`/projects/${res.project.id}?view=preview`);
      // Keep the busy state while the editor loads.
    } catch (err) {
      if (err instanceof ClientApiError && err.status === 402) setError({ message: err.message, quota: true });
      else if (err instanceof ClientApiError && err.status === 429) setError({ message: "You are remixing projects too quickly. Try again in a minute." });
      else if (err instanceof ClientApiError && err.status === 403) setError({ message: "You need the editor role in your current workspace to remix. Switch workspaces and try again." });
      else setError({ message: err instanceof Error ? err.message : "Could not remix this project." });
      setBusy(false);
    }
  }

  return (
    <div className={cn("relative z-[3] flex flex-col gap-2", block ? "w-full" : "items-end", className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={remix}
        loading={busy}
        aria-label={busy ? undefined : `Remix ${title}`}
        aria-describedby={error ? errorId : undefined}
        className={cn(block && "w-full")}
      >
        {!busy ? <GitFork className="size-4" aria-hidden="true" /> : null}
        {busy ? "Remixing…" : "Remix"}
      </Button>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-danger">
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
