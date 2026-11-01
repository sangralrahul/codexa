import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { SpaceBackdrop } from "./space-backdrop";

export type SpaceHeroWorkspace = { id: string; name: string; plan: string };

/**
 * The dashboard's opening hero: a full-bleed live space scene (always dark, a `.dark` token island)
 * with the workspace chip, the question and whatever composer `children` renders, centred on top.
 * The bottom edge fades into the page background (captured outside the island as --hero-page).
 */
export function SpaceHero({ workspace, title = "What will you build today?", children }: { workspace: SpaceHeroWorkspace | null; title?: string; children: React.ReactNode }) {
  return (
    <div className="space-hero-wrap">
      <section data-space-hero aria-labelledby="space-hero-title" className="space-hero dark">
        <SpaceBackdrop />
        <div className="space-hero__content">
          {workspace ? (
            <Link href="/settings/workspace" className="space-hero__chip" title={`${workspace.name} workspace settings`}>
              <Avatar name={workspace.name} seed={workspace.id} shape="square" size="xs" />
              <span className="min-w-0 truncate font-medium text-foreground">{workspace.name}</span>
              <span className="space-hero__plan">{workspace.plan}</span>
            </Link>
          ) : null}
          <h1 id="space-hero-title" className="space-hero__title">
            {title}
          </h1>
          <div className="mt-7 w-full sm:mt-9">{children}</div>
        </div>
      </section>
    </div>
  );
}
