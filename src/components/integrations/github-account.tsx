"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutTemplate, Unlink } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { BrandMark } from "@/components/brand/brand-mark";
import { api } from "@/lib/client/api";

export type GithubAccountInfo = { linked: boolean; username: string | null; scope: string | null; linkedAt: string | null };

const ERRORS: Record<string, string> = {
  denied: "You cancelled the GitHub authorization.",
  invalid_state: "The sign-in state expired or did not match. Please try again.",
  exchange_failed: "GitHub did not accept the authorization code. Please try again.",
  profile_failed: "Could not read your GitHub profile. Please try again.",
  session_changed: "Your Codexa session changed during authorization. Sign in and try again.",
  already_linked: "That GitHub account is already linked to a different Codexa user.",
  not_configured: "GitHub is not configured on this server.",
  provider_error: "GitHub returned an error. Please try again.",
};

export function githubErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return ERRORS[code] ?? `GitHub authorization failed (${code}).`;
}

/** Connect / unlink controls for the current user's GitHub account. */
export function GithubAccountCard({ configured, account, next, errorCode }: { configured: boolean; account: GithubAccountInfo; next?: string; errorCode?: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(githubErrorMessage(errorCode));
  const startUrl = `/api/auth/github/start${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  const unlink = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/github/account", { method: "DELETE" });
      setConfirm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlink GitHub");
    } finally {
      setBusy(false);
    }
  };

  const operatorNote = (
    <details className="group text-xs text-muted-foreground">
      <summary className="cursor-pointer list-none font-medium text-foreground/80 hover:text-foreground [&::-webkit-details-marker]:hidden">
        Details for the server operator <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">›</span>
      </summary>
      <p className="mt-2 max-w-md leading-relaxed">
        Set <code className="font-mono">GITHUB_CLIENT_ID</code> and <code className="font-mono">GITHUB_CLIENT_SECRET</code> (create an OAuth app at github.com/settings/developers with the callback URL{" "}
        <code className="font-mono">&lt;APP_URL&gt;/api/auth/github/callback</code>) and restart the app.
      </p>
    </details>
  );

  // Not configured and nothing linked: one explicit "not configured" state with a real next step,
  // instead of a notice stacked on a card whose only button is disabled.
  if (!configured && !account.linked) {
    return (
      <div className="space-y-4">
        {error ? (
          <Alert variant="danger" title="GitHub error">
            {error}
          </Alert>
        ) : null}
        <EmptyState
          variant="illustrated"
          icon={<BrandMark id="github" className="size-[18px]" />}
          title="GitHub is not configured on this server"
          description="Linking a GitHub account, importing repositories and pushing commits are unavailable until the server operator enables it. You can still start projects from a template or a prompt."
          action={
            <Link href="/new-project?tab=template" className={buttonClasses("primary", "md")}>
              <LayoutTemplate className="size-4" aria-hidden="true" /> Start from a template
            </Link>
          }
          secondaryAction={
            <Link href="/dashboard" className={buttonClasses("outline", "md")}>
              Describe an app
            </Link>
          }
        />
        <div className="px-1">{operatorNote}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="danger" title="GitHub error">
          {error}
        </Alert>
      ) : null}
      {!configured ? (
        <Alert variant="warning" title="GitHub is not configured on this server" live={false}>
          Importing and pushing are unavailable until the server operator enables it. Your linked account stays as it is.
          <div className="mt-2">{operatorNote}</div>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-[inset_0_1px_0_var(--hairline)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="icon-tile relative flex size-11 shrink-0 items-center justify-center rounded-md">
            <BrandMark id="github" className="size-5" />
            {account.linked ? <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-success ring-2 ring-card" /> : null}
          </span>
          <div className="min-w-0">
            {account.linked ? (
              <>
                <p className="text-sm font-medium">
                  Linked as <span className="font-mono">@{account.username}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Scopes: {account.scope || "repo read:user user:email"}
                  {account.linkedAt ? ` · linked ${new Date(account.linkedAt).toLocaleDateString()}` : ""}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">No GitHub account linked</p>
                <p className="text-xs text-muted-foreground">Link your account to import repositories and push commits.</p>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {account.linked ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <a href={startUrl}>Re-authorize</a>
              </Button>
              <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
                <Unlink className="size-4" aria-hidden="true" /> Unlink
              </Button>
            </>
          ) : (
            <Button size="sm" asChild>
              <a href={startUrl}>Connect GitHub</a>
            </Button>
          )}
        </div>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent title="Unlink GitHub?" description="The stored access token is deleted. Projects keep their files; you can link again at any time.">
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={unlink} loading={busy}>
              Unlink
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
