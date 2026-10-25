"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderGit2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
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

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="danger" title="GitHub error">
          {error}
        </Alert>
      ) : null}
      {!configured ? (
        <Alert variant="warning" title="GitHub is not configured on this server">
          Set <code className="font-mono text-xs">GITHUB_CLIENT_ID</code> and <code className="font-mono text-xs">GITHUB_CLIENT_SECRET</code> (create an OAuth app at github.com/settings/developers with the callback URL{" "}
          <code className="font-mono text-xs">&lt;APP_URL&gt;/api/auth/github/callback</code>) and restart the app.
        </Alert>
      ) : null}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <FolderGit2 className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
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
          ) : configured ? (
            <Button asChild>
              <a href={startUrl}>Connect GitHub</a>
            </Button>
          ) : (
            <Button disabled title="GitHub is not configured on this server">
              Connect GitHub
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
