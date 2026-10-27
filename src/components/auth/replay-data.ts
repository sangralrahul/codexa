import "server-only";
import { TEMPLATES } from "@/templates";
import { TEMPLATE_SHOTS } from "@/components/templates/shots";
import type { ReplayItem } from "./build-replay";

/**
 * The four example runs of the auth panel's Build replay, built from the real starters:
 * real names, real file counts, a real file each run "writes" and the real screenshot.
 * Only the prompts are written here (each one describes what that starter's screenshot shows).
 */
const RUNS: { id: string; label: string; slug: string; prompt: string; file: string }[] = [
  { id: "vite-react-saas", label: "SaaS", slug: "acme-saas", prompt: "A SaaS site with pricing, sign-in and a billing page", file: "src/pages/Pricing.tsx" },
  { id: "vite-react-dashboard", label: "Dashboard", slug: "revenue-board", prompt: "An analytics dashboard with KPI cards and a customers table", file: "src/App.tsx" },
  { id: "vite-react-landing", label: "Landing page", slug: "coffee-club", prompt: "A landing page for a coffee subscription with a waitlist", file: "src/App.tsx" },
  { id: "vite-react-storefront", label: "Store", slug: "candle-shop", prompt: "An online store for handmade candles with a cart", file: "src/Cart.tsx" },
];

export function replayItems(): ReplayItem[] {
  const out: ReplayItem[] = [];
  for (const run of RUNS) {
    const t = TEMPLATES.find((x) => x.id === run.id);
    if (!t || !TEMPLATE_SHOTS.has(run.id)) continue;
    const file = run.file in t.files ? run.file : (Object.keys(t.files).find((p) => p.endsWith("App.tsx")) ?? Object.keys(t.files)[0]);
    out.push({ id: t.id, label: run.label, name: t.name, slug: run.slug, prompt: run.prompt, files: Object.keys(t.files).length, file });
  }
  return out;
}

/** Real starter screenshots for the phone strip under the form (3 of them). */
export function stripShots(): { id: string; name: string }[] {
  return ["vite-react-dashboard", "vite-react-storefront", "vite-react-landing"]
    .filter((id) => TEMPLATE_SHOTS.has(id))
    .map((id) => ({ id, name: TEMPLATES.find((t) => t.id === id)?.name ?? id }));
}
