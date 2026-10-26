import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentSessionId } from "@/lib/auth/session";
import { listSessions } from "@/lib/billing/account-service";
import { PageHeader } from "@/components/app/app-shell";
import { DeleteAccountCard, ExportCard, PasswordForm, SessionsList } from "@/components/settings/security";

export const metadata = pageMetadata({ title: "Security settings", description: "Change your password, review active sessions, export or delete your account.", path: "/settings/security", noindex: true });

export default async function SecuritySettingsPage() {
  const user = await requireUser("/settings/security");
  const sessions = await listSessions(user.id, await getCurrentSessionId());
  const hasPassword = Boolean(user.passwordHash);
  return (
    <div className="space-y-6">
      <PageHeader title="Security" description="Password, devices and your data." />
      <PasswordForm hasPassword={hasPassword} />
      <SessionsList initial={sessions} />
      <ExportCard />
      <DeleteAccountCard hasPassword={hasPassword} email={user.email} />
    </div>
  );
}
