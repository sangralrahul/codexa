import "server-only";
import { TEMPLATES, TEMPLATE_CATEGORIES, TEMPLATE_FRAMEWORKS } from "@/templates";
import { TEMPLATE_SHOTS } from "@/components/templates/shots";
import { templatePreviewHref } from "@/components/templates/template-card";
import { toolSchemas } from "@/lib/ai/tools/schemas";
import { PLANS, PLAN_ORDER, formatPrice } from "@/config/plans";
import { FACTS } from "@/content/marketing/facts";

/**
 * Everything the home page shows that comes from code or config (PLAN §1: no hard-coded
 * numbers). Computed per render on the server; only plain data crosses into the page.
 */

export type HomeTemplateTile = { id: string; name: string; runtime: string; href: string };
export type HomeCategory = { id: string; name: string; href: string; count: number };
export type HomeMeterRow = { label: string; tool: string };
export type HomePlan = {
  id: string;
  name: string;
  price: string;
  /** "/month" for paid plans, empty for free and custom. */
  per: string;
  inr: string;
  features: string[];
  cta: { label: string; href: string };
  highlight: boolean;
};

/** Short runtime names for the framework ids the templates use. */
const RUNTIME_SHORT: Record<string, { tag: string; name: string }> = {
  "vite-react": { tag: "React", name: "React SPA" },
  static: { tag: "Static", name: "Static site" },
  "node-express": { tag: "Node", name: "Node + Express API" },
};

/** The four starters shown on the home grid (one per kind), each with a real screenshot. */
const FEATURED_TEMPLATES = ["dash-web-analytics", "landing-design-conference", "app-bug-tracker", "vite-react-storefront"];

/** The agent steps beside the agent capture, each named by the real tool that performs it. */
const METER: HomeMeterRow[] = [
  { label: "Inspect project files", tool: "list_files" },
  { label: "Write a plan", tool: "propose_plan" },
  { label: "Edit src/App.tsx", tool: "write_file" },
  { label: "Run typecheck", tool: "run_command" },
];

function featuredTemplates(): HomeTemplateTile[] {
  const withShots = TEMPLATES.filter((t) => TEMPLATE_SHOTS.has(t.id));
  const picked = FEATURED_TEMPLATES.map((id) => withShots.find((t) => t.id === id)).filter((t): t is (typeof withShots)[number] => Boolean(t));
  // Fall back to other captured starters if one of the featured ids is ever removed.
  for (const t of withShots) {
    if (picked.length >= 4) break;
    if (!picked.includes(t)) picked.push(t);
  }
  return picked.slice(0, 4).map((t) => ({ id: t.id, name: t.name, runtime: RUNTIME_SHORT[t.framework]?.tag ?? t.framework, href: templatePreviewHref(t.id) }));
}

/** The eight categories with the most starters, in registry order (the strip's "All" links to the full gallery). */
function topCategories(): HomeCategory[] {
  const counts = new Map<string, number>();
  for (const t of TEMPLATES) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  const top = new Set([...TEMPLATE_CATEGORIES].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0)).slice(0, 8).map((c) => c.id));
  return TEMPLATE_CATEGORIES.filter((c) => top.has(c.id)).map((c) => ({ id: c.id, name: c.name, href: `/templates/${c.id}`, count: counts.get(c.id) ?? 0 }));
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
      per: usd ? "/month" : "",
      inr: inr === undefined ? "" : inr === 0 ? formatPrice(0, "INR") : `${formatPrice(inr, "INR")} /month`,
      features: p.features.slice(0, 4),
      cta: p.cta,
      highlight: Boolean(p.highlight),
    };
  });
}

/** "Free $0 / Pro $20 / Team $50 per month", read from PLANS. */
function priceLine(): string {
  const parts = PLAN_ORDER.filter((id) => PLANS[id].prices).map((id) => {
    const p = PLANS[id];
    const label = p.prices!.USD.month === 0 ? `${p.name} plan` : p.name;
    return `${label} ${formatPrice(p.prices!.USD.month, "USD")}`;
  });
  return `${parts.join("  /  ")} per month`;
}

export function getHomeData() {
  const tools = new Set(Object.keys(toolSchemas));
  return {
    templateCount: FACTS.templates,
    categoryCount: FACTS.categories,
    publishChecks: FACTS.publishChecks,
    roles: FACTS.roles,
    runtimes: TEMPLATE_FRAMEWORKS.map((f) => RUNTIME_SHORT[f]?.name ?? f),
    meter: METER.filter((m) => tools.has(m.tool)),
    templates: featuredTemplates(),
    categories: topCategories(),
    plans: plans(),
    priceLine: priceLine(),
  };
}

export type HomeData = ReturnType<typeof getHomeData>;
