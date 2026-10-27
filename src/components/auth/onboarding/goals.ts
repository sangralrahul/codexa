import type { TemplateSummary } from "@/lib/client/workspace/types";

/**
 * Onboarding goals (PLAN §5.5). Each goal maps to real template categories (or a framework),
 * so picking goals genuinely reorders the starters on the next step ("Suggested for you").
 * `templateId` is the starter whose real screenshot illustrates the goal card.
 */
export type GoalId = "saas" | "dashboard" | "landing" | "store" | "ai" | "internal" | "portfolio" | "api";

export const GOALS: { id: GoalId; label: string; chip: string; templateId: string; category: string; idea: string }[] = [
  { id: "saas", label: "SaaS product", chip: "Studio booking SaaS", templateId: "vite-react-saas", category: "saas", idea: "A SaaS app for booking studio time, with plans, sign-in and a billing page" },
  { id: "dashboard", label: "Dashboard", chip: "Sales dashboard", templateId: "vite-react-dashboard", category: "dashboards", idea: "A sales dashboard with revenue charts, a customers table and date filters" },
  { id: "landing", label: "Landing page", chip: "Coffee landing page", templateId: "vite-react-landing", category: "landing-pages", idea: "A landing page for a coffee subscription with pricing, FAQ and an email signup" },
  { id: "store", label: "Online store", chip: "Candle shop", templateId: "vite-react-storefront", category: "ecommerce", idea: "An online store for handmade candles with a product grid, filters and a cart" },
  { id: "ai", label: "AI app", chip: "Support chatbot", templateId: "vite-react-ai-chat", category: "ai-tools", idea: "A support chatbot with a conversation sidebar and saved chats" },
  { id: "internal", label: "Internal tool", chip: "Ticket review tool", templateId: "vite-react-admin", category: "admin-panels", idea: "An internal tool to review support tickets with filters and an assignee column" },
  { id: "portfolio", label: "Portfolio", chip: "Personal portfolio", templateId: "vite-react-portfolio", category: "portfolios", idea: "A personal portfolio with a projects grid, an about section and a contact form" },
  { id: "api", label: "API / backend", chip: "Library REST API", templateId: "node-express-api", category: "web-apps", idea: "A REST API for a library: books, members and loans with validation" },
];

/** Goal → the template categories (and frameworks) it suggests. */
export const GOAL_TO_CATEGORY: Record<GoalId, { categories: string[]; frameworks?: string[] }> = {
  saas: { categories: ["saas"] },
  dashboard: { categories: ["dashboards"] },
  landing: { categories: ["landing-pages", "websites"] },
  store: { categories: ["ecommerce"] },
  ai: { categories: ["ai-tools"] },
  internal: { categories: ["admin-panels", "crm"] },
  portfolio: { categories: ["portfolios"] },
  api: { categories: [], frameworks: ["node-express"] },
};

function goalMatches(goal: GoalId, t: TemplateSummary) {
  const m = GOAL_TO_CATEGORY[goal];
  return m.categories.includes(t.category) || Boolean(m.frameworks?.includes(t.framework));
}

/** Templates ordered for the chosen goals: matches first (most goals matched, then the goal's own starter, then featured), the rest after. */
export function rankTemplates(templates: TemplateSummary[], goals: GoalId[], prefer?: GoalId | null): { list: TemplateSummary[]; suggested: Set<string> } {
  const own = new Set(GOALS.filter((g) => goals.includes(g.id)).map((g) => g.templateId));
  // Among equals, the goal picked last leads with its own starter.
  const lead = prefer && goals.includes(prefer) ? GOALS.find((g) => g.id === prefer)?.templateId : undefined;
  const scored = templates.map((t, i) => ({ t, i, score: goals.filter((g) => goalMatches(g, t)).length }));
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.t.id === lead) - Number(a.t.id === lead) ||
      Number(own.has(b.t.id)) - Number(own.has(a.t.id)) ||
      Number(b.t.featured) - Number(a.t.featured) ||
      a.i - b.i,
  );
  return { list: scored.map((s) => s.t), suggested: new Set(scored.filter((s) => s.score > 0).map((s) => s.t.id)) };
}

/** Prompt ideas for the chips under the prompt box: the chosen goals' ideas, or a starting three. */
export function ideasFor(goals: GoalId[]) {
  const picked = GOALS.filter((g) => goals.includes(g.id));
  return (picked.length ? picked : GOALS.slice(0, 3)).slice(0, 4).map((g) => ({ goal: g.id, label: g.chip, text: g.idea, templateId: g.templateId }));
}

/**
 * A short project name from a description: "An invoice tracker for freelancers, with GST" → "Invoice tracker".
 * Cuts at the first clause break, drops a leading article, keeps at most four words.
 */
export function nameFromPrompt(text: string): string {
  const first = text.replace(/\s+/g, " ").trim().split(/[.,;:!?\n(]|\s[-–—]\s/)[0] ?? "";
  const head = first.split(/\s+(?:for|with|where|that|which|to|so|using|in|on|from|and)\s+/i)[0] ?? first;
  const words = head
    .replace(/^(?:build|make|create)\s+(?:me\s+)?/i, "")
    .replace(/^(?:a|an|the|my|our)\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 4);
  const name = words.join(" ").replace(/[^\p{L}\p{N}\s'&/-]/gu, "").trim().slice(0, 60);
  return name ? name[0].toUpperCase() + name.slice(1) : "";
}
