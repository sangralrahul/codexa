import Link from "next/link";
import { Users } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { getCurrentUser } from "@/lib/auth/session";
import { previewInvite } from "@/lib/billing/team-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { LogoutAndSwitch } from "@/components/settings/logout-and-switch";
import { InviteAcceptButton } from "@/components/settings/invite-accept";

export const metadata = pageMetadata({ title: "Workspace invitation", description: "Accept an invitation to join a Codexa workspace.", path: "/invite", noindex: true });

const ROLE_LABEL = { owner: "Owner", admin: "Admin", editor: "Editor", viewer: "Viewer" } as const;

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [preview, user] = await Promise.all([previewInvite(token), getCurrentUser()]);
  const next = `/invite/${encodeURIComponent(token)}`;

  if (!preview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitation not found</CardTitle>
          <CardDescription>This link is invalid or was revoked. Ask the workspace owner to send a new invitation.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard" className={buttonClasses("outline", "md", "w-full")}>
            Go to dashboard
          </Link>
        </CardContent>
      </Card>
    );
  }

  const matches = user ? user.email.toLowerCase() === preview.email : false;
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <span className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Users className="size-6" aria-hidden="true" />
        </span>
        <CardTitle className="text-xl">You&apos;re invited to {preview.workspace.name}</CardTitle>
        <CardDescription>
          {preview.inviterName ? `${preview.inviterName} invited you` : "You were invited"} to join as <Badge variant="primary">{ROLE_LABEL[preview.role]}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-sm text-muted-foreground">
          Sent to <span className="font-medium text-foreground">{preview.email}</span>
          {preview.expired ? "" : ` · expires ${new Date(preview.expiresAt).toLocaleDateString()}`}
        </p>
        {preview.accepted ? (
          <Alert variant="info" title="Already accepted">
            This invitation has been used.{" "}
            <Link href="/dashboard" className="underline">
              Open the dashboard
            </Link>
            .
          </Alert>
        ) : preview.expired ? (
          <Alert variant="warning" title="Invitation expired">
            Ask {preview.inviterName ?? "the workspace owner"} to resend it from the workspace&apos;s Members page.
          </Alert>
        ) : !user ? (
          <div className="space-y-2">
            <Link href={`/signup?next=${encodeURIComponent(next)}&email=${encodeURIComponent(preview.email)}`} className={buttonClasses("primary", "md", "w-full")}>
              Create an account to join
            </Link>
            <Link href={`/login?next=${encodeURIComponent(next)}`} className={buttonClasses("outline", "md", "w-full")}>
              I already have an account
            </Link>
            <p className="text-center text-xs text-muted-foreground">Sign in with {preview.email} to accept.</p>
          </div>
        ) : matches ? (
          <InviteAcceptButton token={token} workspaceName={preview.workspace.name} />
        ) : (
          <div className="space-y-3">
            <Alert variant="warning" title="Different account">
              You are signed in as {user.email}, but this invitation was sent to {preview.email}. Sign out and sign in with the invited address to accept.
            </Alert>
            <LogoutAndSwitch next={next} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
