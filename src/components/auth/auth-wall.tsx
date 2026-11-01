import { TEMPLATES } from "@/templates";
import { TEMPLATE_SHOTS, templateShotSrc, templateShotSrcSet } from "@/components/templates/shots";

/**
 * The account pages' moving background: a wall of real screenshots, tilted in perspective.
 *
 * Structure (all decorative, aria-hidden, alt=""):
 *   .auth-wall            fixed, full-viewport, perspective; the vignette is its ::after
 *     .auth-wall__plane   one static 3D transform (rotateX + rotateZ) for the whole wall
 *       .auth-wall__col   a column (6 on desktop, 3 on phones)
 *         .auth-wall__track  the column's tiles twice; translate3d(0,-50%) loops it seamlessly
 *           .auth-wall__tile  a hairline frame with a tiny window bar and one screenshot
 *
 * Motion is CSS only (auth.css): every track scrolls at its own speed, alternate columns in
 * opposite directions. Calm (OS reduced motion or <html data-motion="reduced">) shows a static wall.
 * Browsers already stop CSS animations in hidden tabs, so no visibility listener is needed.
 */

type Shot = { key: string; src: string; srcSet?: string; label: string; lightSrc?: string };

/** Codexa's own product captures (public/marketing, 16:10), each in both themes: `<name>.webp` is the
 * dark capture and `<name>-light.webp` the light one; auth.css displays the one matching the site. */
const PRODUCT: Shot[] = [
  { key: "app-editor", label: "Codexa editor" },
  { key: "app-dashboard", label: "Codexa dashboard" },
  { key: "app-agent", label: "Codexa agent" },
  { key: "app-publish", label: "Codexa publish" },
].map((p) => ({ ...p, src: `/marketing/${p.key}.webp`, lightSrc: `/marketing/${p.key}-light.webp` }));

/** Starter templates, picked for variety (apps, dashboards, stores, sites, portfolios). */
const TEMPLATE_IDS = [
  "dash-saas",
  "shop-ceramics",
  "saas-product-analytics",
  "site-boutique-hotel",
  "app-bug-tracker",
  "portfolio-architect",
  "dash-web-analytics",
  "landing-design-conference",
  "saas-team-chat",
  "shop-coffee-roaster",
  "app-leads-crm",
  "site-winery",
  "dash-fleet",
  "portfolio-product-designer",
  "saas-scheduling",
  "shop-furniture",
  "app-invoices",
  "landing-podcast",
  "dash-sales",
  "site-architecture-studio",
  "vite-react-ai-chat",
  "shop-plants",
  "app-hiring-pipeline",
  "landing-meal-kit",
  "dash-support",
  "portfolio-motion-designer",
];

function templateShots(): Shot[] {
  return TEMPLATE_IDS.filter((id) => TEMPLATE_SHOTS.has(id)).map((id) => ({
    key: id,
    src: templateShotSrc(id),
    srcSet: templateShotSrcSet(id),
    label: TEMPLATES.find((t) => t.id === id)?.name ?? id,
  }));
}

const COLUMNS = 6;

/** 30 tiles dealt round-robin into 6 columns of 5, product captures spread across columns 1–4. */
function columns(): Shot[][] {
  const pool = templateShots();
  const all = [...pool];
  PRODUCT.forEach((p, i) => all.splice(Math.min(all.length, 1 + i * 7), 0, p));
  const cols: Shot[][] = Array.from({ length: COLUMNS }, () => []);
  all.forEach((shot, i) => cols[i % COLUMNS].push(shot));
  return cols;
}

function Tile({ shot }: { shot: Shot }) {
  const img = { sizes: "(max-width: 640px) 220px, 320px", alt: "", width: 1440, height: 900, loading: "lazy", decoding: "async", fetchPriority: "low", draggable: false } as const;
  return (
    <div className="auth-wall__tile">
      <div className="auth-wall__bar">
        <span />
        <span />
        <span />
        <em>{shot.label}</em>
      </div>
      {shot.lightSrc ? (
        // A theme pair: only the current theme's copy displays (auth.css), and a lazy image that is
        // display:none is never fetched.
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img {...img} src={shot.src} data-theme-img="dark" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img {...img} src={shot.lightSrc} data-theme-img="light" />
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img {...img} src={shot.src} srcSet={shot.srcSet} />
      )}
    </div>
  );
}

export function AuthWall() {
  const cols = columns();
  return (
    <div className="auth-wall" aria-hidden="true">
      <div className="auth-wall__plane">
        {cols.map((col, c) => (
          <div key={c} className="auth-wall__col" data-col={c}>
            <div className="auth-wall__track">
              {[0, 1].map((copy) => col.map((shot) => <Tile key={`${copy}-${shot.key}`} shot={shot} />))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
