import "server-only";
import { TEMPLATES, TEMPLATE_CATEGORIES, TEMPLATE_FRAMEWORKS, FRAMEWORKS } from "@/templates";
import { TEMPLATE_SHOTS, templatePhoneShotSrc, templateShotFor } from "@/components/templates/shots";
import { templatePreviewHref } from "@/components/templates/template-card";
import { PLANS, PLAN_ORDER, formatPrice } from "@/config/plans";
import { FACTS } from "@/content/marketing/facts";
import { scanProject, type CheckCategory } from "@/lib/services/site-checks";

/**
 * Everything the home page ("Cinematic Orbit") shows that comes from code or config (PLAN §1: no
 * hard-coded numbers). Computed per render on the server; only plain data crosses into the page.
 */

export type HomeReel = { id: string; name: string; runtime: string; href: string; src: string };
export type HomeCategory = { id: string; name: string; href: string; count: number };
export type HomeCheck = { title: string; category: CheckCategory };
export type HomePlan = {
  id: string;
  name: string;
  price: string;
  /** "/mo" for paid plans, empty for free and custom. */
  per: string;
  /** The INR line, or the plan's audience when it has no list price. */
  inr: string;
  tagline: string;
  features: string[];
  cta: { label: string; href: string };
  highlight: boolean;
};

/** Short runtime tags for the filmstrip labels. */
const RUNTIME_TAG: Record<string, string> = { "vite-react": "React", static: "Static", "node-express": "Node", expo: "Expo" };

/** The Expo starter shown in the phone frame (its real phone-viewport capture). */
const POCKET_TEMPLATE = "expo-grocery";

/**
 * The library filmstrip: captured starters dealt round-robin across categories (so the reel mixes
 * dashboards, landing pages, shops and apps). Phone-only captures stay out (they are a phone on a
 * plain canvas at this crop).
 */
function reels(count = 14): HomeReel[] {
  const withShots = TEMPLATES.filter((t) => {
    const s = TEMPLATE_SHOTS.get(t.id);
    return s?.small && s.device !== "phone";
  });
  const byCat = new Map<string, typeof withShots>();
  for (const t of withShots) byCat.set(t.category, [...(byCat.get(t.category) ?? []), t]);
  const dealt: typeof withShots = [];
  for (let i = 0; dealt.length < withShots.length; i++) {
    for (const list of byCat.values()) if (list[i]) dealt.push(list[i]);
  }
  return dealt.slice(0, count).map((t) => ({ id: t.id, name: t.name, runtime: RUNTIME_TAG[t.framework] ?? t.framework, href: templatePreviewHref(t.id), src: templateShotFor(t.id, 360) }));
}

/** Every category with its starter count, in registry order. */
function categories(): HomeCategory[] {
  const counts = new Map<string, number>();
  for (const t of TEMPLATES) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  return TEMPLATE_CATEGORIES.map((c) => ({ id: c.id, name: c.name, href: `/templates/${c.id}`, count: counts.get(c.id) ?? 0 }));
}

function plans(): HomePlan[] {
  return PLAN_ORDER.map((id) => {
    const p = PLANS[id];
    const usd = p.prices?.USD.month;
    const inr = p.prices?.INR.month;
    return {
      id,
      name: p.name,
      price: usd === undefined ? "Custom" : formatPrice(usd, "USD"),
      per: usd ? "/mo" : "",
      inr: inr === undefined ? p.audience : inr === 0 ? formatPrice(0, "INR") : `${formatPrice(inr, "INR")} / month`,
      tagline: p.tagline,
      features: p.features.slice(0, 4),
      cta: p.cta,
      highlight: Boolean(p.highlight),
    };
  });
}

/**
 * The checks the real pre-publish scanner (`scanProject`, what the Publish dialog runs) reports as
 * passing on a clean project, with their category. The rest of the checks only report when they find
 * something, so they are counted, not listed.
 */
function passingChecks(): HomeCheck[] {
  const clean = {
    "index.html":
      '<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Candle store</title><meta name="description" content="Handmade candles." /><meta property="og:title" content="Candle store" /><link rel="icon" href="/favicon.svg" /></head><body></body></html>',
    "src/App.tsx": 'export default function App() { return <a href="#top" id="top">Home</a>; }',
  };
  return scanProject(clean)
    .findings.filter((f) => f.severity === "pass")
    .map((f) => ({ title: f.title, category: f.category }));
}

/** "Web apps", "Websites", "APIs", "Mobile apps": what the four runtimes build, from FRAMEWORKS. */
function runtimeKinds(): string[] {
  return TEMPLATE_FRAMEWORKS.map((f) => `${FRAMEWORKS[f].runtime}s`);
}

function pocket() {
  const t = TEMPLATES.find((x) => x.id === POCKET_TEMPLATE);
  const src = templatePhoneShotSrc(POCKET_TEMPLATE);
  return t && src ? { name: t.name, src, href: templatePreviewHref(t.id) } : null;
}

export function getHomeData() {
  const checks = passingChecks();
  return {
    templateCount: FACTS.templates,
    categoryCount: FACTS.categories,
    publishChecks: FACTS.publishChecks,
    checks,
    roles: FACTS.roleNames.map((r) => r.charAt(0).toUpperCase() + r.slice(1)),
    runtimeKinds: runtimeKinds(),
    reels: reels(),
    categories: categories(),
    plans: plans(),
    pocket: pocket(),
  };
}

export type HomeData = ReturnType<typeof getHomeData>;
