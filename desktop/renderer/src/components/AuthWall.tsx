/**
 * The sign-in screen's moving background (a port of the web's src/components/auth/auth-wall.tsx):
 * a wall of real screenshots, tilted in perspective, each column scrolling at its own speed.
 *
 * The screenshots are bundled with the app (renderer/src/assets/wall, 640×400 webp cut from the web's
 * public/templates and public/marketing captures), so nothing loads from the network before sign-in.
 *
 * Structure (all decorative, aria-hidden, alt=""):
 *   .auth-wall            absolute, fills the screen, perspective; the vignette is its ::after
 *     .auth-wall__plane   one static 3D transform (rotateX + rotateZ) for the whole wall
 *       .auth-wall__col   6 columns
 *         .auth-wall__track  the column's tiles three times; translate3d(0,-33.3%) loops it seamlessly
 *           .auth-wall__tile  a hairline frame with a tiny window bar and one screenshot
 *
 * Motion is CSS only (styles.css). Calm (Windows reduced motion or the app's own setting) shows a
 * static wall, each column at its own resting offset.
 */

const FILES = import.meta.glob<string>("../assets/wall/*.webp", { eager: true, import: "default" });
const src = (key: string) => FILES[`../assets/wall/${key}.webp`];

type Shot = { key: string; label: string };

/** Codexa's own product captures. */
const PRODUCT: Shot[] = [
  { key: "app-editor", label: "Codexa editor" },
  { key: "app-dashboard", label: "Codexa dashboard" },
  { key: "app-agent", label: "Codexa agent" },
  { key: "app-publish", label: "Codexa publish" },
];

/** Starter templates, picked for variety (apps, dashboards, stores, sites, portfolios). */
const TEMPLATES: Shot[] = [
  { key: "dash-saas", label: "SaaS metrics" },
  { key: "shop-ceramics", label: "Handmade ceramics" },
  { key: "saas-product-analytics", label: "Product analytics" },
  { key: "site-boutique-hotel", label: "Boutique hotel" },
  { key: "app-bug-tracker", label: "Bug tracker" },
  { key: "portfolio-architect", label: "Architecture practice" },
  { key: "dash-web-analytics", label: "Website analytics" },
  { key: "landing-design-conference", label: "Design conference" },
  { key: "saas-team-chat", label: "Team chat app" },
  { key: "shop-coffee-roaster", label: "Coffee roaster shop" },
  { key: "app-leads-crm", label: "Sales leads CRM" },
  { key: "site-winery", label: "Family winery" },
  { key: "dash-fleet", label: "Delivery fleet" },
  { key: "portfolio-product-designer", label: "Product designer" },
  { key: "saas-scheduling", label: "Appointment scheduling" },
  { key: "shop-furniture", label: "Furniture studio" },
  { key: "app-invoices", label: "Invoice tracker" },
  { key: "landing-podcast", label: "Interview podcast" },
  { key: "dash-sales", label: "Sales dashboard" },
  { key: "shop-plants", label: "House plant shop" },
];

const COLUMNS = 6;

/** 24 tiles dealt round-robin into 6 columns of 4, the product captures spread across the columns. */
function columns(): Shot[][] {
  const all = TEMPLATES.filter((s) => src(s.key));
  PRODUCT.filter((s) => src(s.key)).forEach((p, i) => all.splice(Math.min(all.length, 1 + i * 7), 0, p));
  const cols: Shot[][] = Array.from({ length: COLUMNS }, () => []);
  all.forEach((shot, i) => cols[i % COLUMNS].push(shot));
  return cols;
}
const COLS = columns();

function Tile({ shot }: { shot: Shot }) {
  return (
    <div className="auth-wall__tile">
      <div className="auth-wall__bar">
        <span />
        <span />
        <span />
        <em>{shot.label}</em>
      </div>
      <img src={src(shot.key)} alt="" width={640} height={400} decoding="async" draggable={false} />
    </div>
  );
}

export function AuthWall() {
  return (
    <div className="auth-wall" aria-hidden="true">
      <div className="auth-wall__plane">
        {COLS.map((col, c) => (
          <div key={c} className="auth-wall__col" data-col={c}>
            <div className="auth-wall__track">{[0, 1, 2].map((copy) => col.map((shot) => <Tile key={`${copy}-${shot.key}`} shot={shot} />))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
