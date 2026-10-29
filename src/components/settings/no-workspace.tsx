import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { PageHeader } from "@/components/app/app-shell";
import { EmptyState } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";

/** Shared "no workspace yet" state for the workspace settings pages (members, billing, usage …). */
export function NoWorkspace({ title, what }: { title: string; what: string }) {
  return (
    <div className="settings-stack space-y-6">
      <PageHeader eyebrow="Workspace" title={title} description={`Workspace settings appear once you have a workspace.`} />
      <EmptyState
        icon={<Building2 />}
        title="No workspace selected"
        description={`Create a workspace to manage ${what}. It starts on the Free plan, with you as owner.`}
        action={
          <Link href="/settings/workspaces/new" className={buttonClasses("primary", "sm")}>
            <Plus className="size-3.5" aria-hidden="true" /> Create workspace
          </Link>
        }
      />
    </div>
  );
}
