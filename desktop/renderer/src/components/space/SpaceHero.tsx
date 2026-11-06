import type { ReactNode } from "react";
import { Avatar } from "../../ui";
import { SpaceBackdrop } from "./SpaceBackdrop";
import { Rise, RiseWords, RotatingText } from "../RotatingText";

/** Things Codexa builds from its starters (same list as the web dashboard). */
export const SPACE_HERO_PHRASES = ["a booking app", "a SaaS dashboard", "a mobile app", "an online store", "a portfolio", "a REST API", "a landing page"] as const;
/** Home's runtime tabs (MODES ids) dispatch this so the headline jumps to a matching phrase. */
export const SPACE_MODE_EVENT = "codexa:space-mode";
const MODE_PHRASE: Record<string, number> = { web: 1, mobile: 2, site: 6, api: 5 };

/**
 * Home's opening hero (a port of the web dashboard's SpaceHero): a full-width live scene that follows
 * the app theme (night space in dark, a daylight set in light), with the workspace chip, the headline
 * ("Let's build" + a cycling phrase; screen readers get the stable `label`) and the composer centred on top. The bottom edge fades into the page colour (--hero-page).
 */
export function SpaceHero({
  workspace,
  onWorkspace,
  lead = "Let's build",
  phrases = SPACE_HERO_PHRASES,
  label = "Let's build your next app",
  children,
}: {
  workspace: { id: string; name: string; plan: string } | null;
  onWorkspace: () => void;
  lead?: string;
  phrases?: readonly string[];
  label?: string;
  children: ReactNode;
}) {
  const leadWords = lead.split(/\s+/).filter(Boolean).length;
  return (
    <div className="space-hero-wrap">
      <section data-space-hero aria-labelledby="space-hero-title" data-space-host className="space-hero">
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
            <span className="sr-only">{label}</span>
            <span aria-hidden="true">
              <RiseWords text={lead} />{" "}
              <Rise index={leadWords}>
                <RotatingText phrases={phrases} underline jumpEvent={SPACE_MODE_EVENT} jumpTo={MODE_PHRASE} />
              </Rise>
            </span>
          </h1>
          <div className="mt-8 w-full">{children}</div>
        </div>
      </section>
    </div>
  );
}
