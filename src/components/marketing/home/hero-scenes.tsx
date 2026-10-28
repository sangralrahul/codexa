import { templateShotSrc, templateShotSrcSet } from "@/components/templates/shots";
import { TEMPLATES } from "@/templates";

/**
 * Home hero scene (CSS in home.css): real starter screenshots floating at the hero's edges, over a
 * dot grid and a top spotlight. Cards show on wide screens only; each names the real starter it shows.
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
          <img src={templateShotSrc(t.id)} srcSet={templateShotSrcSet(t.id)} sizes="330px" alt="" width={1440} height={900} decoding="async" fetchPriority="low" />
          <figcaption>{t.name} starter</figcaption>
        </figure>
      ))}
    </div>
  );
}
