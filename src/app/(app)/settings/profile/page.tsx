import { Palette } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { LOCALES } from "@/lib/billing/account-service";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { PageHeader } from "@/components/app/app-shell";
import { ProfileForm } from "@/components/settings/profile-form";
import { SettingsCard } from "@/components/settings/section";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { MotionToggle } from "@/components/motion/motion-toggle";

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
  const { current } = await getCurrentWorkspace(user);
  const timezones = timezoneList();
  // Older accounts may carry a regional locale (e.g. "en-IN"); fold it onto a supported base language.
  const locale = LOCALES.some((l) => l.value === user.locale) ? user.locale : (LOCALES.find((l) => user.locale.startsWith(l.value))?.value ?? "en");
  return (
    <div className="settings-stack space-y-6">
      <PageHeader eyebrow="Account" title="Profile" description="How you appear to teammates and how dates are shown to you." />
      <ProfileForm
        initial={{ name: user.name, email: user.email, timezone: user.timezone, locale, avatarUrl: user.avatarUrl ?? "" }}
        timezones={timezones.includes("UTC") ? timezones : ["UTC", ...timezones]}
        locales={LOCALES.map((l) => ({ value: l.value, label: l.label }))}
        role={current?.role ?? null}
        workspaceName={current?.workspace.name ?? null}
        after={
          <SettingsCard id="appearance" icon={<Palette />} title="Appearance" description="Saved on this device. Both apply instantly." bodyClassName="divide-y divide-border/70 py-0">
            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="min-w-0 sm:flex-1">
                <p className="text-[13.5px] font-medium">Theme</p>
                <p className="text-xs text-muted-foreground">Paper, ink, or follow your system.</p>
              </div>
              <ThemeToggle />
            </div>
            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="min-w-0 sm:flex-1">
                <p className="text-[13.5px] font-medium">Motion</p>
                <p className="text-xs text-muted-foreground">Reduced shows final frames. Your system setting wins.</p>
              </div>
              <MotionToggle showLabel={false} />
            </div>
          </SettingsCard>
        }
      />
    </div>
  );
}
