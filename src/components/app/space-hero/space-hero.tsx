import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { SpaceBackdrop } from "@/components/space/space-backdrop";
import { RotatingText } from "@/components/motion/rotating-text";
import { Rise, RiseWords } from "@/components/motion/rise-words";

export type SpaceHeroWorkspace = { id: string; name: string; plan: string };

/** Things Codexa builds from its starters (web app, mobile app, website and API runtimes). */
export const SPACE_HERO_PHRASES = ["a booking app", "a SaaS dashboard", "a mobile app", "an online store", "a portfolio", "a REST API", "a landing page"] as const;
/** The composer's runtime tabs (dashboard MODE_DEFS ids) jump the headline to a matching phrase. */
export const SPACE_MODE_EVENT = "codexa:space-mode";
const MODE_PHRASE: Record<string, number> = { web: 1, mobile: 2, site: 6, api: 5 };

/**
 * The dashboard's opening hero: a full-bleed live scene that follows the page theme (night space in
 * dark, a daylight set in light) with the workspace chip, the question and whatever composer `children`
 * renders, centred on top. The bottom edge fades into the page background (--hero-page).
 */
export function SpaceHero({
  workspace,
  lead = "Let's build",
  phrases = SPACE_HERO_PHRASES,
  label = "Let's build your next app",
  children,
}: {
  workspace: SpaceHeroWorkspace | null;
  lead?: string;
  phrases?: readonly string[];
  label?: string;
  children: React.ReactNode;
}) {
  const leadWords = lead.split(/\s+/).filter(Boolean).length;
  return (
    <div className="space-hero-wrap">
      <section data-space-hero data-space-host aria-labelledby="space-hero-title" className="space-hero">
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
            <span className="sr-only">{label}</span>
            <span aria-hidden="true">
              <RiseWords text={lead} />
              <br className="space-hero__br" />{" "}
              <Rise index={leadWords}>
                <RotatingText phrases={phrases} underline jumpEvent={SPACE_MODE_EVENT} jumpTo={MODE_PHRASE} />
              </Rise>
            </span>
          </h1>
          <div className="mt-7 w-full sm:mt-9">{children}</div>
        </div>
      </section>
    </div>
  );
}
