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
 * The dashboard's opening scene ("Cinematic Orbit"): a full-bleed live backdrop that follows the page
 * theme (night space in dark, a daylight set in light; the scene picker sits quietly in a corner), a
 * letter-spaced caption, the two-line headline ("Let's build" over the cycling phrase, muted) and the
 * composer `children`, centred. `left` and `right` flank it on wide screens (usage numbers and recent
 * deploys) and stack under it on narrow ones; `bottom` runs along the foot of the scene (the projects
 * filmstrip). The top bar of the app shell floats over it.
 */
export function SpaceHero({
  caption,
  lead = "Let's build",
  phrases = SPACE_HERO_PHRASES,
  label = "Let's build your next app",
  left,
  right,
  bottom,
  children,
}: {
  caption?: React.ReactNode;
  lead?: string;
  phrases?: readonly string[];
  label?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  bottom?: React.ReactNode;
  children: React.ReactNode;
}) {
  const leadWords = lead.split(/\s+/).filter(Boolean).length;
  return (
    <section data-space-hero data-space-host aria-labelledby="space-hero-title" className="space-hero">
      <SpaceBackdrop />
      <div className="space-hero__grid">
        <div className="space-hero__content">
          {caption ? <p className="space-hero__cap">{caption}</p> : null}
          <h1 id="space-hero-title" className="space-hero__title">
            <span className="sr-only">{label}</span>
            <span aria-hidden="true">
              <RiseWords text={lead} />
              <br />
              <Rise index={leadWords} className="space-hero__phrase">
                <RotatingText phrases={phrases} jumpEvent={SPACE_MODE_EVENT} jumpTo={MODE_PHRASE} />.
              </Rise>
            </span>
          </h1>
          <div className="space-hero__composer">{children}</div>
        </div>
        {left ? <div className="space-hero__left">{left}</div> : null}
        {right ? <div className="space-hero__right">{right}</div> : null}
      </div>
      {bottom}
    </section>
  );
}
