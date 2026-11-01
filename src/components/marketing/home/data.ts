import "server-only";
import { TEMPLATES, TEMPLATE_CATEGORIES, TEMPLATE_FRAMEWORKS } from "@/templates";
import { TEMPLATE_SHOTS } from "@/components/templates/shots";
import { templatePreviewHref } from "@/components/templates/template-card";
import { PLANS, PLAN_ORDER, formatPrice } from "@/config/plans";
import { FACTS } from "@/content/marketing/facts";
import { HOME_CHIPS } from "@/content/marketing/home";
import { env } from "@/lib/env";
import { hostBase, hostFor } from "@/lib/hosts";
import { scanProject } from "@/lib/services/site-checks";
import type { FAQItem } from "@/content/marketing/types";

/**
 * Everything the home page shows that comes from code or config (PLAN §1: no hard-coded
 * numbers). Computed per render on the server; only plain data crosses into the page and
 * its client islands (the product tour, the bento's micro-animations).
 */

export type HomeTemplateTile = { id: string; name: string; runtime: string; href: string };
export type HomeCategory = { id: string; name: string; href: string; count: number };
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

/** The starter the product tour builds from: its prompt is the "Online store" idea chip, its files are real. */
const TOUR_TEMPLATE = "vite-react-storefront";
/** The files the tour "writes", in the order a build would add them (all exist in the storefront template). */
const TOUR_FILES = ["src/products.ts", "src/useLocalStorage.ts", "src/cart.ts", "src/ProductArt.tsx", "src/App.tsx", "src/Cart.tsx"];
/** The file the tour's editor types out (the first lines of the real src/Cart.tsx). */
const TOUR_CODE_FILE = "src/Cart.tsx";
const TOUR_CODE_LINES = 14;

/** Every template with a screenshot, as a marquee tile (runtime tag and gallery link). */
function tile(t: (typeof TEMPLATES)[number]): HomeTemplateTile {
  return { id: t.id, name: t.name, runtime: RUNTIME_SHORT[t.framework]?.tag ?? t.framework, href: templatePreviewHref(t.id) };
}

/**
 * Three marquee rows: the captured starters dealt round-robin across categories (so each row mixes
 * dashboards, landing pages, shops and apps), 12 per row.
 */
function marqueeRows(): HomeTemplateTile[][] {
  const withShots = TEMPLATES.filter((t) => TEMPLATE_SHOTS.get(t.id)?.small);
  const byCat = new Map<string, typeof withShots>();
  for (const t of withShots) byCat.set(t.category, [...(byCat.get(t.category) ?? []), t]);
  const dealt: typeof withShots = [];
  for (let i = 0; dealt.length < withShots.length; i++) {
    for (const list of byCat.values()) if (list[i]) dealt.push(list[i]);
  }
  const rows: HomeTemplateTile[][] = [[], [], []];
  dealt.slice(0, 36).forEach((t, i) => rows[i % 3].push(tile(t)));
  return rows;
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
      per: usd ? "/month" : "",
      inr: inr === undefined ? "" : inr === 0 ? formatPrice(0, "INR") : `${formatPrice(inr, "INR")} /month`,
      features: p.features.slice(0, 5),
      cta: p.cta,
      highlight: Boolean(p.highlight),
    };
  });
}

/** "Free plan $0 / Pro $20 / Team $50 per month", read from PLANS. */
function priceLine(): string {
  const parts = PLAN_ORDER.filter((id) => PLANS[id].prices).map((id) => {
    const p = PLANS[id];
    const label = p.prices!.USD.month === 0 ? `${p.name} plan` : p.name;
    return `${label} ${formatPrice(p.prices!.USD.month, "USD")}`;
  });
  return `${parts.join("  /  ")} per month`;
}

/** The passing titles of the real pre-publish scanner on a clean project (what the Publish dialog lists). */
function passingCheckTitles(): string[] {
  const clean = {
    "index.html":
      '<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Candle store</title><meta name="description" content="Handmade candles." /><meta property="og:title" content="Candle store" /><link rel="icon" href="/favicon.svg" /></head><body></body></html>',
    "src/App.tsx": 'export default function App() { return <a href="#top" id="top">Home</a>; }',
  };
  return scanProject(clean)
    .findings.filter((f) => f.severity === "pass")
    .map((f) => f.title);
}

/** The product tour's script: real prompt, real file paths, the first lines of a real file. */
function tour() {
  const t = TEMPLATES.find((x) => x.id === TOUR_TEMPLATE);
  const chip = HOME_CHIPS.find((c) => c.templateId === TOUR_TEMPLATE);
  const code = (t?.files[TOUR_CODE_FILE] ?? "").split("\n").slice(0, TOUR_CODE_LINES);
  const files = TOUR_FILES.filter((f) => t?.files[f] !== undefined).map((path) => ({ path, lines: (t?.files[path] ?? "").split("\n").length }));
  const base = hostBase(env.DEPLOY_HOST);
  return {
    templateId: TOUR_TEMPLATE,
    templateName: t?.name ?? "Ecommerce storefront",
    prompt: chip?.prompt ?? "An online store for handmade candles with categories, search and a cart",
    files,
    codeFile: TOUR_CODE_FILE,
    code,
    host: base ? hostFor("candle-store", base) : "candle-store.your-domain.com",
    checks: FACTS.publishChecks,
  };
}

export type HomeTour = ReturnType<typeof tour>;

/** Six questions answered from repo facts (plans, runtimes, the runner, the desktop app). */
function faq(): FAQItem[] {
  const runtimes = TEMPLATE_FRAMEWORKS.map((f) => RUNTIME_SHORT[f]?.name ?? f);
  const pro = PLANS.pro;
  const team = PLANS.team;
  const usd = (n: number) => formatPrice(n, "USD");
  const inr = (n: number) => formatPrice(n, "INR");
  return [
    {
      question: "What does Codexa build?",
      answer: `Web apps you can run and publish: ${runtimes.join(", ")}. Describe the app in a sentence, or start from one of ${FACTS.templates} working templates. An agent plans the change, writes real TypeScript and React files, runs a typecheck in the sandbox, and shows a live preview.`,
    },
    {
      question: "Where does my code run?",
      answer:
        "Never on our web servers. Each project gets its own container on Cloudflare, started on demand by a per-project Durable Object, and the live preview is served from a separate origin. See [Security](/security) for the full request path.",
    },
    {
      question: "Can I take my code with me?",
      answer: "Yes. Download the whole project as a ZIP at any time, push it to a GitHub repository, or import an existing repository from GitHub. Every AI run also creates a checkpoint you can restore.",
    },
    {
      question: "Can I publish to my own domain?",
      answer: `Every plan can publish to a Codexa subdomain after the ${FACTS.publishChecks} pre-publish checks run. Custom domains are included on ${pro.name} (${pro.limits.customDomains}) and ${team.name} (${team.limits.customDomains}). See [Pricing](/pricing).`,
    },
    {
      question: "How much does it cost, and can I pay in INR?",
      answer: `Free is ${usd(0)}. ${pro.name} is ${usd(pro.prices!.USD.month)} or ${inr(pro.prices!.INR.month)} per month, ${team.name} is ${usd(team.prices!.USD.month)} or ${inr(team.prices!.INR.month)} per month, and Enterprise is custom. Prices exclude applicable taxes. [Compare plans](/pricing).`,
    },
    {
      question: "Is there a desktop app?",
      answer: "Yes, a native app for Windows (x64) with the composer, projects, templates and settings in their own window. [Download it](/download). On other systems, Codexa runs in the browser.",
    },
  ];
}

export function getHomeData() {
  const runtimes = TEMPLATE_FRAMEWORKS.map((f) => RUNTIME_SHORT[f]?.name ?? f);
  return {
    templateCount: FACTS.templates,
    categoryCount: FACTS.categories,
    publishChecks: FACTS.publishChecks,
    checkTitles: passingCheckTitles(),
    roles: [...FACTS.roleNames],
    runtimes,
    agentTools: FACTS.agentTools,
    marquee: marqueeRows(),
    categories: categories(),
    plans: plans(),
    priceLine: priceLine(),
    tour: tour(),
    faq: faq(),
  };
}

export type HomeData = ReturnType<typeof getHomeData>;
