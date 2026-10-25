import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { SettingsNav } from "@/components/settings/settings-nav";

/**
 * Settings shell: breadcrumb + two-column layout (sub-navigation on the left,
 * page content on the right). Each page renders its own <h1> via PageHeader.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/settings");
  const { current } = await getCurrentWorkspace(user);
  return (
    <div className="container-x py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
        <ol className="flex items-center gap-1">
          <li>
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3" />
          </li>
          <li>
            <Link href="/settings" className="hover:text-foreground">
              Settings
            </Link>
          </li>
        </ol>
      </nav>
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        <SettingsNav workspaceName={current?.workspace.name ?? null} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
