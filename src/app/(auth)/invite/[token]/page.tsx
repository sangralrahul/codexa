import { getCurrentUser } from "@/lib/auth/session";
import { previewInvite } from "@/lib/billing/team-service";
import { authPageMetadata } from "@/components/auth/meta";
import { InviteView } from "@/components/auth/invite-view";

export const metadata = authPageMetadata({ title: "Workspace invitation", description: "Accept an invitation to join a Codexa workspace.", path: "/invite", noindex: true });

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [preview, user] = await Promise.all([previewInvite(token), getCurrentUser()]);
  // eslint-disable-next-line react-hooks/purity -- a server render: "now" is the request time
  const now = Date.now();
  return <InviteView token={token} preview={preview} user={user ? { email: user.email } : null} now={now} />;
}
