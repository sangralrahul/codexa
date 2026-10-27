import { templateShotSrc } from "@/components/templates/shots";
import { TEMPLATES } from "@/templates";

/**
 * Hero scenes for the alternative hero styles (CSS in home.css).
 * - <HeroFloats> ("studio"): real starter screenshots floating at the hero's edges, over a dot grid
 *   and a top spotlight. Desktop only; each card names the real starter it shows.
 * - <HeroWash> ("wash"): a full-bleed grainy gradient of brand colour that drifts slowly.
 */
const FLOATS = ["vite-react-dashboard", "vite-react-crm", "vite-react-storefront", "vite-react-ai-chat"] as const;

export function HeroFloats() {
  const cards = FLOATS.map((id) => TEMPLATES.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => Boolean(t));
  return (
    <div aria-hidden="true" className="hero-studio -z-10">
      <div className="hero-studio__grid" />
      <div className="hero-studio__spot" />
      {cards.map((t, i) => (
        <figure key={t.id} className={`hero-float hero-float--${i + 1}`}>
          <div className="hero-float__bar">
            <span />
            <span />
            <span />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- static screenshot, decorative */}
          <img src={templateShotSrc(t.id)} alt="" width={1440} height={900} loading="eager" decoding="async" />
          <figcaption>{t.name} starter</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function HeroWash() {
  return (
    <div aria-hidden="true" className="hero-wash -z-10">
      <span className="hero-wash__blob hero-wash__blob--1" />
      <span className="hero-wash__blob hero-wash__blob--2" />
      <span className="hero-wash__blob hero-wash__blob--3" />
      <span className="hero-wash__blob hero-wash__blob--4" />
      <span className="hero-wash__veil" />
    </div>
  );
}
