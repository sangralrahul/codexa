import type { ReactNode } from "react";
import { Avatar } from "../../ui";
import { SpaceBackdrop } from "./SpaceBackdrop";

/**
 * Home's opening hero (a port of the web dashboard's SpaceHero): a full-width live space scene, always
 * dark (a `.dark` token island), with the workspace chip, the question and the composer centred on
 * top. The bottom edge fades into the page colour (captured outside the island as --hero-page).
 */
export function SpaceHero({
  workspace,
  onWorkspace,
  title = "What will you build today?",
  children,
}: {
  workspace: { id: string; name: string; plan: string } | null;
  onWorkspace: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-hero-wrap">
      <section data-space-hero aria-labelledby="space-hero-title" className="space-hero dark">
        <SpaceBackdrop />
        <div className="space-hero__content">
          {workspace ? (
            <button type="button" onClick={onWorkspace} className="space-hero__chip" title={`${workspace.name} workspace settings`}>
              <Avatar name={workspace.name} size={20} />
              <span className="min-w-0 truncate font-medium text-fg">{workspace.name}</span>
              <span className="space-hero__plan">{workspace.plan}</span>
            </button>
          ) : null}
          <h1 id="space-hero-title" className="space-hero__title">
            {title}
          </h1>
          <div className="mt-8 w-full">{children}</div>
        </div>
      </section>
    </div>
  );
}
