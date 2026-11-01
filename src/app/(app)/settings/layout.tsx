import "@/components/settings/settings.css";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentSessionId } from "@/lib/auth/session";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { getSettingsNavMeta } from "@/lib/services/settings-overview";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsNav } from "@/components/settings/settings-nav";
import { SpaceBanner } from "@/components/app/space-hero/space-banner";

/**
 * Settings shell: a sticky sub-navigation (search, icons, live meta chips) beside the page
 * column. The column re-mounts through settings/template.tsx on every sub-page change, so it
 * eases in while the nav pill glides. A space banner heads the section; its title is not a heading
 * because each page renders its own <h1> via PageHeader.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/settings");
  const { current } = await getCurrentWorkspace(user);
  const meta = await getSettingsNavMeta(user, current?.workspace.id ?? null, await getCurrentSessionId()).catch(() => null);
  return (
    <TooltipProvider delayDuration={300}>
      <SpaceBanner
        scene="orbit"
        titleAs="p"
        eyebrow="Settings"
        title={current ? current.workspace.name : "Your account"}
        subtitle={current ? "Your profile and security, and this workspace's members, billing, usage and integrations." : "Your profile, security and workspaces."}
      />
      <div className="settings-shell mx-auto w-full max-w-[1296px] px-4 pb-24 pt-6 sm:px-6 lg:pb-16 lg:pt-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          <SettingsNav
            workspaceName={current?.workspace.name ?? null}
            meta={meta ? { plan: meta.plan?.name ?? null, seats: meta.seats, integrations: meta.integrations, otherSessions: meta.otherSessions } : undefined}
          />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </TooltipProvider>
  );
}
