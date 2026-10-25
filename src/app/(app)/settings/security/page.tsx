import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentSessionId } from "@/lib/auth/session";
import { listSessions } from "@/lib/billing/account-service";
import { PageHeader } from "@/components/app/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountCard, ExportCard, PasswordForm, SessionsList } from "@/components/settings/security";

export const metadata = pageMetadata({ title: "Security settings", description: "Change your password, review active sessions, export or delete your account.", path: "/settings/security", noindex: true });

export default async function SecuritySettingsPage() {
  const user = await requireUser("/settings/security");
  const sessions = await listSessions(user.id, await getCurrentSessionId());
  const hasPassword = Boolean(user.passwordHash);
  return (
    <div className="space-y-6">
      <PageHeader title="Security" description="Password, devices and your data." />
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Changing your password signs out every other device.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm hasPassword={hasPassword} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>Devices currently signed in to your account. Sessions expire after 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <SessionsList initial={sessions} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Export your data</CardTitle>
        </CardHeader>
        <CardContent>
          <ExportCard />
        </CardContent>
      </Card>
      <Card className="border-danger/40">
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteAccountCard hasPassword={hasPassword} email={user.email} />
        </CardContent>
      </Card>
    </div>
  );
}
