import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentSessionId } from "@/lib/auth/session";
import { listSessions } from "@/lib/billing/account-service";
import { getGithubAccount } from "@/lib/github/accounts";
import { capabilities } from "@/lib/env";
import { PageHeader } from "@/components/app/app-shell";
import { DeleteAccountCard, ExportCard, PasswordForm, SessionsList } from "@/components/settings/security";
import { SecurityStatus } from "@/components/settings/security-status";

export const metadata = pageMetadata({ title: "Security settings", description: "Change your password, review active sessions, export or delete your account.", path: "/settings/security", noindex: true });

/** Other, unexpired sessions (expired rows can linger until the cleanup job runs). */
function countOtherSessions(sessions: { current: boolean; expiresAt: string }[]) {
  const now = new Date();
  return sessions.filter((s) => !s.current && new Date(s.expiresAt) > now).length;
}

export default async function SecuritySettingsPage() {
  const user = await requireUser("/settings/security");
  const [sessions, github] = await Promise.all([listSessions(user.id, await getCurrentSessionId()), getGithubAccount(user.id)]);
  const hasPassword = Boolean(user.passwordHash);
  const otherSessions = countOtherSessions(sessions);
  return (
    <div className="settings-stack space-y-6">
      <PageHeader eyebrow="Account" title="Security" description="Password, devices and your data. Only real checks here: nothing is scored or assumed." />
      <SecurityStatus
        passwordSet={hasPassword}
        emailVerified={Boolean(user.emailVerifiedAt)}
        emailConfigured={capabilities.email}
        email={user.email}
        otherSessions={otherSessions}
        github={github ? { linked: true, username: github.username } : capabilities.github ? { linked: false, username: null } : null}
      />
      <PasswordForm hasPassword={hasPassword} />
      <SessionsList initial={sessions} />
      <ExportCard />
      <DeleteAccountCard hasPassword={hasPassword} email={user.email} />
    </div>
  );
}
