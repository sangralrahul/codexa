import type { BackdropSceneSet } from "@/components/space/space-backdrop";
import { HOME_DARK_SCENES, HOME_LIGHT_SCENES } from "@/components/space/home-scenes";
import { LIGHT_PAIR, LIGHT_SPACE_SCENES, SPACE_SCENES, type DarkSceneId } from "@/components/space/scenes";
import { PUBLIC_ROUTES, getRoute } from "@/config/routes";

/**
 * The inner-page banners' scenes: all eight night scenes (the home page's four and the dashboard's four),
 * each with its daylight pair. Which page shows which is decided here, deterministically from the path
 * (no randomness, so server and client always agree):
 *
 * - product pages rotate rings → aurora → orbit in route-manifest order (neighbours always differ);
 * - solutions rotate milky way → nebula → moon → eclipse;
 * - pricing alternates eclipse and orbit; company pages share the nebula;
 * - legal and trust pages share the calm moon (lunar day by daylight); support and help the galaxy
 *   (the star chart by daylight). The closing band normally shows the galaxy, so pages whose hero is
 *   the galaxy close on the orbit instead (`closingSceneFor`).
 */
export type PageScene = "rings" | "eclipse" | "aurora" | "milkyway" | DarkSceneId;

const HOME_PAIRS = {
  rings: ["home-rings", "home-light-rings"],
  eclipse: ["home-eclipse", "home-light-eclipse"],
  aurora: ["home-aurora", "home-light-dawn"],
  milkyway: ["home-milkyway", "home-light-orrery"],
} as const;

function setFor(scene: PageScene): BackdropSceneSet {
  if (scene in HOME_PAIRS) {
    const [dark, light] = HOME_PAIRS[scene as keyof typeof HOME_PAIRS];
    return { key: `page-${scene}`, dark: HOME_DARK_SCENES.filter((s) => s.id === dark), light: HOME_LIGHT_SCENES.filter((s) => s.id === light) };
  }
  const id = scene as DarkSceneId;
  return { key: `page-${scene}`, dark: SPACE_SCENES.filter((s) => s.id === id), light: LIGHT_SPACE_SCENES.filter((s) => s.id === LIGHT_PAIR[id]) };
}

export const PAGE_SCENE_SETS = Object.fromEntries((["rings", "eclipse", "aurora", "milkyway", "orbit", "moon", "nebula", "galaxy"] as const).map((k) => [k, setFor(k)])) as Record<PageScene, BackdropSceneSet>;

/** Legal and policy pages (whatever their manifest group): the calm moon. */
const LEGAL = new Set([
  "/privacy",
  "/terms",
  "/acceptable-use",
  "/cookie-policy",
  "/data-processing",
  "/subprocessors",
  "/responsible-disclosure",
  "/vulnerability-reporting",
  "/accessibility",
  "/data-retention",
  "/ai-policy",
  "/refund-policy",
  "/trust",
  "/trust-center",
]);

const SUPPORT = new Set(["/support", "/help", "/faq", "/feedback", "/report-bug", "/request-feature", "/system-requirements", "/browser-support", "/community", "/status", "/contact"]);

const ROTATION: Partial<Record<string, PageScene[]>> = {
  product: ["rings", "aurora", "orbit"],
  solutions: ["milkyway", "nebula", "moon", "eclipse"],
  pricing: ["eclipse", "orbit"],
  company: ["nebula"],
  trust: ["aurora"],
  templates: ["milkyway"],
  support: ["galaxy"],
  docs: ["milkyway"],
  api: ["milkyway"],
  learn: ["milkyway"],
};

/** The banner scene for a page path. */
export function sceneForPath(path: string | undefined): PageScene {
  const p = (path ?? "/").split(/[?#]/)[0] || "/";
  if (LEGAL.has(p)) return "moon";
  if (SUPPORT.has(p)) return "galaxy";
  const route = getRoute(p);
  const group = route?.group ?? (p.startsWith("/solutions/") ? "solutions" : "product");
  const pool = ROTATION[group] ?? ["rings"];
  if (pool.length === 1) return pool[0];
  // Position among the area's rotating pages (legal and support pages are taken out first).
  const siblings = PUBLIC_ROUTES.filter((r) => r.group === group && !LEGAL.has(r.path) && !SUPPORT.has(r.path));
  let i = siblings.findIndex((r) => r.path === p);
  if (i < 0) i = [...p].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return pool[i % pool.length];
}

/** The closing band's scene: the galaxy, unless the hero already showed it. */
export function closingSceneFor(hero: PageScene): DarkSceneId {
  return hero === "galaxy" ? "orbit" : "galaxy";
}
