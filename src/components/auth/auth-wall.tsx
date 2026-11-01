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

type Shot = { key: string; src: string; srcSet?: string; label: string; dark?: boolean };

/** Codexa's own product captures (public/marketing, 16:10). They are dark-theme captures, so the light
 * theme shows them inverted (auth.css) rather than as grey slabs through the white vignette. */
const PRODUCT: Shot[] = [
  { key: "app-editor", dark: true, src: "/marketing/app-editor.webp", label: "Codexa editor" },
  { key: "app-dashboard", dark: true, src: "/marketing/app-dashboard.webp", label: "Codexa dashboard" },
  { key: "app-agent", dark: true, src: "/marketing/app-agent.webp", label: "Codexa agent" },
  { key: "app-publish", dark: true, src: "/marketing/app-publish.webp", label: "Codexa publish" },
];

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
  return (
    <div className="auth-wall__tile" data-dark={shot.dark ? "" : undefined}>
      <div className="auth-wall__bar">
        <span />
        <span />
        <span />
        <em>{shot.label}</em>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={shot.src} srcSet={shot.srcSet} sizes="(max-width: 640px) 220px, 320px" alt="" width={1440} height={900} loading="lazy" decoding="async" fetchPriority="low" draggable={false} />
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
