import { useCallback, useState, type ReactNode } from "react";
import { SpaceBackdrop } from "./SpaceBackdrop";
import type { SpaceScene } from "./scenes";
import { Rise, RiseWords, RotatingText } from "../RotatingText";

/** Things Codexa builds from its starters (same list as the web dashboard). */
export const SPACE_HERO_PHRASES = ["a booking app", "a SaaS dashboard", "a mobile app", "an online store", "a portfolio", "a REST API", "a landing page"] as const;
/** Home's runtime tabs (MODES ids) dispatch this so the headline jumps to a matching phrase. */
export const SPACE_MODE_EVENT = "codexa:space-mode";
const MODE_PHRASE: Record<string, number> = { web: 1, mobile: 2, site: 6, api: 5 };

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

/**
 * Home's opening scene ("Cinematic Orbit"): a full-bleed live backdrop that follows the app theme (night
 * space in dark, a daylight set in light) with a film-poster composition on top. A wide letter-spaced
 * caption (scene number and name, a greeting), a gigantic two-tone headline ("Let's build" over a
 * cycling phrase; screen readers get the stable `label`) and the composer sit in the centre column;
 * `left` (usage figures) and `right` (recent deploys) flank it, and `strip` (the projects filmstrip)
 * runs along the bottom edge. Below ~1000px of width the side columns drop under the composer.
 */
export function SpaceHero({
  name,
  lead = "Let's build",
  phrases = SPACE_HERO_PHRASES,
  label = "Let's build your next app",
  left,
  right,
  strip,
  children,
}: {
  /** The signed-in person's first name for the caption's greeting (omitted when unknown). */
  name?: string | null;
  lead?: string;
  phrases?: readonly string[];
  label?: string;
  left?: ReactNode;
  right?: ReactNode;
  strip?: ReactNode;
  children: ReactNode;
}) {
  const leadWords = lead.split(/\s+/).filter(Boolean).length;
  const [scene, setScene] = useState<{ label: string; number: number } | null>(null);
  const onScene = useCallback((s: SpaceScene, number: number) => setScene((cur) => (cur && cur.label === s.label && cur.number === number ? cur : { label: s.label, number })), []);
  const hello = `${greeting()}${name ? `, ${name}` : ""}`;

  return (
    <div className="space-hero-wrap">
      <section data-space-hero aria-labelledby="space-hero-title" data-space-host className="space-hero cine">
        <SpaceBackdrop start={{ dark: "galaxy", light: "lunar" }} onScene={onScene} />
        <div className="cine__stage">
          <div className="cine__center">
            <p className="cine-cap cine__caption">
              {scene ? (
                <span className="cine__scene">
                  Scene {String(scene.number).padStart(2, "0")} · {scene.label}
                  <span aria-hidden="true" className="cine__sep">
                    ·
                  </span>
                </span>
              ) : null}
              <span>{hello}</span>
            </p>
            <h1 id="space-hero-title" className="cine__title">
              <span className="sr-only">{label}</span>
              <span aria-hidden="true">
                <span className="cine__lead">
                  <RiseWords text={lead} />
                </span>
                <span className="cine__phrase">
                  <Rise index={leadWords}>
                    <RotatingText phrases={phrases} jumpEvent={SPACE_MODE_EVENT} jumpTo={MODE_PHRASE} />
                  </Rise>
                </span>
              </span>
            </h1>
            <div className="cine__composer">{children}</div>
          </div>
          {left ? <div className="cine__left">{left}</div> : null}
          {right ? <div className="cine__right">{right}</div> : null}
        </div>
        {strip}
      </section>
    </div>
  );
}
