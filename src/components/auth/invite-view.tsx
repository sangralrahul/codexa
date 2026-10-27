import Link from "next/link";
import { Clock } from "lucide-react";
import type { previewInvite } from "@/lib/billing/team-service";
import { AuthCard } from "@/components/auth/auth-card";
import { Avatar } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InviteAccept, RoleChip, SwitchAccount } from "./invite-actions";
import { withAuthParams } from "./params";

export type InvitePreview = NonNullable<Awaited<ReturnType<typeof previewInvite>>>;

const ROLE_LABEL = { owner: "Owner", admin: "Admin", editor: "Editor", viewer: "Viewer" } as const;
// Same wording as the Members settings page.
const ROLE_HELP = {
  owner: "Full control including billing, ownership transfer and deleting the workspace.",
  admin: "Manage members, settings and integrations. Cannot change owners.",
  editor: "Create and edit projects, run the AI agent and deploy.",
  viewer: "Read-only access to projects and activity.",
} as const;

/** "Expires in 6 days" / "Expires in 5 hours" / "Expired 2 days ago", and whether it is close (under a day). */
export function inviteExpiry(iso: string, now: number) {
  const ms = new Date(iso).getTime() - now;
  const abs = Math.abs(ms);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
    abs >= 86_400_000 ? [Math.round(ms / 86_400_000), "day"] : abs >= 3_600_000 ? [Math.round(ms / 3_600_000), "hour"] : [Math.max(1, Math.round(abs / 60_000)) * Math.sign(ms || 1), "minute"];
  const rel = rtf.format(value, unit);
  return { label: ms > 0 ? `Expires ${rel}` : `Expired ${rel}`, soon: ms > 0 && ms < 86_400_000 };
}

/**
 * The invitation page body (server-safe; the page loads the invite and the session).
 * Branches, all kept: not found, already accepted, expired, signed out, signed in with the
 * invited address (Join), signed in with another address (switch account).
 */
export function InviteView({ token, preview, user, now }: { token: string; preview: InvitePreview | null; user: { email: string } | null; now: number }) {
  const next = `/invite/${encodeURIComponent(token)}`;

  if (!preview) {
    return (
      <AuthCard title="Invitation not found." highlight="not found." description="This link is invalid or was revoked. Ask the workspace owner to send a new invitation.">
        <div className="flex flex-col gap-3">
          <Link href="/dashboard" className={buttonClasses("primary", "lg", "w-full text-[15px]")}>
            Go to dashboard
          </Link>
          <Link href="/login" className={buttonClasses("ghost", "lg", "w-full text-[15px]")}>
            Sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  const ws = preview.workspace;
  const matches = user ? user.email.toLowerCase() === preview.email : false;
  const exp = inviteExpiry(preview.expiresAt, now);

  return (
    <AuthCard
      title={`Join ${ws.name}`}
      highlight={ws.name}
      eyebrow={
        <div className="flex items-center gap-3.5">
          <span className="invite-mark">
            <Avatar name={ws.name} seed={ws.id} shape="square" size="xl" />
          </span>
          <div className="min-w-0">
            <p className="text-label text-muted-foreground">Workspace invitation</p>
            <p className="mt-1.5 truncate text-sm text-foreground">{preview.inviterName ? `From ${preview.inviterName}` : "You were invited"}</p>
          </div>
        </div>
      }
      description={
        <div className="flex flex-wrap items-center gap-2">
          <span>Join as</span>
          <RoleChip label={ROLE_LABEL[preview.role]} help={ROLE_HELP[preview.role]} />
          {preview.accepted ? null : (
            <span
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium shadow-[inset_0_0_0_1px_var(--border)]",
                preview.expired ? "bg-danger/10 text-danger" : exp.soon ? "bg-warning/12 text-warning" : "bg-muted text-muted-foreground",
              )}
            >
              <Clock className="size-3" aria-hidden="true" />
              <time dateTime={preview.expiresAt}>{exp.label}</time>
            </span>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Sent to <span className="font-medium text-foreground">{preview.email}</span>
        </p>
        {preview.accepted ? (
          <Alert variant="info" title="Already accepted">
            This invitation has been used.{" "}
            <Link href="/dashboard" className="font-medium text-foreground underline underline-offset-4">
              Open the dashboard
            </Link>
            .
          </Alert>
        ) : preview.expired ? (
          <Alert variant="warning" title="Invitation expired">
            Ask {preview.inviterName ?? "the workspace owner"} to resend it from the workspace&apos;s Members page.
          </Alert>
        ) : !user ? (
          <div className="flex flex-col gap-3">
            <Link href={withAuthParams("/signup", { next, email: preview.email })} className={buttonClasses("primary", "lg", "w-full text-[15px]")}>
              Create an account to join
            </Link>
            <Link href={withAuthParams("/login", { next, email: preview.email })} className={buttonClasses("outline", "lg", "w-full text-[15px]")}>
              I already have an account
            </Link>
            <p className="text-center text-xs text-muted-foreground">Sign in with {preview.email} to accept.</p>
          </div>
        ) : matches ? (
          <InviteAccept token={token} workspaceName={ws.name} />
        ) : (
          <div className="flex flex-col gap-3">
            <Alert variant="warning" title="Different account">
              You are signed in as {user.email}, but this invitation was sent to {preview.email}. Sign out and sign in with the invited address to accept.
            </Alert>
            <SwitchAccount next={next} email={preview.email} />
          </div>
        )}
      </div>
    </AuthCard>
  );
}
