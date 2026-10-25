import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { LOCALES } from "@/lib/billing/account-service";
import { PageHeader } from "@/components/app/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/profile-form";

export const metadata = pageMetadata({ title: "Profile settings", description: "Update your name, time zone, language and avatar.", path: "/settings/profile", noindex: true });

function timezoneList(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["UTC"];
  }
}

export default async function ProfileSettingsPage() {
  const user = await requireUser("/settings/profile");
  const timezones = timezoneList();
  // Older accounts may carry a regional locale (e.g. "en-IN"); fold it onto a supported base language.
  const locale = LOCALES.some((l) => l.value === user.locale) ? user.locale : (LOCALES.find((l) => user.locale.startsWith(l.value))?.value ?? "en");
  return (
    <div>
      <PageHeader title="Profile" description="How you appear to teammates and how dates are shown to you." />
      <Card>
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
          <CardDescription>These details are visible to members of workspaces you belong to.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initial={{ name: user.name, email: user.email, timezone: user.timezone, locale, avatarUrl: user.avatarUrl ?? "" }}
            timezones={timezones.includes("UTC") ? timezones : ["UTC", ...timezones]}
            locales={LOCALES.map((l) => ({ value: l.value, label: l.label }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
