import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { SettingsNav } from "@/components/settings/settings-nav";

/**
 * Settings shell: two-column layout (sticky sub-navigation on the left, page
 * content on the right at a comfortable reading width). Each page renders its own <h1> via PageHeader.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/settings");
  const { current } = await getCurrentWorkspace(user);
  return (
    <div className="container-x py-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-12">
        <SettingsNav workspaceName={current?.workspace.name ?? null} />
        <div className="min-w-0 max-w-3xl flex-1">{children}</div>
      </div>
    </div>
  );
}
